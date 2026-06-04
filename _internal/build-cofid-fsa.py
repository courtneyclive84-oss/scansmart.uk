#!/usr/bin/env python3
"""
build-cofid-fsa.py — parse two free UK government datasets into JSON + inline-JS consts
for the SCANSMART Food Label Terminal (flt-app.html).

  1. CoFID 2021 "1.3 Proximates" sheet  -> _internal/cofid-proximates.json
                                         -> _internal/_cofid_const.js  (const COFID_DATA + COFID_CATEGORY_MAP)
  2. FSA GB food-additives register CSV  -> _internal/fsa-additives.json
                                         -> _internal/_fsa_const.js    (const FSA_ADDITIVES)

Run from ~/Documents/ScanSmart/scansmart-site/_internal/ .
Inputs expected alongside: cofid-2021.xlsx, fsa_add.csv (or fetched fresh).
"""
import csv, json, re, statistics, sys, urllib.request, os
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------------------
# CoFID value parser. CoFID cells are strings: numbers, "Tr" (trace), "N" (not
# measured), "" (blank), occasionally bracketed "(15.2)" estimates or values with
# footnote markers. Map: Tr->0, N/blank->None, else leading float.
# ----------------------------------------------------------------------------
def cofid_num(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.upper().startswith("N"):   # "N" = not measured
        return None
    if s.upper() == "TR":                       # trace
        return 0.0
    m = re.search(r"-?\d+\.?\d*", s)            # leading number, ignore brackets/footnotes
    return float(m.group()) if m else None


def build_cofid():
    src = os.path.join(HERE, "cofid-2021.xlsx")
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb["1.3 Proximates"]
    rows = ws.iter_rows(values_only=True)
    next(rows); next(rows); next(rows)          # header (3 rows) — data starts row 4
    # column indices (verified against the sheet header):
    #  0 Food Code | 1 Food Name | 3 Group | 7 Water | 9 Protein | 10 Fat
    # 11 Carbohydrate | 12 kcal | 13 kJ | 16 Total sugars | 24 NSP | 25 AOAC fibre
    out = []
    for r in rows:
        if not r or r[0] is None:
            continue
        # fibre: prefer AOAC (modern measure); fall back to NSP (Englyst) if AOAC absent
        aoac = cofid_num(r[25]) if len(r) > 25 else None
        nsp = cofid_num(r[24]) if len(r) > 24 else None
        out.append({
            "code":    str(r[0]).strip(),
            "name":    str(r[1]).strip() if r[1] else "",
            "group":   str(r[3]).strip() if r[3] else "",
            "water":   cofid_num(r[7]),
            "protein": cofid_num(r[9]),
            "fat":     cofid_num(r[10]),
            "carb":    cofid_num(r[11]),
            "kcal":    cofid_num(r[12]),
            "kj":      cofid_num(r[13]),
            "sugars":  cofid_num(r[16]),
            "fibre":   aoac if aoac is not None else nsp,
        })
    with open(os.path.join(HERE, "cofid-proximates.json"), "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"CoFID: {len(out)} foods -> cofid-proximates.json")
    return out


# ----------------------------------------------------------------------------
# COFID_CATEGORY_MAP — OFF category tag -> {name, prefixes}.
# prefixes are CoFID group-code prefixes matched by startsWith; medians are
# computed over every CoFID food whose group code starts with any listed prefix.
# Mapped to the most specific CoFID sub-group that matches the OFF category, so the
# benchmark is relevant (baked beans -> DB pulses, not all of D vegetables).
# Covers the 20 most common OFF UK food categories.
# ----------------------------------------------------------------------------
COFID_CATEGORY_MAP = {
    "en:breakfast-cereals":      {"name": "Breakfast cereals",        "prefixes": ["AI"]},
    "en:breads":                 {"name": "Bread",                    "prefixes": ["AF", "AG", "AP"]},
    "en:biscuits":               {"name": "Biscuits",                 "prefixes": ["AM"]},
    "en:cakes":                  {"name": "Cakes and pastries",       "prefixes": ["AN", "AO", "AS"]},
    "en:rice":                   {"name": "Rice",                     "prefixes": ["AC"]},
    "en:pastas":                 {"name": "Pasta and noodles",        "prefixes": ["AD"]},
    "en:cereals-and-their-products": {"name": "Cereals and cereal products", "prefixes": ["A"]},
    "en:milks":                  {"name": "Milk",                     "prefixes": ["BA"]},
    "en:cheeses":                {"name": "Cheese",                   "prefixes": ["BL", "BV"]},
    "en:yogurts":                {"name": "Yogurt and fromage frais", "prefixes": ["BN"]},
    "en:dairies":                {"name": "Milk and milk products",   "prefixes": ["B"]},
    "en:eggs":                   {"name": "Eggs",                     "prefixes": ["C"]},
    "en:vegetables":             {"name": "Vegetables",               "prefixes": ["DG", "DR", "DF"]},
    "en:potatoes":               {"name": "Potatoes",                 "prefixes": ["DA"]},
    "en:legumes":                {"name": "Beans and pulses",         "prefixes": ["DB"]},
    "en:fruits":                 {"name": "Fruit",                    "prefixes": ["FA", "F"]},
    "en:nuts":                   {"name": "Nuts and seeds",           "prefixes": ["G"]},
    "en:seafood":                {"name": "Fish and seafood",         "prefixes": ["J"]},
    "en:meats":                  {"name": "Meat and meat products",   "prefixes": ["M"]},
    "en:poultry":                {"name": "Poultry",                  "prefixes": ["MC"]},
    "en:fats":                   {"name": "Fats and oils",            "prefixes": ["O"]},
    "en:sodas":                  {"name": "Carbonated soft drinks",   "prefixes": ["PCA"]},
    "en:fruit-juices":           {"name": "Fruit juices",            "prefixes": ["FC", "PE"]},
    "en:chocolates":             {"name": "Chocolate and confectionery", "prefixes": ["SEA", "SEC", "SC"]},
    "en:snacks":                 {"name": "Savoury snacks",           "prefixes": ["SN"]},
    "en:salty-snacks":           {"name": "Savoury snacks",           "prefixes": ["SN"]},
    "en:sauces":                 {"name": "Sauces and condiments",    "prefixes": ["WC"]},
    "en:soups":                  {"name": "Soups",                    "prefixes": ["WA"]},
}


def emit_cofid_const(data):
    js = (
        "/* ============================================================\n"
        "   CoFID 2021 — McCance & Widdowson's Composition of Foods,\n"
        "   '1.3 Proximates' sheet (Public Health England / OGL v3).\n"
        "   Generic UK food-group nutrient reference. NOT product-specific.\n"
        "   Parsed from the official PHE xlsx by _internal/build-cofid-fsa.py.\n"
        "   Per food: code, name, group (CoFID code), water, protein, fat,\n"
        "   carb, kcal, kj, sugars, fibre (AOAC, else NSP). g per 100g.\n"
        "   ============================================================ */\n"
        "const COFID_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n\n"
        "/* OFF category tag -> CoFID food group (name + group-code prefixes).\n"
        "   Benchmark median computed over CoFID foods whose group startsWith a prefix. */\n"
        "const COFID_CATEGORY_MAP = " + json.dumps(COFID_CATEGORY_MAP, separators=(",", ":")) + ";\n"
    )
    with open(os.path.join(HERE, "_cofid_const.js"), "w") as f:
        f.write(js)
    print(f"CoFID const -> _cofid_const.js ({len(js)} bytes)")


# ----------------------------------------------------------------------------
# FSA GB food-additives register. CSV columns:
#   Eno, FoodAdditiveName, Groups, Status, AppliesIn, ...
# Rows are per (additive x nation). Aggregate to one entry per E-number:
#   key "E330" -> {name, status, nations:[England,Scotland,Wales,...]}
# ----------------------------------------------------------------------------
def build_fsa():
    src = os.path.join(HERE, "fsa_add.csv")
    if not os.path.exists(src):
        url = "https://data.food.gov.uk/regulated-products/id/food-additives/authorisation.csv"
        urllib.request.urlretrieve(url, src)
    table = {}
    with open(src, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            eno_raw = (row.get("Eno") or "").strip()
            if not eno_raw:
                continue
            key = re.sub(r"\s+", "", eno_raw).upper()   # "E 330" -> "E330"
            if not re.match(r"^E\d{3,4}[A-Z]?$", key):
                continue
            ent = table.setdefault(key, {
                "name": (row.get("FoodAdditiveName") or "").strip(),
                "status": (row.get("Status") or "").strip(),
                "nations": [],
            })
            nation = (row.get("AppliesIn") or "").strip()
            if nation and nation not in ent["nations"]:
                ent["nations"].append(nation)
            # keep the strongest status seen (Authorised wins)
            st = (row.get("Status") or "").strip()
            if st and ent["status"].lower() != "authorised":
                ent["status"] = st
    with open(os.path.join(HERE, "fsa-additives.json"), "w") as f:
        json.dump(table, f, separators=(",", ":"))
    print(f"FSA: {len(table)} unique E-numbers -> fsa-additives.json")
    return table


def emit_fsa_const(table):
    js = (
        "/* ============================================================\n"
        "   FSA GB Regulated Products — food-additives authorisation register.\n"
        "   Source: data.food.gov.uk/regulated-products (OGL v3). The site has no\n"
        "   per-E-number JSON query API; this is the authoritative bulk CSV register\n"
        "   parsed to a local lookup by _internal/build-cofid-fsa.py.\n"
        "   key 'E330' -> {name, status, nations:[England/Scotland/Wales/...]}.\n"
        "   §50: states GB authorisation STATUS only — never safe/unsafe.\n"
        "   ============================================================ */\n"
        "const FSA_ADDITIVES = " + json.dumps(table, separators=(",", ":")) + ";\n"
        "const FSA_ADDITIVES_FETCHED = \"" + DATE + "\";\n"
    )
    with open(os.path.join(HERE, "_fsa_const.js"), "w") as f:
        f.write(js)
    print(f"FSA const -> _fsa_const.js ({len(js)} bytes)")


DATE = "2026-06-04"  # date these registers were fetched (for §50 honesty footer)

if __name__ == "__main__":
    cofid = build_cofid()
    emit_cofid_const(cofid)
    fsa = build_fsa()
    emit_fsa_const(fsa)
    print("done.")
