# kip-forms Worker — Deploy Runbook

**For:** Ras (founder)
**Date drafted:** 28 May 2026
**Purpose:** step-by-step Cloudflare-side actions to take the website forms from broken to working.

The Worker source (`src/index.js`), schema (`schema.sql`), and config (`wrangler.toml`) are already built and on disk in this folder. This runbook covers the Cloudflare Dashboard + terminal steps you do once, in order.

Account context (per CLAUDE.md account-access notes): Cloudflare login is `courtneyclive84@gmail.com`.

---

## Step 1 — Resend account + API key (5 min)

If a Resend account for `scansmart.uk` already exists, skip to 1c.

**1a.** Go to https://resend.com and sign up with the SCANSMART business email (or the Cloudflare account email — your call). Verify the email.

**1b.** Add the `scansmart.uk` domain. Resend will give you a few DNS records (SPF, DKIM, optional DMARC) to add. In Cloudflare Dashboard → DNS → Records, add each one Resend gives you. Wait for Resend to report the domain as "Verified" (usually under 5 min).

**1c.** API Keys → Create API Key. Name it "kip-forms production". Scope: "Sending access" → all domains (or just `scansmart.uk` if you scope per-domain). Copy the key — it starts `re_...` and you only see it once. Paste it somewhere safe.

---

## Step 2 — Cloudflare Turnstile site + keys (3 min)

**2a.** Cloudflare Dashboard → Turnstile (in the left nav). Add Site.

**2b.** Site name: "SCANSMART forms". Domain: `scansmart.uk`. Widget mode: **Managed** (Cloudflare picks visible vs invisible challenge based on risk score). Pre-clearance: leave off for now.

**2c.** After save, Cloudflare shows you a **Site Key** (public, will go in HTML — starts `0x...`) and a **Secret Key** (private, will go in the Worker — starts `0x...`). Copy both.

---

## Step 3 — Create the D1 database (1 min)

Open Terminal on your Mac. Make sure you're in the kip-forms folder:

```bash
cd ~/Documents/ScanSmart/scansmart-site/workers/kip-forms
```

If wrangler isn't installed, install it once: `npm install -g wrangler` (needs node; if you don't have node, `brew install node` first).

Authenticate wrangler against your Cloudflare account (one-time):

```bash
wrangler login
```

Browser opens. Click Allow. Wrangler now uses your courtneyclive84 Cloudflare credentials.

Create the database:

```bash
wrangler d1 create kip-inquiries
```

Wrangler prints something like:

```
✅ Successfully created DB 'kip-inquiries'
database_id = "abc12345-6789-..."
```

Copy that `database_id` value — you'll paste it into `wrangler.toml` in Step 5.

Apply the schema:

```bash
wrangler d1 execute kip-inquiries --remote --file schema.sql
```

That creates the `inquiries` table + indexes.

---

## Step 4 — Set the Worker secrets (1 min)

In the same `kip-forms/` folder:

```bash
wrangler secret put TURNSTILE_SECRET
```

Wrangler prompts: `Enter a secret value:` — paste the **Turnstile Secret Key** from Step 2c.

```bash
wrangler secret put RESEND_API_KEY
```

Prompts again — paste the **Resend API Key** from Step 1c.

Both secrets are now encrypted at rest by Cloudflare and never appear in source.

---

## Step 5 — Edit `wrangler.toml`

Open `wrangler.toml`. Uncomment the `[[d1_databases]]` block and paste the database_id from Step 3:

```toml
[[d1_databases]]
binding = "DB"
database_name = "kip-inquiries"
database_id = "abc12345-6789-..."   ← the value wrangler printed
```

Leave the `[[routes]]` block commented for now — we set the route via the Dashboard after deploy.

---

## Step 6 — Deploy the Worker

```bash
wrangler deploy
```

Wrangler bundles `src/index.js`, uploads it, and prints the workers.dev URL (e.g. `https://kip-forms.courtneyclive84.workers.dev`). The default URL works immediately for testing; we'll add the custom domain in Step 8.

