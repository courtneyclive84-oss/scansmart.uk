#!/usr/bin/env python3
"""
SCANSMART FLT UNIVERSE swap (v5.0.94)

Replaces the UNIVERSE array embedded in flt-app.html with the contents of
universe-LATEST.json (produced by pull-universe.py or pull-from-dump.py).

PRESERVES I500-tagged records from the existing UNIVERSE — those are SCANSMART
proprietary verified records (53 of them as of 25 May 2026) and must not be
lost when refreshing from OFF. I500 records take precedence over OFF on
barcode collision.

WHAT IT DOES:
1) Reads flt-app.html, locates `const UNIVERSE = [...]` and parses the existing array.
2) Extracts records with src=="i500" — preserves them.
3) Reads universe-LATEST.json (fresh OFF pull).
4) Merges: I500 records overwrite any OFF dupe on the same barcode.
5) Sorts: I500 first (preserves top-of-search visibility), then OFF.
6) Writes the merged array back into flt-app.html in-place, preserving the
   surrounding JS structure exactly (`const UNIVERSE = [...];`).
7) Reports record counts + file size change.

USAGE:
    cd ~/Documents/ScanSmart/scansmart-site/_internal
    python3 swap-universe-into-flt.py

This script is safe to re-run — it always reads the existing UNIVERSE fresh
to extract I500 records, so no cumulative drift.

AFTER SWAP:
- Bump CACHE_VERSION in sw.js (Claude in Cowork handles this step)
- Rsync local → iCloud mirror
- Deploy: drag-drop ~/Documents/ScanSmart/scansmart-site/ to Cloudflare Pages
"""
import re
import json
import os
import sys

# Resolve paths — works both on the Mac (Path A: ~/Documents/...) and inside
# the Cowork sandbox (Path B: /sessions/<vm>/mnt/ScanSmart/...). Try each.
def _resolve(rel):
    candidates = [
        os.path.expanduser("~/Documents/ScanSmart/scansmart-site/" + rel),
        # Cowork sandbox mount — vm name varies, glob for any
        *[p for p in __import__("glob").glob("/sessions/*/mnt/ScanSmart/scansmart-site/" + rel)],
        # Fallback: cwd-relative when run from within _internal
        os.path.abspath(os.path.join(os.path.dirname(__file__) or ".", "..", rel)),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]  # let downstream error name the missing path

FLT_PATH = _resolve("flt-app.html")
PULL_PATH = _resolve("_internal/universe-LATEST.json")


def find_universe_array(content):
    """Locate the `const UNIVERSE = [...]` declaration, return (array_open_idx, array_close_idx).
    array_close_idx is exclusive (one past the closing ])."""
    m = re.search(r"const UNIVERSE\s*=\s*\[", content)
    if not m:
        raise RuntimeError("Could not find `const UNIVERSE = [` in flt-app.html")
    arr_open = content.find("[", m.start())
    depth = 0
    i = arr_open
    while i < len(content):
        ch = content[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return arr_open, i + 1
        i += 1
    raise RuntimeError("UNIVERSE array brackets unbalanced")


def main():
    if not os.path.exists(FLT_PATH):
        print(f"ERROR: flt-app.html not found at {FLT_PATH}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(PULL_PATH):
        print(f"ERROR: pull output not found at {PULL_PATH}", file=sys.stderr)
        print(f"       Run pull-from-dump.py (or pull-universe.py) first.", file=sys.stderr)
        sys.exit(1)

    with open(FLT_PATH) as f:
        content = f.read()
    original_size = len(content)

    arr_open, arr_close = find_universe_array(content)
    existing = json.loads(content[arr_open:arr_close])
    i500_records = [r for r in existing if r.get("src") == "i500"]
    print(f"Existing UNIVERSE: {len(existing):,} records ({len(i500_records)} I500-tagged)")

    with open(PULL_PATH) as f:
        off_pull = json.load(f)
    print(f"OFF pull (universe-LATEST.json): {len(off_pull):,} records")

    # Merge: I500 takes precedence on barcode collision
    by_code = {}
    for r in off_pull:
        by_code[r["c"]] = r
    i500_overwrites = 0
    for r in i500_records:
        if r["c"] in by_code:
            i500_overwrites += 1
        by_code[r["c"]] = r
    print(f"Merged + deduped: {len(by_code):,} unique records "
          f"({i500_overwrites} I500 overwrote OFF dupes)")

    # Sort: I500 first, then OFF
    final = sorted(by_code.values(), key=lambda r: (0 if r.get("src") == "i500" else 1))
    print(f"Final UNIVERSE: {len(final):,} records "
          f"({sum(1 for r in final if r.get('src') == 'i500')} I500 at top)")

    new_arr_str = json.dumps(final, separators=(",", ":"))
    new_content = content[:arr_open] + new_arr_str + content[arr_close:]

    with open(FLT_PATH, "w") as f:
        f.write(new_content)

    new_size = len(new_content)
    print()
    print(f"Wrote {FLT_PATH}")
    print(f"  File size: {original_size:,} → {new_size:,} bytes ({new_size - original_size:+,})")
    print(f"  Array size: {arr_close - arr_open:,} → {len(new_arr_str):,} bytes")

    # Round-trip verify
    with open(FLT_PATH) as f:
        verify_content = f.read()
    v_open, v_close = find_universe_array(verify_content)
    verify_arr = json.loads(verify_content[v_open:v_close])
    if len(verify_arr) != len(final):
        print(f"!! VERIFY MISMATCH: re-parsed {len(verify_arr)} vs wrote {len(final)}", file=sys.stderr)
        sys.exit(2)
    print(f"  Round-trip parse: {len(verify_arr):,} records ✓")
    print()
    print("Next: bump CACHE_VERSION in sw.js to invalidate returning visitors' SW cache.")
    print("      Suggested format: scansmart-vX.X.XX-universe-pull-NNNN-skus")


if __name__ == "__main__":
    main()
