#!/usr/bin/env python3
"""
SCANSMART site search-index builder.

Walks every .html file in the parent folder, extracts page-level metadata
(title, description, headings, ledes), and the inline decoder-row data
embedded as JS object literals in library-*.html. Writes search-index.json
to the parent folder.

Run with:  python3 _internal/build-search-index.py
Output:    search-index.json  (loaded by install.js at search time)

Built 10 May 2026 — site-wide search rollout.
"""

import json
import re
from pathlib import Path

# ----- Paths
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent  # scansmart-site/

# ----- Files we don't want to index
SKIP_FILES = {
    "404.html",
    "door3-preview.html",         # Internal preview, not for public search
    "library-salt.html.bak",       # Old backups
    "library-sugar.html.bak",
    "library-fats.html.bak",
    "library-upf.html.bak",
    "library-sweeteners.html.bak",
    "library-e-numbers.html.bak",
    "library-nutrition-claims.html.bak",
    "library-allergens.html.bak",
    "library-date-labels.html.bak",
    "library-ingredient-rules.html.bak",
    "library-front-of-pack.html.bak",
    "library-country-of-origin.html.bak",
    "library-gluten-free.html.bak",
    "library-barcodes.html.bak",
}

# ----- Regex helpers
RE_TITLE       = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
RE_DESC        = re.compile(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', re.IGNORECASE | re.DOTALL)
RE_H1          = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)
RE_H2          = re.compile(r"<h2[^>]*>(.*?)</h2>", re.IGNORECASE | re.DOTALL)
RE_H3          = re.compile(r"<h3[^>]*>(.*?)</h3>", re.IGNORECASE | re.DOTALL)
RE_LEDE        = re.compile(r'<p\s+class=["\']lede["\'][^>]*>(.*?)</p>', re.IGNORECASE | re.DOTALL)
RE_HTML_TAGS   = re.compile(r"<[^>]+>")
RE_HTML_ENTITY = re.compile(r"&(?:rsquo|lsquo|mdash|ndash|amp|nbsp|hellip|quot|apos);")
RE_WHITESPACE  = re.compile(r"\s+")

# Decoder row regex: matches `{ category:"...", name:"...", what:"...", verdict:"...", kip:"..." }`
# Tolerant of single or double quotes, optional trailing commas, escaped quotes inside strings.
RE_DECODER_ROW = re.compile(
    r"\{\s*"
    r"category\s*:\s*[\"']((?:[^\"'\\]|\\.)*?)[\"']\s*,\s*"
    r"name\s*:\s*[\"']((?:[^\"'\\]|\\.)*?)[\"']\s*,\s*"
    r"what\s*:\s*[\"']((?:[^\"'\\]|\\.)*?)[\"']\s*,\s*"
    r"verdict\s*:\s*[\"']((?:[^\"'\\]|\\.)*?)[\"']\s*,\s*"
    r"kip\s*:\s*[\"']((?:[^\"'\\]|\\.)*?)[\"']\s*"
    r"\}",
    re.DOTALL,
)

ENTITY_MAP = {
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&mdash;": "—",
    "&ndash;": "–",
    "&amp;":   "&",
    "&nbsp;":  " ",
    "&hellip;": "…",
    "&quot;":  '"',
    "&apos;":  "'",
}


def clean_text(s):
    """Strip HTML tags, decode common entities, collapse whitespace."""
    if not s:
        return ""
    s = RE_HTML_TAGS.sub(" ", s)
    for ent, ch in ENTITY_MAP.items():
        s = s.replace(ent, ch)
    s = RE_WHITESPACE.sub(" ", s).strip()
    return s


def first(regex, html, default=""):
    m = regex.search(html)
    return clean_text(m.group(1)) if m else default


def all_text(regex, html, limit=None):
    out = [clean_text(m.group(1)) for m in regex.finditer(html)]
    if limit:
        out = out[:limit]
    return [x for x in out if x]


def slug(s):
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-")


def build_page_entry(html_path):
    """Build a single page entry from one HTML file."""
    html = html_path.read_text(encoding="utf-8", errors="ignore")
    title = first(RE_TITLE, html)
    desc  = first(RE_DESC, html)
    h1    = first(RE_H1, html)
    h2s   = all_text(RE_H2, html, limit=12)
    h3s   = all_text(RE_H3, html, limit=24)
    lede  = first(RE_LEDE, html)

    # Snippet = lede > description > h1
    snippet = lede or desc or h1 or ""
    if len(snippet) > 220:
        snippet = snippet[:217] + "..."

    # Skip if there's no real content
    if not (title or h1 or desc):
        return None

    return {
        "id": html_path.stem,
        "title": title or h1,
        "url": html_path.name,
        "type": "page",
        "snippet": snippet,
        "h1": h1,
        "h2": h2s,
        "h3": h3s,
        "desc": desc,
    }


def build_decoder_rows(html_path, page_title):
    """Extract decoder-table rows from a library-*.html JS data array."""
    html = html_path.read_text(encoding="utf-8", errors="ignore")
    rows = []
    for idx, m in enumerate(RE_DECODER_ROW.finditer(html)):
        category, name, what, verdict, kip = m.groups()
        rows.append({
            "id": f"{html_path.stem}-{idx}-{slug(name)}",
            "type": "row",
            "name": name,
            "category": category,
            "what": what,
            "verdict": verdict,
            "kip": kip,
            "url": html_path.name,
            "page": html_path.stem,
            "page_title": page_title,
        })
    return rows


def main():
    pages = []
    rows  = []

    html_files = sorted([p for p in ROOT.glob("*.html") if p.name not in SKIP_FILES])
    print(f"Indexing {len(html_files)} HTML files…")

    for html_path in html_files:
        entry = build_page_entry(html_path)
        if not entry:
            continue
        pages.append(entry)

        # Decoder rows only live in library-*.html files
        if html_path.name.startswith("library-"):
            page_rows = build_decoder_rows(html_path, entry["title"])
            rows.extend(page_rows)

    index = {
        "built_at": "2026-05-10",
        "version": 1,
        "page_count": len(pages),
        "row_count": len(rows),
        "pages": pages,
        "rows": rows,
    }

    out_path = ROOT / "search-index.json"
    out_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    size_kb = out_path.stat().st_size / 1024
    print(f"✓ Wrote {out_path.name}  —  {len(pages)} pages, {len(rows)} decoder rows, {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
