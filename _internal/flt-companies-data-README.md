# FLT companies data — free-primary-source cache

**Status:** v0.2 · banked 25 May 2026 evening · adds Companies House (UK) coverage to the v0.1 SEC EDGAR base
**Path:** `~/Documents/ScanSmart/scansmart-site/_internal/`
**Scope:** lookup-grade enrichment data for parent companies currently named in the FLT BRAND_OWNERSHIP database, gathered from free primary-source APIs only. No Wikimedia ecosystem (per the 25 May 2026 ⭐ rule).

## v0.2 additions (25 May 2026 evening)

- `flt-companies-companies-house-2026-05-25.json` — 15 UK FLT-parent entities pulled from Companies House REST API after API-key registration.
- Four §50-pass corrections logged inline in that file's `notes` field — initial name-search picked the wrong entity for Mars / Heinz / PepsiCo / Suntory; corrected via stricter re-searches that accept `private-unlimited` company types (the standard structure for major-corp UK subsidiaries).

---

## What's in v0.1 (banked)

### `flt-companies-edgar-2026-05-25.json` — SEC EDGAR pull
**Source:** `data.sec.gov/submissions/CIK<CIK>.json` — free, no key required, ~10 req/sec polite limit.
**Captured:** 2026-05-25T13:40Z
**Coverage:** 10 US-listed (or formerly US-listed) parent companies that file with SEC.

| Ticker | Name | Status | Latest annual |
|---|---|---|---|
| KHC | Kraft Heinz Co | ACTIVE | 10-K 2026-02-12 |
| MDLZ | Mondelez International | ACTIVE | 10-K 2026-02-04 |
| PEP | PepsiCo | ACTIVE | 10-K 2026-02-03 |
| KO | The Coca-Cola Company | ACTIVE | 10-K 2026-02-20 |
| K | Kellanova | **DEREGISTERED** (15-12G 2025-12-22 — Mars Inc. acquisition closed) | 10-K 2025-02-21 (final) |
| KLG | WK Kellogg Co | **DEREGISTERED** (15-12G 2025-10-06 — Ferrero Group acquisition closed) | 10-K 2025-02-25 (final) |
| PG | Procter & Gamble | ACTIVE (historical Form 15 is for individual security retirement, not parent dereg) | 10-K 2025-08-04 |
| NOMD | Nomad Foods Ltd | ACTIVE | 10-K 2026-02-26 |
| BRK-A | Berkshire Hathaway | ACTIVE | 10-K 2026-03-02 |
| UL | Unilever PLC | ACTIVE | 20-F 2026-03-12 |

### Schema

```
{
  "source": "SEC EDGAR submissions API",
  "capturedAt": ISO 8601,
  "records": [
    {
      "name": "Kraft Heinz Co",
      "cik": "0001637459",
      "ticker": "KHC",
      "currentTickers": ["KHC"],
      "currentExchanges": ["Nasdaq"],
      "status": "ACTIVE" | "DEREGISTERED" | "UNKNOWN — verify manually",
      "statusNote": "<post-listing note when relevant>",
      "sic": "2030",
      "sicDescription": "Canned, Frozen & Preservd Fruit, Veg & Food Specialties",
      "fiscalYearEnd": "1226",
      "businessAddress": {...},
      "investorWebsite": "...",
      "stateOfIncorporation": "DE",
      "formerNames": [{"name":"...","from":"...","to":"..."}],
      "latestAnnual": {"date":"...","url":"...","accession":"...","form":"10-K"|"20-F"},
      "latestQuarterly": {...},
      "latest8K": {...},
      "deregistration": {"date":"...","url":"...","form":"15-12G"} | null,
      "brandOwnershipImpact": "<surfaced chain update when relevant>",
      "flt_brand_references": "appears in: <brand list>",
      "source": "SEC EDGAR submissions API",
      "sourceUrl": "https://data.sec.gov/submissions/CIK<CIK>.json",
      "capturedAt": ISO 8601
    }
  ]
}
```

---

## Live-data findings worth surfacing to canon

Two brand-ownership chain updates surfaced directly from primary-source filings during this pull. Both are post-snapshot relative to the existing BRAND_OWNERSHIP database (curated against pre-2025 ownership state):

### Kellanova → Mars, Incorporated (2025)
- **What changed:** Pringles' parent updates from Kellanova to Mars Inc.
- **Filing:** SEC EDGAR Form 15-12G, CIK 0000055067, dated 2025-12-22 — terminates Kellanova's public registration following Mars Inc. acquisition close
- **Affected brands in BRAND_OWNERSHIP:** Pringles (existing entry says `2024 owner: Kellanova` — update to add `2025 owner: Mars, Incorporated (Mars family — private)`)
- **Primary-source citation candidate:** the Form 15-12G filing URL in the cache record

