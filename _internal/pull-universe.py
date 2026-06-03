#!/usr/bin/env python3
"""
SCANSMART FLT UNIVERSE pull script (v5.0.93)

Pulls UK-tagged well-populated product records from OpenFoodFacts via the
search-a-licious endpoint at search.openfoodfacts.org/search, paginated.

WHY THIS EXISTS:
The local UNIVERSE array embedded in flt-app.html is the FLT's keystroke-speed
cache. Bigger cache → more instant hits → fewer live-OFF roundtrips.
Live OFF (Tier C in the F1 search architecture) handles long-tail; this cache
covers the everyday popular UK SKUs.

STRATEGY:
1) Main pull: UK by popularity, 10k max (search-window cap). Yields ~8k usable.
2) Category supplements: UK + specific category for ~15 major food categories.
   Each yields ~5-8k filtered records per category. After dedupe, lifts total
   to comfortably 20k+ usable records.
3) Dedupe by barcode, keep highest popularity_key per code, cap at TARGET.
4) Always include must-have audit products (Pepsi Max, Lucozade, Red Bull,
   Warburtons Toastie, Kingsmill 50/50, Coca-Cola Original, Coke Zero, Hovis
   Soft White Medium) so the audit products are guaranteed present.
5) Output: compact JSON array of {c,n,b,q,cat,ns,nv} shape — matches existing
   UNIVERSE schema in flt-app.html line ~411.

REFRESH CADENCE:
Run monthly (first Monday) per §70 Monthly Document Sweep, OR triggered by
§80 OFF-coverage drift rule. Output the resulting JSON to
~/Documents/ScanSmart/scansmart-site/_internal/universe-YYYY-MM-DD.json
then update flt-app.html UNIVERSE array via the swap-universe-into-flt.py
companion script (also in _internal/).

USAGE:
    python3 pull-universe.py
    # Outputs: universe-YYYY-MM-DD.json + universe-LATEST.json (symlink-style copy)
"""
import urllib.request, urllib.parse, json, time, sys, os
from datetime import date

OFF_SEARCH = "https://search.openfoodfacts.org/search"
UA = "SCANSMART-FLT-builder/5.0.93 (clive@scansmart.uk)"
PAGE_SIZE = 10000       # max-size single request — confirmed working 25 May 2026
MAX_PAGE = 1            # one request per query at PAGE_SIZE=10000
REQUEST_DELAY = 0.5     # 500ms between queries — gentle on OFF
TARGET = 20000          # cap merged + filtered set at this many SKUs

# v5.0.93: priority-ranked supplements. Main pull surfaces top 10k UK by popularity;
# these add long-tail diversity in the categories shoppers encounter most often.
# Each query ~8s + 0.5s delay = 8.5s; main + 4 supplements ~43s, fits one bash call.
CATEGORIES = [
    "en:breads", "en:carbonated-drinks", "en:breakfast-cereals", "en:salty-snacks",
]

# Must-have audit products (must appear in final UNIVERSE regardless of pull)
MUST_HAVE = [
    {"c":"5449000000996","n":"Coca-Cola Original Taste","b":"Coca-Cola","q":"330 ml","cat":"Colas","ns":"e","nv":4},
    {"c":"5449000131805","n":"Coca-Cola Zero Sugar","b":"Coca-Cola","q":"330 ml","cat":"Diet Cola Soft Drink","ns":"c","nv":4},
    {"c":"4060800309242","n":"Pepsi Max","b":"Pepsi","q":"330 ml","cat":"Diet Cola Soft Drink","ns":"c","nv":4},
    {"c":"5054267013384","n":"Lucozade Energy Original","b":"Lucozade","q":"380 ml","cat":"Sports Drinks","ns":"","nv":4},
    {"c":"9002490215408","n":"Red Bull Energy Drink","b":"Red Bull","q":"250 ml","cat":"Energy Drinks","ns":"e","nv":4},
    {"c":"5010044003887","n":"Warburtons Toastie Sliced White Bread 800G","b":"Warburtons","q":"800 g","cat":"Breads","ns":"c","nv":4},
    {"c":"5010003000131","n":"Hovis Soft White Medium","b":"Hovis","q":"800 g","cat":"Sliced White Bread","ns":"c","nv":4},
    {"c":"5010092299348","n":"Kingsmill 50/50","b":"Kingsmill","q":"800 g","cat":"Breads","ns":"a","nv":4},
]

