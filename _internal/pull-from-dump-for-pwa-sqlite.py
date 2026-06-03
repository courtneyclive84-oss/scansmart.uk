#!/usr/bin/env python3
"""
SCANSMART PWA SQLite — pull from OFF data dump (nutrient-rich variant)

WHY THIS EXISTS (separate from pull-from-dump.py):
The existing pull-from-dump.py produces a compact metadata-only UNIVERSE
for the FLT terminal (which fetches nutrients live from OFF per scan).
The PWA SQLite cache needs nutrient values BAKED IN so offline scans can
render the verdict card without a network call.

WHAT'S DIFFERENT FROM pull-from-dump.py:
1. to_record() extracts nutrient fields from p["nutriments"]:
     salt_100g, sugars_100g, fat_100g, saturated_fat_100g,
     fiber_100g, protein_100g, carbohydrates_100g, energy_kcal_100g
2. Adds last_modified (ISO date, from p["last_modified_t"])
3. TARGET raised to 50,000 — gives the downstream build-kip-skus.py script
   a large pool to filter by data completeness, so the eventual 4,947 cap
   is met with high-quality rows
4. Output filenames are universe-pwa-sqlite-YYYY-MM-DD.json + LATEST so
   the FLT pull's universe-LATEST.json isn't overwritten

WHAT THE NEXT SCRIPT DOES (build-kip-skus.py — coming next):
Reads this script's output + the I500 workbook, applies the completeness
filter + freshness rank, picks top 4,947 + the 53 I500 verified rows,
writes kip-skus.sqlite for the PWA bundle.

RUN LOCALLY ON THE MAC — NOT IN THE COWORK SANDBOX.
Sandbox bash calls cap at 45 seconds; this script needs 30-60 minutes to
download (~30GB compressed dump) + stream-filter to JSON.

WHAT YOU DO:
    cd ~/Documents/ScanSmart/scansmart-site/_internal
    python3 pull-from-dump-for-pwa-sqlite.py

Expected output:
    Downloading + streaming...
      Processed 100,000 records, 4,231 UK matched
      Processed 200,000 records, 8,107 UK matched
      ...
      Processed 3,800,000 records, 51,234 UK matched
    Total records: 3,847,212, UK qualified: 51,234
    Wrote universe-pwa-sqlite-2026-MM-DD.json: 50000 records, ~25MB bytes
    Wrote universe-pwa-sqlite-LATEST.json: 50000 records, ~25MB bytes

    Next: tell Claude in Cowork to run build-kip-skus.py to produce the
    final 5,000-row SQLite for the PWA bundle.

REFRESH CADENCE:
Per spec: manual on-demand, anchored to PWA deploys. Re-run when new
I500 rows land OR when monthly Document Sweep (§70) picks up OFF drift.

ASSUMPTIONS:
- Mac has Python 3 stdlib (no third-party packages needed)
- Outbound network access to static.openfoodfacts.org
- ~5GB temporary memory headroom for the dedupe dict (richer record
  shape than the FLT pull, so larger memory footprint)
"""
import gzip
import json
import urllib.request
import os
import sys
import time
from datetime import date, datetime

# ============================================================================
# CONFIG
# ============================================================================

DUMP_URL = "https://openfoodfacts-ds.s3.eu-west-3.amazonaws.com/openfoodfacts-products.jsonl.gz"
# Note 29 May 2026: OFF moved the data dump to AWS S3. The old URL
# (https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz)
# now returns HTTP 302 → this S3 URL. Python's urllib was hanging on the
# redirect. Direct S3 URL avoids the redirect entirely.
OUT_DIR = os.path.expanduser("~/Documents/ScanSmart/scansmart-site/_internal")
TARGET = 50000            # cap merged + filtered set at this many SKUs
UA = "SCANSMART-PWA-SQLite-builder/1.0 (clive@scansmart.uk)"
PROGRESS_EVERY = 100000   # print progress every N raw records processed


# ============================================================================
# NUTRIENT FIELD EXTRACTION
# ============================================================================
# OFF's `nutriments` dict uses inconsistent naming (some hyphens, some
# underscores, some pluralised). This map handles every variant I've
# observed in the OFF schema. Each tuple = (output_key, list_of_OFF_keys_to_try).
NUTRIENT_FIELDS = [
    ("salt_100g",            ["salt_100g"]),
    ("sugars_100g",          ["sugars_100g"]),
    ("fat_100g",             ["fat_100g"]),
    ("saturated_fat_100g",   ["saturated-fat_100g", "saturated_fat_100g"]),
    ("fiber_100g",           ["fiber_100g", "fibre_100g"]),
    ("protein_100g",         ["proteins_100g", "protein_100g"]),
    ("carbohydrates_100g",   ["carbohydrates_100g"]),
    ("energy_kcal_100g",     ["energy-kcal_100g", "energy_kcal_100g"]),
]


