#!/usr/bin/env python3
"""
build-ohid-targets.py — curated OHID/PHE reduction-programme targets keyed by OFF category.

Two official UK reduction-programme sources, both extracted to text and asserted verbatim
here so a typo / mis-keyed figure fails the build loudly (§50 — no rounding, no guessing, no
invented values; same discipline as build-efsa-adi.py):

  SALT  — "Salt reduction targets for 2024", PHE, Sep 2020 (ohid-salt-2024.txt).
          Table 1. Per sub-category the FIRST two figures are the 2024 average then the 2024
          maximum (the next two are the 2017 figures). We take the 2024 average where a clean
          single-sub-category average exists, plus the 2024 maximum. Salt in g/100g.
  SUGAR — "Sugar Reduction: Achieving the 20%", PHE, Mar 2017 (ohid-sugar-2017.txt).
          Table 2. The 20% reduction guideline (the final 2020 programme target) in g sugar/100g.

Coverage is DELIBERATELY PARTIAL and only spans OFF categories already in COFID_CATEGORY_MAP.
Heterogeneous main-categories with no clean representative single target are SKIPPED on purpose
(documented below) rather than averaged into a misleading number:
  - meats / poultry      : category 1 spans bacon 2.59g -> sausages 1.08g (no representative avg)
  - seafood              : salt targets cover only CANNED fish; the fresh/frozen majority has none
  - sauces / condiments  : per-sub-type MAXIMUM-only, ketchup 1.63 vs chilli 2.88 (no category avg)
  - sodas/fruit-juices/fats/eggs/milks/vegetables/potatoes/legumes/nuts/fruits : no clean target

Each row names the exact source sub-category so the drawn line can be labelled honestly.

Output: ohid-targets.json + _ohid_const.js (const OHID_TARGETS keyed by OFF category tag).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SALT_TXT  = open(os.path.join(HERE, "ohid-salt-2024.txt"),  encoding="utf-8").read()
SUGAR_TXT = open(os.path.join(HERE, "ohid-sugar-2017.txt"), encoding="utf-8").read()

# Curated map: OFF category tag -> dict.
#   sub      : exact source sub-category the figures come from (drawn in the chart label)
#   salt     : (avg_num, avg_str, max_num, max_str) | None   — *_str asserted in SALT_TXT
#              avg_num may be None when the source gives a maximum only (e.g. rice).
#   sugar    : (target_num, target_str) | None               — target_str asserted in SUGAR_TXT
# g/100g throughout. Strings are matched VERBATIM against the extracted PDF text.
CURATED = {
    "en:breads":            {"sub": "Bread & rolls (2.1)",            "salt": (0.85, "0.85g salt", 1.01, "1.01g salt"), "sugar": None},
    "en:breakfast-cereals": {"sub": "Breakfast cereals (3.1)",       "salt": (0.48, "0.48g salt", 0.90, "0.90g salt"), "sugar": (12.3, "12.3g")},
    "en:cheeses":           {"sub": "Cheddar & hard cheeses (4.1)",  "salt": (1.66, "1.66g salt", 1.90, "1.90g salt"), "sugar": None},
    "en:soups":             {"sub": "Soups, as consumed (9.1)",      "salt": (0.50, "0.50g salt", 0.59, "0.59g salt"), "sugar": None},
    "en:snacks":            {"sub": "Standard potato crisps (11.1)", "salt": (1.25, "1.25g salt", 1.38, "1.38g salt"), "sugar": None},
    "en:salty-snacks":      {"sub": "Standard potato crisps (11.1)", "salt": (1.25, "1.25g salt", 1.38, "1.38g salt"), "sugar": None},
    "en:cakes":             {"sub": "Cakes (12.1)",                  "salt": (0.40, "0.40g salt", 0.66, "0.66g salt"), "sugar": (27.9, "27.9g")},
    "en:biscuits":          {"sub": "Sweet biscuits (16.1)",         "salt": (0.55, "0.55g salt", 0.85, "0.85g salt"), "sugar": (26.2, "26.2g")},
    "en:pastas":            {"sub": "Pasta & noodles (17.1)",        "salt": (0.43, "0.43g salt", 0.58, "0.58g salt"), "sugar": None},
    "en:rice":              {"sub": "Rice, unflavoured (18.1)",      "salt": (None, None,         0.15, "0.15g salt"), "sugar": None},
    "en:yogurts":           {"sub": "Yogurts & fromage frais",       "salt": None,                                     "sugar": (11.0, "11.0g")},
    "en:chocolates":        {"sub": "Chocolate confectionery",       "salt": None,                                     "sugar": (43.7, "43.7g")},
}

SALT_SRC  = "OHID/PHE Salt reduction targets 2024 (Sep 2020)"
SUGAR_SRC = "PHE Sugar reduction: Achieving the 20% (Mar 2017) — 2020 guideline"

out, errors = {}, []
for cat, row in CURATED.items():
    entry = {"sub": row["sub"]}
    salt = row["salt"]
    if salt is not None:
        avg_num, avg_str, max_num, max_str = salt
        if avg_str is not None and avg_str not in SALT_TXT:
            errors.append(f"{cat}: salt avg {avg_str!r} NOT found verbatim in salt source")
        if max_str is not None and max_str not in SALT_TXT:
            errors.append(f"{cat}: salt max {max_str!r} NOT found verbatim in salt source")
        entry["salt"] = {"avg": avg_num, "max": max_num, "src": SALT_SRC}
    sugar = row["sugar"]
    if sugar is not None:
        target_num, target_str = sugar
        if target_str not in SUGAR_TXT:
            errors.append(f"{cat}: sugar target {target_str!r} NOT found verbatim in sugar source")
        entry["sugar"] = {"target": target_num, "src": SUGAR_SRC}
    out[cat] = entry

if errors:
    print("BUILD FAILED — figures not verifiable against the source PDFs (§50):")
    for e in errors:
        print("  -", e)
    sys.exit(1)

json.dump(out, open(os.path.join(HERE, "ohid-targets.json"), "w"), separators=(",", ":"))
js = (
    "/* ============================================================\n"
    "   OHID/PHE reduction-programme targets (INTEGRATION 6) — keyed by OFF category tag.\n"
    "   SALT  : Salt reduction targets for 2024 (PHE, Sep 2020) — 2024 average + maximum, g/100g.\n"
    "   SUGAR : Sugar Reduction: Achieving the 20% (PHE, Mar 2017) — 2020 20%% guideline, g/100g.\n"
    "   Every figure is asserted present verbatim in the source PDF text by\n"
    "   _internal/build-ohid-targets.py (no invented numbers). Coverage is partial by design —\n"
    "   only OFF categories with a clean representative target; heterogeneous categories skipped.\n"
    "   §50: official UK reduction-programme target, category-level — not a product standard.\n"
    "   key 'en:breads' -> {sub, salt:{avg,max,src}?, sugar:{target,src}?}.\n"
    "   ============================================================ */\n"
    "const OHID_TARGETS = " + json.dumps(out, separators=(",", ":")) + ";\n"
)
open(os.path.join(HERE, "_ohid_const.js"), "w").write(js)
n_salt = sum(1 for v in out.values() if "salt" in v)
n_sugar = sum(1 for v in out.values() if "sugar" in v)
print(f"OHID targets: {len(out)} OFF categories verified -> ohid-targets.json + _ohid_const.js")
print(f"  salt targets: {n_salt}  |  sugar targets: {n_sugar}")
print("sample:", {k: out[k] for k in list(out)[:3]})
