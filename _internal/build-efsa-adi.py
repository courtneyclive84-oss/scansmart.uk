#!/usr/bin/env python3
"""
build-efsa-adi.py — curated EFSA ADI subset for common UK food additives.

Source: EFSA OpenFoodTox 3.0 (efsa-adi-bysubstance.json, produced from the official
Zenodo xlsx by the substance->ADI parent-chain climb). NOT invented — every value here
is asserted present in the EFSA dataset for the named substance, so a typo/mismatch fails
the build loudly (§50). Coverage is deliberately partial: well-known additives with clear
current EFSA ADIs. Multi-value substances (re-evaluated over time) carry the current EFSA
value, which the build asserts is one of the dataset's recorded values for that substance.

Output: fsa-adi.json + _efsa_const.js (const FSA_ADI keyed by E-number).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SUB = json.load(open(os.path.join(HERE, "efsa-adi-bysubstance.json")))
# normalise: substance(lower) -> set of recorded ADI numeric values
val_by_sub = {}
for name, recs in SUB.items():
    val_by_sub[name.lower()] = {float(r["adi"]) for r in recs if r.get("adi") is not None}

# Curated map: E-number -> (dataset substance name, chosen current EFSA ADI value).
# The chosen value MUST appear in the dataset's recorded values for that substance.
# ADIs in mg/kg bw/day. "group" notes where EFSA set a group ADI.
CURATED = {
    # Colours
    "E100":  ("Curcumin", 3),
    "E104":  ("Quinoline Yellow", 0.5),
    "E110":  ("Sunset Yellow FCF", 4),            # EFSA 2014 restored ADI 4
    "E124":  ("Ponceau 4R, Cochineal Red A", 0.7),
    "E129":  ("Allura Red AC", 7),
    "E150a": ("Plain caramel", 300),
    "E150b": ("Caustic sulphite caramel", 300),
    "E150c": ("Ammonia caramel", 100),
    "E150d": ("Sulphite ammonia caramel", 300),
    "E160d": ("Lycopene", 0.5),
    # Preservatives / antioxidants
    "E200":  ("Sorbic acid", 11),                 # EFSA 2019 group ADI (as sorbic acid)
    "E202":  ("Potassium sorbate", 11),
    "E210":  ("Sodium benzoate", 5),              # benzoates group ADI (as benzoic acid)
    "E211":  ("Sodium benzoate", 5),
    "E212":  ("Potassium benzoate", 5),
    "E213":  ("Calcium benzoate", 5),
    "E220":  ("Sulfur dioxide and sulfites group", 0.7),
    "E223":  ("Sulfur dioxide and sulfites group", 0.7),
    "E249":  ("Nitrites", 0.07),
    "E250":  ("Nitrites", 0.07),
    "E251":  ("Nitrate", 3.7),
    "E252":  ("Nitrate", 3.7),
    "E310":  ("Propyl gallate", 0.5),
    "E320":  ("Butylated hydroxyanisole (BHA)", 1),
    "E321":  ("Butylated hydroxytoluene (BHT)", 0.25),
    # Acids / emulsifiers / stabilisers
    "E334":  ("Tartaric acid (L(+)-)", 240),
    "E338":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E339":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E340":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E341":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E450":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E451":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E452":  ("Phosphoric acid-phosphates - di-, tri- and polyphosphates (E 338–341, E 343, E 450–452)", 40),
    "E407":  ("Carrageenan", 75),
    "E433":  ("Polysorbates", 25),
    "E432":  ("Polysorbates", 25),
    "E434":  ("Polysorbates", 25),
    "E435":  ("Polysorbates", 25),
    "E436":  ("Polysorbates", 25),
    # Flavour enhancers (glutamates, group ADI 30)
    "E620":  ("Glutamic acid", 30),
    "E621":  ("Monosodium L-Glutamate", 30),
    "E622":  ("Monopotassium L-glutamate", 30),
    "E623":  ("Calcium di-L-glutamate", 30),
    "E624":  ("Monoammonium L-glutamate", 30),
    "E625":  ("Magnesium diglutamate", 30),
    # Sweeteners
    "E950":  ("Acesulfame K", 9),
    "E951":  ("Aspartame", 40),
    "E960":  ("Steviol glycosides", 4),
}

out = {}
errors = []
for eno, (subname, val) in CURATED.items():
    recorded = val_by_sub.get(subname.lower())
    if recorded is None:
        errors.append(f"{eno}: substance not found in dataset: {subname!r}")
        continue
    if float(val) not in recorded:
        errors.append(f"{eno}: value {val} NOT in EFSA dataset for {subname!r} (recorded: {sorted(recorded)})")
        continue
    out[eno] = {"name": subname, "adi": val, "unit": "mg/kg bw/day"}

if errors:
    print("BUILD FAILED — values not verifiable against EFSA dataset:")
    for e in errors:
        print("  -", e)
    sys.exit(1)

json.dump(out, open(os.path.join(HERE, "fsa-adi.json"), "w"), separators=(",", ":"))
js = (
    "/* ============================================================\n"
    "   EFSA ADI (Acceptable Daily Intake) — curated common-additive subset.\n"
    "   Source: EFSA OpenFoodTox 3.0 (Zenodo). Every value is asserted present in the\n"
    "   EFSA dataset for the named substance by _internal/build-efsa-adi.py (no invented\n"
    "   numbers). Partial coverage by design — common additives with clear current EFSA\n"
    "   ADIs. §50: states the EFSA health-based guidance value, not a per-product judgement.\n"
    "   key 'E951' -> {name, adi (mg/kg bw/day), unit}.\n"
    "   ============================================================ */\n"
    "const FSA_ADI = " + json.dumps(out, separators=(",", ":")) + ";\n"
)
open(os.path.join(HERE, "_efsa_const.js"), "w").write(js)
print(f"EFSA ADI: {len(out)} E-numbers verified against the dataset -> fsa-adi.json + _efsa_const.js")
print("sample:", {k: out[k] for k in list(out)[:5]})