def extract_nutrients(p):
    """Build a dict of {output_key: float_or_None} from the OFF record.

    Reads from `nutriments` first (the canonical OFF structure), then falls
    back to `nutriscore_data.components` for the verdict-critical nutrients
    when nutriments is missing them. The fallback recovers ~29% of records
    that have nutrition_grade computed but empty nutriments (typical of
    foreign-import private-label UK products).

    Note 29 May 2026: probed against a 200-record sample of the OFF dump:
      70.5% had nutriments populated
      68.5% had nutriscore_data populated
      29.5% had grade letter BUT empty nutriments — these need the fallback.

    Returns the dict (always 8 keys, values may be None for the 4 non-
    nutriscore nutrients: fat total, protein, carbs — those only live in
    nutriments and have no nutriscore equivalent)."""
    nutriments = p.get("nutriments") if isinstance(p, dict) else None
    if not isinstance(nutriments, dict):
        nutriments = {}

    # Step 1 — canonical nutriments lookup
    out = {}
    for output_key, off_keys in NUTRIENT_FIELDS:
        value = None
        for off_key in off_keys:
            v = nutriments.get(off_key)
            if v is not None:
                try:
                    value = float(v)
                    break
                except (TypeError, ValueError):
                    continue
        out[output_key] = value

    # Step 2 — fallback to nutriscore_data.components for the 5 nutrients
    # that Nutri-Score uses (salt, sugars, saturated_fat, energy, fiber).
    # The other 3 schema nutrients (fat total, protein, carbs) are not in
    # nutriscore_data and stay None if missing from nutriments — the build
    # script's relaxed completeness filter accepts this.
    NUTRISCORE_FALLBACK = {
        # output_key:        (component_id,   expected_unit)
        "salt_100g":         ("salt",          "g"),
        "sugars_100g":       ("sugars",        "g"),
        "saturated_fat_100g":("saturated_fat", "g"),
        "energy_kcal_100g":  ("energy",        None),  # may be kJ; convert
        "fiber_100g":        ("fiber",         "g"),
    }
    nsdata = p.get("nutriscore_data") if isinstance(p, dict) else None
    if isinstance(nsdata, dict):
        components = nsdata.get("components")
        if isinstance(components, dict):
            comp_list = []
            for section in ("negative", "positive"):
                section_list = components.get(section)
                if isinstance(section_list, list):
                    comp_list.extend(section_list)
            comp_by_id = {}
            for c in comp_list:
                if isinstance(c, dict):
                    cid = c.get("id")
                    if cid and cid not in comp_by_id:
                        comp_by_id[cid] = c
            for output_key, (comp_id, _target_unit) in NUTRISCORE_FALLBACK.items():
                if out.get(output_key) is not None:
                    continue   # canonical nutriments already populated this one
                comp = comp_by_id.get(comp_id)
                if not isinstance(comp, dict):
                    continue
                v = comp.get("value")
                if v is None:
                    continue
                try:
                    v = float(v)
                except (TypeError, ValueError):
                    continue
                u = (comp.get("unit") or "").lower()
                # Energy: convert kJ → kcal (1 kcal = 4.184 kJ)
                if output_key == "energy_kcal_100g" and u == "kj":
                    v = v / 4.184
                # Salt sometimes reported in mg
                if output_key == "salt_100g" and u == "mg":
                    v = v / 1000.0
                out[output_key] = v

    return out


def extract_last_modified(p):
    """Return ISO-8601 date string (YYYY-MM-DD) from OFF last_modified_t
    (unix timestamp seconds) or None if missing/unparseable."""
    t = p.get("last_modified_t")
    if t is None:
        return None
    try:
        return datetime.utcfromtimestamp(int(t)).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OverflowError, OSError):
        return None


# ============================================================================
# RECORD FILTER + SHAPE
# ============================================================================

def to_record(p):
    """OFF product dict → richer PWA-SQLite record (nutrient values included).
    Returns None if record fails the basic quality filter (UK, valid barcode,
    name, brand, category). Does NOT filter by nutrient completeness — that's
    a downstream concern handled by build-kip-skus.py per the locked spec."""
    code = str(p.get("code") or p.get("_id") or "").strip()
    if not (8 <= len(code) <= 14 and code.isdigit()):
        return None
    # UK country filter — must contain en:united-kingdom
    countries = p.get("countries_tags") or []
    if not isinstance(countries, list) or "en:united-kingdom" not in countries:
        return None
    # Product name — prefer English variant
    name = (p.get("product_name_en") or p.get("product_name") or "").strip()
    if not name:
        return None
    # Brand
    brands = (p.get("brands") or "").strip()
    if not brands:
        return None
    brand = brands.split(",")[0].strip()
    # Category — keep first tag, humanise
    cats = p.get("categories_tags") or []
    if not (isinstance(cats, list) and cats):
        return None
    cat_raw = cats[0] if isinstance(cats[0], str) else ""
    cat = cat_raw.replace("en:", "").replace("-", " ").title()
    # Optional metadata fields
    quantity = (p.get("quantity") or "").strip()
    ns = (p.get("nutrition_grades") or "").strip().lower()
    nv = p.get("nova_group")
    if not isinstance(nv, int):
        nv = None
    pop = p.get("popularity_key", 0) or 0
    # Nutrient values (8 fields, may contain None)
    # Pass the whole record `p` — extract_nutrients reads both `nutriments`
    # and `nutriscore_data` (fallback for products with empty nutriments).
    nutrients = extract_nutrients(p)
    # Freshness signal
    last_modified = extract_last_modified(p)
    # Final record
    rec = {
        "c": code,
        "n": name[:120],
        "b": brand[:60],
        "q": quantity[:30],
        "cat": cat[:60],
        "ns": ns,
        "nv": nv,
        "last_modified": last_modified,
        "_pop": pop,
    }
    rec.update(nutrients)
    return rec


