# SCANSMART FLT UNIVERSE refresh runbook

Last updated: 25 May 2026

The FLT terminal's local cache (the `UNIVERSE` array in `flt-app.html`) is a
snapshot of well-populated UK product records from OpenFoodFacts. It's what
makes search keystroke-fast — and it goes stale as products reformulate,
new SKUs launch, and old ones disappear.

This runbook is for refreshing the snapshot. Two paths, pick the one that
fits your reach goal.

---

## Path A — Quick refresh (~10k records, runs in Cowork)

Use when: you want a fast refresh that fits in a Cowork session, accept a
10k-ish cap on the embedded cache (live OFF still tops up beyond it).

**Steps (Claude in Cowork can do all of these in one bash call):**
```bash
cd ~/Documents/ScanSmart/scansmart-site/_internal
python3 pull-universe.py       # ~30-60s — hits search-a-licious API
python3 swap-universe-into-flt.py  # ~1s — replaces UNIVERSE array
# then bump CACHE_VERSION in sw.js, rsync iCloud, you drag-drop deploy
```

Yields ~8-10k SKUs (capped by OFF search-a-licious window limit + quality
filter at ~38% pass rate).

---

## Path B — Full refresh (~20-50k records, runs locally on Mac)

Use when: you want comprehensive UK coverage (the OFF data dump has no 10k
window cap; only the quality filter trims results).

**Step 1 — YOU on Mac (Cowork can't do this; download is ~30GB compressed):**
```bash
cd ~/Documents/ScanSmart/scansmart-site/_internal
python3 pull-from-dump.py
```
Takes 30-60 minutes depending on broadband + CPU. Streams the OFF JSONL
gzip dump directly — never saves the 30GB to disk; only the filtered UK
records (~3GB) sit in RAM during processing. Outputs to:
- `universe-YYYY-MM-DD.json` (dated snapshot — preserved per §14.3.1)
- `universe-LATEST.json` (the one swap-universe-into-flt.py reads)

Expected yield: 20-50k UK SKUs after quality filter.

**Step 2 — TELL CLAUDE in Cowork:**
> "Dump pull complete — run the swap."

Claude will:
1. Run `swap-universe-into-flt.py` (preserves the 53 I500-tagged records,
   merges with OFF pull, writes back to flt-app.html)
2. Bump `CACHE_VERSION` in sw.js (forces returning-visitor SW cache refresh)
3. Rsync local → iCloud mirror
4. Confirm parity

**Step 3 — YOU:** drag-drop `~/Documents/ScanSmart/scansmart-site/` to
Cloudflare Pages dashboard.

---

## Cadence

- **Monthly first-Monday refresh** per §70 Monthly Document Sweep (calendar-
  anchored). Path A is fine for the routine sweep.
- **Triggered refresh** per §80 OFF-coverage drift rule (when the headline
  blindspot figure shifts ≥1 percentage-point). Path B preferred for these
  since the more comprehensive snapshot improves blindspot detection.
- **First Path B run after a long gap.** Path B annually at minimum, even
  if monthly Path A is running, to catch long-tail drift the API window misses.

---

## Files in this directory

- `pull-universe.py` — Path A: API pull from search-a-licious. Fast, capped.
- `pull-from-dump.py` — Path B: streaming pull from JSONL dump. Slow, comprehensive.
- `swap-universe-into-flt.py` — replaces UNIVERSE in flt-app.html. Common to both paths.
- `universe-YYYY-MM-DD.json` — dated snapshots (preserve per §14.3.1, do not delete).
- `universe-LATEST.json` — most recent snapshot, consumed by the swap script.
- `RUNBOOK-universe-refresh.md` — this file.

## I500 records — DO NOT lose

The existing UNIVERSE has 53 I500-tagged records (`src:"i500"` field) — these
are SCANSMART proprietary verified products from the independent grocer audit
and must NOT be lost on refresh. The swap script extracts them from the
existing UNIVERSE BEFORE replacing, then re-merges them in with priority over
OFF on barcode collision.

If you ever edit the UNIVERSE by hand and lose the I500 records, recover them
from the dated `universe-YYYY-MM-DD.json` snapshots (which are post-swap and
include the I500-tagged records merged in).

---

## Troubleshooting

- **pull-from-dump.py crashes mid-stream:** the script writes whatever it has
  on KeyboardInterrupt or stream error. Re-run from scratch — the bottleneck
  is download bandwidth, not CPU, and the resumability isn't worth the
  complexity.
- **swap-universe-into-flt.py reports "MUST-HAVE inserted":** the pull missed
  one of the 8 audit products (Coca-Cola Original/Zero, Pepsi Max, Lucozade,
  Red Bull, Warburtons Toastie, Hovis Soft White Medium, Kingsmill 50/50).
  The script inserts them automatically; no action needed.
- **flt-app.html grows past ~3MB after swap:** that's the cost of a bigger
  cache. Acceptable for a pro tool — service worker caches after first load.
  If it becomes a problem on mobile, consider a smaller TARGET in pull-from-
  dump.py.
- **CACHE_VERSION not bumped:** returning visitors won't pick up the new
  UNIVERSE until their SW cache expires (could be days). Always bump
  CACHE_VERSION in sw.js after a swap; the format is
  `scansmart-vX.X.XX-universe-pull-NNNN-skus`.