### WK Kellogg Co → Ferrero Group (2025)
- **What changed:** All WK Kellogg cereal brands (North America cereals — the slice carved out of The Kellogg Company in the 2023 split that left snacks under Kellanova) move to Ferrero Group
- **Filing:** SEC EDGAR Form 15-12G, CIK 0001959348, dated 2025-10-06 — terminates WK Kellogg's public registration following Ferrero acquisition close
- **Affected brands in BRAND_OWNERSHIP:** none currently captured by name (WK Kellogg post-2023 split wasn't in the curated 25 — but Pringles via Kellanova lineage WAS captured, indirectly)
- **Note for future BRAND_OWNERSHIP additions:** if/when Frosties, Corn Flakes, Special K, Rice Krispies, Froot Loops get added to the database, their post-2025 owner is **Ferrero Group**, not WK Kellogg Co
- **Primary-source citation candidate:** the Form 15-12G filing URL in the cache record

---

## `flt-companies-companies-house-2026-05-25.json` — Companies House pull (v0.2 addition)
**Source:** `api.company-information.service.gov.uk` — free REST API, requires registered key (one-time registration at developer.company-information.service.gov.uk).
**Captured:** 2026-05-25T13:55Z–14:00Z (across initial pull + two §50-correction re-pulls)
**Coverage:** 15 UK-incorporated entities — operating-company subsidiaries of FLT parents.

| Company number | Type | Status | Name | FLT brand references |
|---|---|---|---|---|
| 00041424 | plc | active | UNILEVER PLC | marmite, ben & jerry's, magnum, dove, hellmann's |
| 05160050 | plc | active | PREMIER FOODS PLC | branston, mr kipling, hovis 2007-2014 |
| 09295357 | ltd | active | PLADIS FOODS LIMITED | mcvitie's (UK ops of pladis/Yıldız) |
| 11953575 | ltd | active | YEO VALLEY PRODUCTION LIMITED | yeo valley |
| SC063233 | ltd | active | WALKER'S SHORTBREAD LTD | walkers shortbread (Scottish-registered) |
| 05879466 | ltd | active | NOMAD FOODS EUROPE LIMITED | bird's eye 2015+ (Nomad UK ops) |
| 05879473 | ltd | active | NOMAD FOODS EUROPE HOLDINGS LIMITED | same group — holding co |
| 09717350 | plc | active | COCA-COLA EUROPACIFIC PARTNERS PLC | coca-cola UK bottling and distribution |
| 00203663 | ltd | active | MONDELEZ UK LIMITED | cadbury UK, oreo UK, milka UK |
| OC316569 | llp | active | ENDLESS LLP | hovis 2020+ (Endless PE) |
| 02604258 | ltd | active | KERRY FOODS LIMITED | cheestrings, mattessons; Kerry Group UK ops |
| 06649982 | ltd | active | MARS WRIGLEY CONFECTIONERY UK LIMITED | mars, snickers, galaxy, twix, m&m's |
| 03095863 | **private-unlimited** | active | KRAFT HEINZ UK UNLIMITED | heinz UK ops |
| 01516531 | **private-unlimited** | active | PEPSICO HOLDINGS | walkers, quaker UK |
| 08603549 | ltd | active | LUCOZADE RIBENA SUNTORY LIMITED | lucozade, ribena (post-2013 acquisition from GSK) |

### §50 corrections logged
First pull's automatic best-match logic picked the wrong entity for four cases. Each was caught by name-mismatch verification and replaced via a stricter re-search:
- **MARS UK NORTH EAST LTD** (no 16865333) was a regional sub → replaced with **MARS WRIGLEY CONFECTIONERY UK LIMITED** (no 06649982).
- **HEINZELMANN UK LTD** (no 14697910) was an unrelated company with similar-prefix name → replaced with **KRAFT HEINZ UK UNLIMITED** (no 03095863).
- **PEPSICO UK PENSION PLAN TRUSTEE LIMITED** (no 02484669) was the pension trustee, not the operating co → replaced with **PEPSICO HOLDINGS** (no 01516531, private-unlimited).
- **SUNTORY BEVERAGE & FOOD SOUTH AFRICA LIMITED** (no 08731507) was an SA subsidiary that happens to also be CH-registered → replaced with **LUCOZADE RIBENA SUNTORY LIMITED** (no 08603549, the UK operating co for Lucozade/Ribena post the 2013 GSK acquisition).

The matching-logic lesson learned: relax the company-type filter to include `private-unlimited` and `private-unlimited-nsc` — major-corp UK subsidiaries commonly use these structures (Kraft Heinz UK, PepsiCo Holdings, Mars UK ops all do).

### Schema (Companies House records)

```
{
  "searchQuery": "Unilever PLC",
  "name": "UNILEVER PLC",
  "companyNumber": "00041424",
  "companyStatus": "active",
  "type": "plc",
  "jurisdiction": "england-wales",
  "dateOfCreation": "1894-12-22",
  "sicCodes": [...],
  "registeredOfficeAddress": {...},
  "accounts": {
    "next_due": "...",
    "last_accounts": {...},
    "accounting_reference_date": {...}
  },
  "confirmationStatement": {...},
  "previousCompanyNames": [...],
  "links": {
    "self": "/company/00041424",
    "filing_history": "/company/00041424/filing-history",
    "officers": "/company/00041424/officers",
    "persons_with_significant_control": "/company/00041424/persons-with-significant-control"
  },
  "flt_brand_references": "appears in: ...",
  "source": "Companies House REST API",
  "sourceUrl": "https://api.company-information.service.gov.uk/company/00041424",
  "publicUrl": "https://find-and-update.company-information.service.gov.uk/company/00041424",
  "capturedAt": ISO 8601
}
```

### API key handling
The Companies House REST key was passed via `CH_KEY` environment variable into the pull script, used in HTTP Basic Auth headers, and unset immediately after. The key was **never written to filesystem** — not in this README, not in the cache JSON, not in any /tmp scratch file, not in any committed artefact. Verified via grep.

---

## What's pending (v0.3 and beyond)

### Non-US / non-UK parents
**Status:** OpenCorporates 401 (key-gated, not free-anonymous). Zefix (Swiss federal registry) 401 (key-gated). Honest position: the free-anonymous landscape outside SEC EDGAR + Companies House is narrower than initially mapped.

**Workaround paths:**
- **Nestlé S.A.** — annual report PDFs at `nestle.com/investors`; SIX Swiss Exchange listing data via `six-group.com`. Both free, both primary-source.
- **Suntory Beverage & Food** — IR pages at `suntory.com/investors`; TYO:2587 disclosures via TSE.
- **Lactalis** (private, France) — limited free data; corporate site `lactalis.com`.
- **Yıldız Holding** (private, Turkey) — pladis UK subsidiary IS in Companies House (queued for key arrival); parent itself has limited free data.
- **3G Capital, PAI Partners, Permira, Gores Group, Endless LLP** (PE owners) — limited filings via Companies House for UK-registered funds.

If Ras wants comprehensive non-Anglo registry coverage, register an OpenCorporates free-tier key (rate-limited, ~500 reads/day after registration) — same principle as the Companies House key, just a separate registration step.

---

## Provenance discipline (per §15.x.4 + 22/25 May citation rules)

Every record in this cache carries a `source` field naming the primary registry/API the data came from, plus a `sourceUrl` linking to the canonical-source URL for that record. No data in this cache is sourced from any Wikimedia property.

Brand-ownership chain updates surfaced from this cache (e.g. the Pringles → Mars Inc. update flagged above) should land in BRAND_OWNERSHIP only via the §56 Panel Review gate (Risk seat per CLAUDE.md item 77), citing the Form 15-12G filing URL as the primary source.

---

## Next steps

1. **Bank the Pringles → Mars + WK Kellogg → Ferrero chain updates** into BRAND_OWNERSHIP via the next-session F1 update pass. Cite Form 15-12G URLs (primary source).
2. **Optional:** decide whether to register an OpenCorporates free-tier key for non-Anglo coverage (Nestlé / Suntory parent / Lactalis / Yıldız Holding parent).
3. **Optional:** wire F1 expanded-fact-sheet to enrich rendering using this cache's `investorWebsite` / `publicUrl` fields as a "primary-source filings" link per parent — would give analysts one-click jump to the SEC EDGAR or Companies House public record. Honours "access maxed where the path is honest."
4. **Optional:** deeper Companies House pulls per entity — officers (privacy-redacted), filing history (registered, amended, and dormant filings), PSC register (persons with significant control). The `links.*` paths in each CH record give direct URLs; same key, ~25 follow-up reads to cover all 15.
5. **Optional:** track CH and SEC for ongoing acquisitions / disposals by setting up a weekly diff against the cache. Any change in `companyStatus`, presence of a new Form 15-12G filing, or addition of a `dateOfCessation` is a brand-ownership chain update worth surfacing via the §56 Risk-seat gate.
