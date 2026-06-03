/* ============================================================
   SCANSMART · FLT WIRE — Cloudflare Worker
   ============================================================
   Server-side aggregator for the F7 WIRE panel in flt-app.html.
   Pulls food-domain RSS/Atom feeds, parses XML → JSON, applies a
   keyword filter, dedupes, caches in KV for 10 minutes, and returns
   CORS-friendly JSON to the FLT terminal.

   v0 in production uses api.rss2json.com (public proxy, free tier
   10k req/day). This Worker is the production replacement —
   self-hosted, cached, scoped to scansmart.uk, no third-party
   dependency.

   DEPLOY:
     1. cd ~/Documents/ScanSmart/Website/scansmart-site/
     2. Copy this file as wrangler project's src/index.js (or rename)
     3. Create wrangler.toml (template at bottom of this file)
     4. wrangler deploy
     5. In flt-app.html (food-label-terminal-live.html), swap:
          const WIRE_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";
        for:
          const WIRE_FEED  = "https://scansmart.uk/api/wire";
        and update fetchWire() to call WIRE_FEED once (returns merged
        JSON), instead of looping over sources via WIRE_PROXY.

   Free-tier: 100k requests/day, plenty for the cache pattern.
   ============================================================ */

const SOURCES = [
  { name: "Guardian Food",    url: "https://www.theguardian.com/food/rss",                                    colour: "#5fa9e0" },
  { name: "BBC Health",       url: "https://feeds.bbci.co.uk/news/health/rss.xml",                           colour: "#cc4444" },
  { name: "BBC Business",     url: "https://www.bbc.co.uk/news/business/rss.xml",                            colour: "#cc4444" },
  { name: "FSA gov.uk",       url: "https://www.gov.uk/government/organisations/food-standards-agency.atom", colour: "#ffa726" },
  { name: "Sky UK",           url: "https://feeds.skynews.com/feeds/rss/uk.xml",                             colour: "#e8a33d" },
];

const KEYWORDS = /\b(food|nutrition|nutrient|ingredient|recall|allerg(en|y|ic)?|FSA|sugar|salt|UPF|ultra-processed|HFSS|obesity|reformulat|additive|E-?number|nutri-?score|NOVA|cereal|drink|snack|sweetener|caffeine|sat(urated)? fat|fibre|protein|carbohydrate|label(s|ling)?|dietary|cosmetic|skincare|diet|junk food|fast food|supermarket|grocer(y|s|ies)?|Tesco|Sainsbury|Asda|Morrison|Aldi|Lidl|Waitrose|Iceland|Co-?op|Nestl|Kraft|Unilever|Coca[- ]Cola|Pepsi|Kellogg|Danone|Heinz|Walkers|Cadbury|food poisoning|salmonella|listeria|E\.?\s?coli|contamin|food chain|food security|food bank|food policy|school meal|child(ren)?'s? food|pesticide|GMO|organic food|vegan|vegetarian|plant-?based|gluten|lactose)\b/i;

const CACHE_TTL_SECONDS = 600; // 10 minutes
const CACHE_KEY = "wire:v1";

// --- Lightweight XML parser for RSS/Atom items ---
function parseFeed(xml, sourceMeta) {
  const items = [];
  // RSS <item>...</item> and Atom <entry>...</entry>
  const itemRe = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  const matches = xml.match(itemRe) || [];
  for (const block of matches.slice(0, 20)) {
    const title       = extract(block, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = extract(block, /<description[^>]*>([\s\S]*?)<\/description>/i)
                     || extract(block, /<summary[^>]*>([\s\S]*?)<\/summary>/i)
                     || extract(block, /<content[^>]*>([\s\S]*?)<\/content>/i);
    const pubDate     = extract(block, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)
                     || extract(block, /<published[^>]*>([\s\S]*?)<\/published>/i)
                     || extract(block, /<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const link        = extractLink(block);
    const text = (title + " " + (description || "")).slice(0, 600);
    if (!KEYWORDS.test(text)) continue;
    items.push({
      source: sourceMeta.name,
      colour: sourceMeta.colour,
      title: stripCdata(title).trim(),
      link: link,
      date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }
  return items;
}

function extract(block, re) {
  const m = block.match(re);
  return m ? stripCdata(m[1]) : null;
}
function stripCdata(s) {
  if (!s) return "";
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();
}
function extractLink(block) {
  // Try Atom <link href="..."/> first, then RSS <link>...</link>
  const atom = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (atom) return atom[1];
  const rss = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  return rss ? stripCdata(rss[1]).trim() : "";
}

async function aggregateFeeds() {
  const all = [];
  await Promise.all(SOURCES.map(async (src) => {
    try {
      const r = await fetch(src.url, {
        headers: { "User-Agent": "SCANSMART-FLT-Wire/1.0 (+https://scansmart.uk)" },
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (!r.ok) return;
      const xml = await r.text();
      const items = parseFeed(xml, src);
      all.push(...items);
    } catch (e) { /* skip */ }
  }));

  // Dedupe by lowercased first-60-chars of title
  const seen = new Set();
  const deduped = [];
  for (const it of all) {
    const k = (it.title || "").slice(0, 60).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(it);
  }
  deduped.sort((a, b) => new Date(b.date) - new Date(a.date));
  return deduped.slice(0, 40);
}

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      "Content-Type": "application/json; charset=utf-8",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // KV cache lookup (if WIRE_KV namespace is bound)
    if (env.WIRE_KV) {
      const cached = await env.WIRE_KV.get(CACHE_KEY, { type: "json" });
      if (cached && cached.ts && (Date.now() - cached.ts) < CACHE_TTL_SECONDS * 1000) {
        return new Response(JSON.stringify(cached), { headers: cors });
      }
    }

    const items = await aggregateFeeds();
    const payload = { ts: Date.now(), count: items.length, items };

    if (env.WIRE_KV) {
      ctx.waitUntil(env.WIRE_KV.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL_SECONDS * 2 }));
    }

    return new Response(JSON.stringify(payload), { headers: cors });
  },
};

/* ============================================================
   wrangler.toml template (save as wrangler.toml in same dir):
   ============================================================

name = "scansmart-wire"
main = "wire-worker.js"
compatibility_date = "2026-05-16"

[[routes]]
pattern = "scansmart.uk/api/wire"
zone_name = "scansmart.uk"

# Optional but recommended: KV namespace for caching across edge
# 1. wrangler kv namespace create wire-cache
# 2. Copy the id printed and paste below:
# [[kv_namespaces]]
# binding = "WIRE_KV"
# id = "REPLACE_WITH_KV_NAMESPACE_ID"

# Deploy: wrangler deploy
============================================================ */