Smoke-test that the Worker is alive:

```bash
curl https://kip-forms.courtneyclive84.workers.dev/
```

Expected: `{"service":"kip-forms","ok":true}`. If you see that, the Worker is live.

---

## Step 7 — Set up `api.scansmart.uk` (5 min)

**7a.** Cloudflare Dashboard → DNS → Records (for the `scansmart.uk` zone) → Add record:
- Type: `AAAA` (or `A` — either works; we just need the hostname to exist; proxied state is what matters)
- Name: `api`
- IPv6 address: `100::` (or for A record, `192.0.2.1`)
- Proxy status: **Proxied** (orange cloud — important)
- TTL: Auto

Click Save.

**7b.** Workers & Pages → kip-forms → Settings → Triggers → **Add Custom Domain**:
- Domain: `api.scansmart.uk`
- Save.

Cloudflare automatically wires `api.scansmart.uk/*` to the kip-forms Worker. Within a minute, this works:

```bash
curl https://api.scansmart.uk/
```

Expected: same `{"service":"kip-forms","ok":true}` response.

---

## Step 8 — (Optional, recommended) also custom-domain kip-data

While we're here, do the same for the existing kip-data Worker so the website's stats endpoint also stops leaking the workers.dev subdomain.

Workers & Pages → kip-data → Settings → Triggers → Add Custom Domain → `data.scansmart.uk` (or wire under `api.scansmart.uk/data/*` via a Worker route — both work; custom-domain is simpler).

If you go with `data.scansmart.uk`, also update kip-data's `ALLOWED_ORIGINS` env var to include `https://scansmart.uk` so the website's stats counter can call it (currently the env var is `https://app.scansmart.uk,https://kip-app-9zi.pages.dev`).

---

## Step 9 — Tell me when 1-7 are done

Paste here:
- The **Turnstile Site Key** (public; this goes in the website HTML — about 8 lines to add across 8 files)

That's all I need to finish the website-side patch. I'll then:
- Update the 8 form HTMLs (URL → `api.scansmart.uk/forms/submit`, add Turnstile widget with your site key)
- Bump CACHE_VERSION
- Verify each line + run a smoke test from sandbox against `api.scansmart.uk/forms/submit` to confirm end-to-end
- Hand it to you to drag-drop deploy

---

## Verification cheat-sheet (after everything is live)

**Read all submissions for one form:**
```bash
wrangler d1 execute kip-inquiries --remote --command \
  "SELECT id, name, email, submitted_at FROM inquiries WHERE form_id='partner' ORDER BY submitted_at DESC LIMIT 50"
```

**Count submissions by form this week:**
```bash
wrangler d1 execute kip-inquiries --remote --command \
  "SELECT form_id, COUNT(*) FROM inquiries WHERE submitted_at > date('now','-7 days') GROUP BY form_id"
```

**Rotate Turnstile secret:** generate new key in Dashboard, then `wrangler secret put TURNSTILE_SECRET` and paste the new value. No code change.

**Rotate Resend key:** same — new key in Resend Dashboard, then `wrangler secret put RESEND_API_KEY`.

---

## What's NOT in this runbook

- **Rate-limiting at the Cloudflare edge.** Workers free tier includes basic rate-limiting via Cloudflare Rules. If form-spam becomes a real problem after launch, add a rule at scansmart.uk → Security → WAF → Rate Limiting Rules: `(http.request.uri.path eq "/forms/submit" and http.request.method eq "POST")` → 10 requests per minute per IP. Not needed at v1.
- **Email-deliverability monitoring.** Resend dashboard shows delivery status. Set up an alert in Resend for >5% bounce rate if institutional volume picks up.
- **Old kip-forms workers.dev URL.** Once `api.scansmart.uk/forms/submit` is live and the website is patched, the legacy `kip-forms.courtneyclive84.workers.dev` doesn't need to exist (and currently doesn't). Nothing to deprecate.