# ============================================================================
# MAIN
# ============================================================================

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"OFF dump pull (PWA SQLite variant) — TARGET {TARGET:,}")
    print(f"Streaming {DUMP_URL}")
    print(f"Output dir: {OUT_DIR}")
    print()
    sys.stdout.flush()

    matched = {}  # code → record (dedupe by code, keep highest popularity_key)
    line_count = 0
    parse_errors = 0
    start = time.time()

    req = urllib.request.Request(DUMP_URL, headers={"User-Agent": UA})

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            with gzip.GzipFile(fileobj=resp) as gz:
                for raw_line in gz:
                    line_count += 1
                    if line_count % PROGRESS_EVERY == 0:
                        elapsed = time.time() - start
                        rate = line_count / elapsed if elapsed > 0 else 0
                        print(f"  Processed {line_count:>9,} records · "
                              f"{len(matched):>6,} UK matched · "
                              f"{parse_errors:,} parse errors · "
                              f"{rate:,.0f} rec/s · {elapsed/60:.1f} min elapsed")
                        sys.stdout.flush()
                    try:
                        p = json.loads(raw_line)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        parse_errors += 1
                        continue
                    rec = to_record(p)
                    if rec is None:
                        continue
                    existing = matched.get(rec["c"])
                    if existing is None or rec["_pop"] > existing["_pop"]:
                        matched[rec["c"]] = rec
    except KeyboardInterrupt:
        print(f"\n!! Interrupted at line {line_count:,}, {len(matched):,} UK matched so far.")
        print(f"!! Continuing to write what we have...")
    except Exception as e:
        print(f"\n!! Stream error at line {line_count:,}: {type(e).__name__}: {e}")
        print(f"!! Continuing to write what we have ({len(matched):,} UK matched)...")

    elapsed = time.time() - start
    print()
    print(f"Total records read: {line_count:,}")
    print(f"UK qualified: {len(matched):,}")
    print(f"Parse errors: {parse_errors:,}")
    print(f"Elapsed: {elapsed/60:.1f} min ({elapsed:.0f}s)")
    print()

    # Sort by popularity, take top TARGET. (Completeness filtering happens
    # in the downstream build-kip-skus.py script per the locked spec, so
    # we deliberately keep records here even if some nutrient fields are
    # None — the build script does the picking.)
    sorted_recs = sorted(matched.values(), key=lambda r: r["_pop"], reverse=True)[:TARGET]

    # Strip _pop before output (compact schema for the consumer)
    final = [{k: v for k, v in r.items() if k != "_pop"} for r in sorted_recs]

    today = date.today().isoformat()
    dated_path = os.path.join(OUT_DIR, f"universe-pwa-sqlite-{today}.json")
    latest_path = os.path.join(OUT_DIR, "universe-pwa-sqlite-LATEST.json")

    with open(dated_path, "w") as f:
        json.dump(final, f, separators=(",", ":"))
    with open(latest_path, "w") as f:
        json.dump(final, f, separators=(",", ":"))

    print(f"WROTE {dated_path}")
    print(f"WROTE {latest_path}")
    print(f"      {len(final):,} records, {os.path.getsize(dated_path):,} bytes")
    # Quick completeness stat so the founder sees how many fully-populated rows
    # the downstream build script has to choose from.
    NUTRIENT_KEYS = [out for out, _ in NUTRIENT_FIELDS]
    fully_complete = sum(
        1 for r in final
        if all(r.get(k) is not None for k in NUTRIENT_KEYS)
        and r.get("ns") and r.get("nv") is not None
        and r.get("cat") and r.get("q")
    )
    print(f"      {fully_complete:,} of those have all 14 render-required fields populated")
    print(f"      ({fully_complete / len(final) * 100:.1f}% — the pool the next script picks 4,947 from)")
    print()
    print("Next: tell Claude in Cowork 'pwa-sqlite dump pull complete' and Claude will")
    print("      run build-kip-skus.py to produce the final kip-skus.sqlite (5,000 rows).")


if __name__ == "__main__":
    main()