def fetch_page(q, page, ps=PAGE_SIZE):
    params = {
        "q": q,
        "fields": "code,product_name_en,product_name,brands,brands_tags,categories_tags,nutrition_grades,nova_group,quantity,popularity_key",
        "page_size": ps,
        "page": page,
        "sort_by": "popularity_key",
    }
    url = OFF_SEARCH + "?" + urllib.parse.urlencode(params, safe=':"')
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 400: return {"_done": True}  # past window cap
        return {"_error": f"HTTP {e.code}"}
    except Exception as e:
        return {"_error": f"{type(e).__name__}: {e}"}

def to_record(h):
    """Convert OFF hit → compact UNIVERSE record. Returns None if record fails quality filter."""
    code = str(h.get("code") or "").strip()
    if not (8 <= len(code) <= 14 and code.isdigit()):
        return None
    name = (h.get("product_name_en") or h.get("product_name") or "").strip()
    if not name:
        return None
    brands_raw = h.get("brands")
    brand = ""
    if isinstance(brands_raw, list) and brands_raw: brand = brands_raw[0]
    elif isinstance(brands_raw, str): brand = brands_raw.strip()
    if not brand:
        return None
    cats = h.get("categories_tags") or []
    if not (isinstance(cats, list) and cats):
        return None
    # First category, en: stripped, slugs → Title Case
    cat_raw = cats[0] if isinstance(cats[0], str) else ""
    cat = cat_raw.replace("en:", "").replace("-", " ").title()
    quantity = (h.get("quantity") or "").strip()
    ns = (h.get("nutrition_grades") or "").strip().lower()
    nv = h.get("nova_group")
    if not isinstance(nv, int): nv = None
    pop = h.get("popularity_key", 0)
    return {"c": code, "n": name[:120], "b": brand[:60], "q": quantity[:30],
            "cat": cat[:60], "ns": ns, "nv": nv, "_pop": pop}

def pull_query(q, label):
    """Paginate through one query, return list of qualified records."""
    out = []
    for page in range(1, MAX_PAGE + 1):
        d = fetch_page(q, page)
        if "_done" in d:
            break
        if "_error" in d:
            sys.stderr.write(f"  [{label}] page {page} error: {d['_error']}\n")
            break
        hits = d.get("hits", [])
        if not hits:
            break
        for h in hits:
            rec = to_record(h)
            if rec: out.append(rec)
        time.sleep(REQUEST_DELAY)
    return out

def main():
    print(f"Pulling UK SKUs from OFF — TARGET {TARGET}, PAGE_SIZE {PAGE_SIZE}, MAX_PAGE {MAX_PAGE} per query")
    print()
    all_records = {}  # code → record (dedupe by code, keep highest popularity_key)
    queries = [('countries_tags:"en:united-kingdom"', "MAIN UK by popularity")]
    for cat in CATEGORIES:
        queries.append((f'countries_tags:"en:united-kingdom" AND categories_tags:"{cat}"', f"CATEGORY {cat}"))

    for q, label in queries:
        if len(all_records) >= TARGET * 1.5:
            print(f"  [{label}] SKIP — already at {len(all_records)} unique records (>{TARGET}*1.5)")
            continue
        print(f"  [{label}]", end=" ", flush=True)
        recs = pull_query(q, label)
        added = 0
        for r in recs:
            existing = all_records.get(r["c"])
            if existing is None or r["_pop"] > existing["_pop"]:
                all_records[r["c"]] = r
                if not existing: added += 1
        print(f"→ {len(recs)} qualified, +{added} new, {len(all_records)} unique total")

    # Sort by popularity, take top TARGET
    sorted_recs = sorted(all_records.values(), key=lambda r: r["_pop"], reverse=True)[:TARGET]

    # Ensure must-have audit products present (insert at top of priority if missing)
    have_codes = {r["c"] for r in sorted_recs}
    for mh in MUST_HAVE:
        if mh["c"] not in have_codes:
            sorted_recs.append({**mh, "_pop": 99999999})  # ensure rank
            sys.stderr.write(f"  MUST-HAVE inserted: {mh['c']} {mh['n']}\n")

    # Strip _pop before output (compact schema)
    final = [{k: v for k, v in r.items() if k != "_pop"} for r in sorted_recs]

    out_dir = os.path.dirname(os.path.abspath(__file__))
    today = date.today().isoformat()
    dated_path = os.path.join(out_dir, f"universe-{today}.json")
    latest_path = os.path.join(out_dir, "universe-LATEST.json")

    with open(dated_path, "w") as f:
        json.dump(final, f, separators=(",", ":"))
    with open(latest_path, "w") as f:
        json.dump(final, f, separators=(",", ":"))

    print()
    print(f"WROTE {dated_path} ({len(final)} records, {os.path.getsize(dated_path)} bytes)")
    print(f"WROTE {latest_path}")
    print()
    print("Next: run swap-universe-into-flt.py to replace the UNIVERSE array in flt-app.html")

if __name__ == "__main__":
    main()
