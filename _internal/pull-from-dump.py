#!/usr/bin/env python3
"""
SCANSMART FLT UNIVERSE — pull from OFF data dump (v5.0.94)

WHY THIS EXISTS:
The search-a-licious API (used by pull-universe.py) caps at 10,000 results per
query window. To reach the full UK-tagged subset of OFF (tens of thousands of
records), we go directly to the OFF JSONL data dump.

RUN LOCALLY ON THE MAC — NOT IN THE COWORK SANDBOX.
The sandbox bash calls cap at 45 seconds; this script needs 30-60 minutes to
download (~30GB compressed dump) + stream-filter to JSON.

WHAT IT DOES:
1) Streams openfoodfacts-products.jsonl.gz directly from OFF (no full save to disk —
   bytes pipe through gzip decompressor → JSON parser → filter → in-memory dict).
2) Filters each record for:
   - countries_tags contains "en:united-kingdom"
   - real barcode (8-14 digits)
   - product_name (en preferred) non-empty
   - brands non-empty
   - at least one categories_tag
3) Dedupes by barcode, keeps highest popularity_key.
4) Sorts by popularity, caps at TARGET (default 20000).
5) Ensures MUST_HAVE audit products present (inserts if pull missed them).
6) Writes compact JSON to ~/Documents/ScanSmart/scansmart-site/_internal/
   - universe-YYYY-MM-DD.json (dated snapshot)
   - universe-LATEST.json (symlink-style copy used by swap-universe-into-flt.py)

WHAT YOU DO:
    cd ~/Documents/ScanSmart/scansmart-site/_internal
    python3 pull-from-dump.py

Expected output:
    Downloading + streaming...
      Processed 100,000 records, 4,231 UK matched
      Processed 200,000 records, 8,107 UK matched
      ...
      Processed 3,800,000 records, 51,234 UK matched
    Total records: 3,847,212, UK qualified: 51,234
    Wrote universe-2026-MM-DD.json: 20000 records, 2,485,712 bytes
    Wrote universe-LATEST.json: 20000 records, 2,485,712 bytes

    Next: tell Claude in Cowork to run swap-universe-into-flt.py

THEN: tell Claude "dump pull complete" and Claude will run the swap + bump
CACHE_VERSION + rsync iCloud (those steps fit easily in a Cowork bash call).

REFRESH CADENCE:
Run monthly first-Monday per §70 Monthly Document Sweep, OR triggered by §80
OFF-coverage drift rule. The dated snapshot lets you compare what's drifted
between refreshes.

ASSUMPTIONS:
- Mac has Python 3 stdlib (no third-party packages needed — uses gzip + json + urllib)
- Outbound network access to static.openfoodfacts.org
- ~3GB temporary memory headroom for the in-progress dedupe dict (the 30GB dump
  itself never lands on disk; only ~3GB of filtered records sit in RAM)
"""
import gzip
import json
import urllib.request
import os
import sys
import time
from datetime import date

# ============================================================================
# CONFIG
# ============================================================================

DUMP_URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
OUT_DIR = os.path.expanduser("~/Documents/ScanSmart/scansmart-site/_internal")
TARGET = 20000          # cap merged + filtered set at this many SKUs
UA = "SCANSMART-FLT-builder/5.0.94 (clive@scansmart.uk)"
PROGRESS_EVERY = 100000  # print progress every N raw records processed

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

# ============================================================================
# RECORD FILTER + SHAPE
# ============================================================================

def to_record(p):
    """OFF product dict → compact UNIVERSE record. Returns None if record fails quality filter."""
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
    # Category
    cats = p.get("categories_tags") or []
    if not (isinstance(cats, list) and cats):
        return None
    cat_raw = cats[0] if isinstance(cats[0], str) else ""
    cat = cat_raw.replace("en:", "").replace("-", " ").title()
    # Optional fields
    quantity = (p.get("quantity") or "").strip()
    ns = (p.get("nutrition_grades") or "").strip().lower()
    nv = p.get("nova_group")
    if not isinstance(nv, int):
        nv = None
    pop = p.get("popularity_key", 0) or 0
    return {
        "c": code,
        "n": name[:120],
        "b": brand[:60],
        "q": quantity[:30],
        "cat": cat[:60],
        "ns": ns,
        "nv": nv,
        "_pop": pop
    }


# ============================================================================
# MAIN
# ============================================================================

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"OFF dump pull — TARGET {TARGET}")
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

    # Sort by popularity, take top TARGET
    sorted_recs = sorted(matched.values(), key=lambda r: r["_pop"], reverse=True)[:TARGET]

    # Ensure must-have audit products present
    have_codes = {r["c"] for r in sorted_recs}
    inserted = 0
    for mh in MUST_HAVE:
        if mh["c"] not in have_codes:
            sorted_recs.append({**mh, "_pop": 99999999})
            inserted += 1
    if inserted:
        print(f"MUST-HAVE inserted: {inserted} audit products that the dump missed")
        print()

    # Strip _pop before output (compact schema)
    final = [{k: v for k, v in r.items() if k != "_pop"} for r in sorted_recs]

    today = date.today().isoformat()
    dated_path = os.path.join(OUT_DIR, f"universe-{today}.json")
    latest_path = os.path.join(OUT_DIR, "universe-LATEST.json")

    with open(dated_path, "w") as f:
        json.dump(final, f, separators=(",", ":"))
    with open(latest_path, "w") as f:
        json.dump(final, f, separators=(",", ":"))

    print(f"WROTE {dated_path}")
    print(f"WROTE {latest_path}")
    print(f"      {len(final):,} records, {os.path.getsize(dated_path):,} bytes")
    print()
    print("Next: tell Claude in Cowork 'dump pull complete' and Claude will run the swap")
    print("      (swap is fast — fits in one Cowork bash call).")


if __name__ == "__main__":
    main()
