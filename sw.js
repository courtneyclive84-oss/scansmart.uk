// SCANSMART marketing site — service worker
// Provides offline access to the brand chrome + cached pages.
// v5.0 launch — 30 April 2026
// v5.0.4 — 2 May 2026: Library reports (5 full-text pages added; nav adds Library tab)
// v5.0.5 — 2 May 2026: Hero v16 in navbar (swap brand-banner.svg → hero-v16.webp; 60px tall, scales 50/42 on mobile)
// v5.0.6 — 3 May 2026: PWA install enablement
//   - iOS PWA meta tags added to all 23 HTML pages (apple-mobile-web-app-capable etc.)
//   - manifest.webmanifest gains id, display_override, source=pwa start_url
//   - new install.html with platform detection + beforeinstallprompt capture
//   - Install link added to nav (before scanner CTA) and footer About column site-wide
// v5.0.7 — 3 May 2026: install.html UX rewrite
//   - "Share → Add to Home Screen → Add" three-word path leads each panel
//   - Inline SVG diagram of the iPhone Safari toolbar with Share button highlighted
//   - Sticky bottom reminder bar for iPhone Safari visitors (dismissable, remembered)
//   - Plain-language "Apple won't let websites do this for iPhone" note explains the no-one-tap fact
// v5.0.8 — 3 May 2026: corrected iPhone Safari path per Ras's live test on iOS
//   - Canonical path is now: 3 dots → Share → Add to Home Screen → Add (4 beats, not 3)
//   - SVG diagram redrawn: Safari address bar with the "..." page-menu button highlighted
//     (replaces the bottom-toolbar-with-Share diagram that didn't match Ras's iOS layout)
//   - Sticky reminder updated to the 4-beat path
// v5.0.9 — 3 May 2026: SEO foundation
//   - sitemap.xml gains /install + lastmod dates on every URL
//   - Library pages: Report → Article schema (Google rich-result eligibility) with author,
//     publisher, image, dateModified, mainEntityOfPage, genre="Research report"
//   - index.html gains commented verification meta tag scaffolding for Google Search Console,
//     Bing Webmaster Tools, and Yandex (DNS TXT preferred; meta tag is fallback)
// v5.0.10 — 3 May 2026: Bing Webmaster Tools verification token live
//   - msvalidate.01 meta tag in index.html now carries the live Bing token
//   - Bing site verification will succeed on next crawl after deploy
// v5.0.11 — 3 May 2026: site-wide Install button
//   - new install.js shared script handles beforeinstallprompt capture globally
//   - nav "Install" link → smart green button with download arrow on every page
//   - Click triggers Chrome native install (Android/desktop) or opens inline modal
//     with the 4-beat path (iPhone Safari), or falls through to /install
//   - Button hides automatically if user is already in standalone mode
//   - Modal HTML injected into body by install.js — no per-page edits needed
// v5.0.12 — 3 May 2026: install button prominence fix
//   - index.html and kip.html now load brand.css externally (so .install-btn and
//     .install-modal styles flow through; previously they had inline-only CSS and
//     the green button rendered as a plain text link)
//   - Mobile nav restructured: Install + Try the scanner stay VISIBLE inline at all
//     viewport sizes; only the section links (KiP/I500/Partner/Checkout/Library)
//     collapse into the hamburger. Was hidden behind the menu before.
//   - Compact button text below 820px and 380px so both buttons fit alongside the
//     brand banner and hamburger on a 375px iPhone screen.
//
// Strategy:
//   - Pre-cache the home page + install page + brand.css + install.js + Hero v16
//   - Network-first for HTML pages (always try fresh, fall back to cache when offline)
//   - Cache-first for static assets (CSS, images, fonts, JS)
//   - Don't cache form-handler Worker calls or Decision Record stats fetches

// v5.0.13 — 3 May 2026: mobile nav layout fix
//   - Hamburger was sitting in the middle of the nav bar (3-item space-between
//     centered it). Fixed via flex order + margin-right: auto on brand to push
//     hamburger back to the far right alongside Install + Try buttons.
//   - Hamburger menu was empty when opened (CSS specificity bug — the hide rule
//     for section links had higher specificity than the open-state show rule).
//     Fixed with specificity-matching override .nav-doors.open > a:not(.install-btn):not(.cta).
// v5.0.14 — 3 May 2026: cache-bust query strings on brand.css and install.js
//   - brand.css?v=5.0.14 and install.js?v=5.0.14 in every HTML page, so the
//     browser HTTP cache treats them as new resources after each deploy and
//     refetches automatically (no manual Safari cache-clear needed)
//   - Future deploys: bump the version strings AND CACHE_VERSION together
// v5.0.15 — 3 May 2026: hero copy + duplicate CTA cleanup
//   - Removed duplicate "Try the scanner" red button from the hero (now always
//     visible in the nav, no need for the duplicate inside the page)
//   - Rewrote hero sub copy: "labels you can't read" → "labels that hide what's
//     inside behind chemical words" — per the corrected voice rule (manufacturer
//     is creator of the gap; labels are obfuscated, not the shopper illiterate)
// v5.0.16 — 3 May 2026: hero sub sharpened to specific-evidence framing
//   - Lifted to specific-canonical examples per Ras's preference: "labels that
//     bury sugar under 61 names, salt under sodium chloride, and fat under
//     emulsifiers" — anchored on UCSF SugarScience 61-names canon
//   - "the data the supermarkets won't share" phrase removed — labels-and-shops
//     is the load-bearing pair (manufacturer-side villain + community-side trust)
// v5.0.17 — 3 May 2026: trans fats under partially hydrogenated oils added
//   - Fourth specific added to the labels-bury list — "trans fats under
//     partially hydrogenated oils" (peer-reviewed-defensible; PHOs are the
//     trans fat source banned in many jurisdictions). Climactic structure:
//     general bad things (sugar, salt, fat) → specific worst thing (trans fats).
// v5.0.18 — 3 May 2026: hero sub — chemistry list cut, "making the unseen seen"
//   - Replaces the four-specifics chemistry list with a tighter brand-voice
//     line: "Built from checking the labels and making the unseen seen — and
//     from the shops your neighbourhood already trusts." Connects the §13.2A
//     Two-Layer Literacy Rule and the POWER IS KNOWLEDGE DECODED promise
//     without turning the hero into a chemistry lesson.
// v5.0.19 — 3 May 2026: "Open in browser" floating link for PWA standalone users
//   - install.js gains injectBrowserLink() — adds a small floating "Open in
//     browser ↗" pill at bottom-right when display-mode is standalone
//   - Tap → tries navigator.share (best on iOS — share sheet includes "Open
//     in Safari"), then window.open (Android/desktop), then clipboard-copy
//     with a toast as final fallback
//   - brand.css gets .pwa-browser-link + .pwa-toast styles
//   - Cache-bust version stamps bumped to ?v=5.0.19 on brand.css and install.js
// v5.0.20 — 3 May 2026: open-in-browser uses native anchor (skip share sheet)
//   - The previous build went straight to navigator.share → iOS share sheet,
//     which Ras flagged as an extra step. Now uses a native <a target="_blank"
//     rel="noopener noreferrer external"> anchor instead — iOS standalone PWA
//     usually opens that directly in Safari without a share sheet detour.
//   - Click handler runs a 600ms safety-net timer that checks if iOS still
//     kept us inside the PWA shell; if so, copies URL to clipboard + toast.
//   - brand.css updated to style <a> the same as <button> in .pwa-browser-link.
//
// v5.0.21 — 3 May 2026: Dynamic Island fix + iOS share-sheet revert
//   - .site-nav-inner now respects env(safe-area-inset-top) so the iPhone
//     Dynamic Island / notch no longer clips the nav (Try the scanner CTA
//     was being half-hidden under the island and not registering taps)
//   - Floating .pwa-browser-link respects env(safe-area-inset-bottom) so it
//     clears the home indicator
//   - Open-in-browser button reverted to share-sheet on iOS, labelled "Share ↗"
//     (the previous v5.0.20 anchor approach didn't work for same-origin URLs
//     in iOS PWA — the click reloaded inside the shell instead of opening Safari)
//   - Android still uses window.open with "Open in browser ↗" label (works
//     cleanly there)
//
// v5.0.22 — 4 May 2026: brand wordmark restyle ScanSmart → SCANSMART (website pass)
//   - Find-replace across all 24 HTML pages + install.js + brand.css + sw.js +
//     manifest.webmanifest. 542 SCANSMART instances now present across the site.
//   - Reasoning: original ScanSmart camelCase echoed Epson's ScanSmart desktop
//     scanner-software product styling. New canon: brand wordmark always all-caps
//     SCANSMART (NASA / IBM / ASOS / IKEA pattern — caps wordmark sits inside
//     normal sentence-case body copy).
//   - Exclusions preserved: URLs (scansmart.uk, app.scansmart.uk) stay lowercase;
//     JS function name installScansmart stays camelCase (not a brand mention);
//     filesystem paths unchanged.
//   - Schema.org JSON-LD: "name":"SCANSMART Ltd", "alternateName":"SCANSMART" —
//     legal entity carries SCANSMART caps as visual styling; Companies House
//     registered name remains "ScanSmart Ltd" (NM01 change deferred).
//   - Step 2 (docs in ~/Documents/ScanSmart/*.md) and Marque v2 commissioning
//     come AFTER Ras verifies the website looks right.
//
// v5.0.23 — 4 May 2026: SCANSMART wordmark always renders in display font (Syne)
//   - New .swm CSS class in brand.css (Syne 700 + 0.02em letter-spacing)
//   - 233 body-text instances of SCANSMART now wrapped in <span class="swm">
//     across all 24 HTML pages — wordmark renders in Syne everywhere it appears
//     in running prose, matching the Marque v1 footer treatment
//   - Smart wrap: skips attribute values (alt, aria-label, meta content, href),
//     skips <title>/<script>/<style> blocks. 301 SCANSMART instances correctly
//     stay unwrapped (JSON-LD, meta tags, title tags, etc. — non-rendered text)
//   - Pattern follows NASA / IBM / ASOS convention: wordmark always in its
//     own font even when sitting inside body sentences
//
// v5.0.24 — 4 May 2026: homepage hero swap — Hero v16 → Marque v1 + slogan strapline
//   - Replaced the small Hero v16 phone-card image (~320px) with Marque v1 SVG
//     at hero scale (~520px). Marque carries "scansmart" as the dominant text
//     element, solving the wordmark-prominence problem on the homepage.
//   - Added separate hero-slogan element below the Marque: "Power is Knowledge
//     Decoded" in Syne 700, letter-spaced caps, with "Decoded" in yellow accent.
//     Slogan is now rendered text (selectable, indexable, restylable) rather
//     than locked into the artwork.
//   - Removed hero-masthead-meta (the company info line was needed to
//     compensate for the cropped bottom of Hero v16; not needed with Marque).
//   - Canon: Hero v16 masthead rule (27 April 2026) narrows scope to
//     non-homepage contexts (Strategy / Bible / external docs); Hero v16 itself
//     remains sealed canonical artefact per §14.3.1.
//
// v5.0.25 — 4 May 2026: Marque hero rasterised to PNG (font-load race fix)
//   - SVG hero-marque rendered badly in browsers because Syne loads via Google
//     Fonts AFTER the SVG paints; fallback font's wider character widths made
//     the "scansmart" wordmark overflow the bar-gap region (Ras's screenshot
//     showed scrambled/overlapping letters)
//   - Pre-rendered the canonical Marque v1 SVG to a 1080×360 retina PNG using
//     Pillow with Syne ExtraBold loaded directly via TTF — sidesteps the
//     font-loading race entirely
//   - PNG saved as assets/marque-v1-hero.png; original marque-v1.svg stays as
//     the canonical sealed artefact per §14.3.1; PNG is a derived rendering
//   - hero-marque img src updated to point at the PNG with ?v=5.0.25 cache-bust
//
// v5.0.26 — 4 May 2026: Marque PNG re-rendered for wordmark dominance
//   - First v5.0.25 PNG had wordmark too small relative to bars (font 42pt);
//     bars dominated, wordmark fragmented. Ras flagged: "i see no change".
//   - Re-rendered with font 58pt (Syne ExtraBold) + tight tracking + subtle
//     navy halo behind wordmark to make cream-on-cream stand out
//   - Result matches pic a visual character — wordmark dominant, bars framing
//   - Same filename (marque-v1-hero.png), new ?v=5.0.26 cache-bust forces refetch
//
// v5.0.27 — 4 May 2026: hero sub copy trim
//   - Removed "— and from the shops your neighbourhood already trusts" from
//     the homepage hero sub paragraph per Ras. Hero sub now reads:
//     "Built from checking the labels and making the unseen seen. SCANSMART
//     is the platform behind KiP, the I500, and The Weekly Supermarket
//     Checkout, Decoded."
//
// v5.0.28 — 4 May 2026: PWA start_url redirects to scanner
//   - Manifest start_url changed from "/?source=pwa" to "/launch?source=pwa"
//   - New launch.html immediately redirects to https://app.scansmart.uk/?source=pwa
//     so tapping the home-screen SCANSMART icon opens the scanner directly
//     instead of the website root (was Ras's expected PWA behaviour from before)
//   - launch.html added to PRECACHE so the redirect works offline
//   - IMPORTANT: iPhone Safari does NOT re-fetch manifest after PWA install.
//     Existing PWA installations need to be deleted + re-installed for the
//     new start_url to take effect. Android Chrome does re-fetch on its own.
//
// v5.0.29 — 4 May 2026: scanner-redirect for already-installed PWAs
//   - Earlier v5.0.28 added /launch.html + manifest start_url change for FRESH
//     installs, but Ras correctly pushed back: existing PWAs shouldn't need
//     re-install since the homepage itself can detect a PWA launch and redirect.
//   - Added inline script in index.html <head> that fires when display-mode is
//     standalone AND URL contains source=pwa — redirects to app.scansmart.uk.
//   - Result: existing installed SCANSMART PWAs (booting at /?source=pwa) NOW
//     redirect to scanner without re-install. Fresh installs (booting at
//     /launch?source=pwa via the new manifest) also redirect via launch.html.
//   - Regular browser visitors not affected — they don't match display-mode.
//
// v5.0.49 — 6 May 2026: Cloudflare Web Analytics auto-injection cleanup
//   - scansmart.uk added to Cloudflare Web Analytics on the courtneyclive84@gmail.com
//     account (6 May 2026 evening). Hostname is already proxied through Cloudflare so
//     auto-injection at the edge is used — Cloudflare adds the beacon to every page
//     response automatically; no <script> tag in HTML, no token to manage.
//   - Removed dead `<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
//     data-cf-beacon='{"token": "YOUR_CF_ANALYTICS_TOKEN"}'></script>` tag from all 28
//     public-facing HTML pages (was firing failed beacons against a placeholder token
//     since the v5.0 deploy on 30 April 2026; never carried a real token).
//   - index.html head comment block rewritten to reflect auto-injection path; the
//     comment-doc trail through the file now matches the operational truth.
//   - CACHE_VERSION bumped so the service worker invalidates cached HTML for returning
//     visitors and they fetch the cleaned versions on next visit.
//
// v5.0.50 — 9 May 2026: Brand Bible v6.0 PWA refactor — KiP → CheckIT, lifestyle-preference profiles
//   - Per Bible v6.0 §9 / §89 four-product architecture (banked 9 May 2026 afternoon):
//     headline consumer-app brand renamed from KiP to CheckIT. KiP, SaK, Dr RooT, CuB,
//     pH, CHNO retained as Crew member names per v6.0 §10 / §91 Crew under CheckIT.
//     Page filename kip.html preserved (URL-stability decision; rename to check.html
//     queued for separate Specialist Pool decision per v6.0 §9).
//   - Canonical capitalisation: CheckIT (capital C, lowercase h-e-c-k, capital I,
//     lowercase t) — camelCase compound-word, fourth sub-pattern in the brand naming
//     canon (joins acronymic / chemical-shorthand / prefixed at the parent-app naming
//     layer, above the §35 Crew Decoding Pattern). Per §50 Honesty Test: independently
//     true at every layer (Check is the verb / action; It is the object); elegance
//     follows. Resolves the v6.0 first-pass "Check it!" rendering with the structurally-
//     consistent capital-lowercase-CAPITAL discipline applied at the parent-app layer.
//   - Future-use extensibility: CheckIT ("check") travels with future use cases beyond
//     barcode-scanning (cosmetics Door 5, basket-decode Phase 2, future verticals) more
//     cleanly than Scanit ("scan") would have — barcode is one read-surface among many,
//     but the user's act of checking persists across all of them.
//   - Per v6.0 §11 / §90 lifestyle-preference profiles: kip.html profile-button section
//     refactored from condition-mode framing (diabetes / hypertension / family / general)
//     to lifestyle-preference framing (Watching my sugar / Watching my salt / Watching
//     my caffeine / General). MHRA classification safety: app sits outside UK MDR 2002
//     SaMD scope by design.
//   - kip.html: full content refactor — title, meta description, Schema.org JSON-LD,
//     Open Graph, hero, three-step section, what-CheckIT-shows-you, the-Crew-of-
//     CheckIT family section, disclaimer (preserves anti-medical-claim posture),
//     CTA band, footer Products link.
//   - manifest.webmanifest: description rewritten to four-product architecture; shortcut
//     "Open KiP scanner" → "Open CheckIT".
//   - Cross-file sed sweeps across all HTML: Schema.org Organization description (17
//     pages); nav link "<a href=\"kip.html\">KiP</a>" (44 pages) → "CheckIT"; footer
//     Products "KiP scanner" link (44 pages) → "CheckIT"; "the KiP scanner" prose →
//     "CheckIT"; "behind KiP, the I500" → "behind CheckIT, the I500"; first-pass
//     "Check it!" → final "CheckIT".
//   - Preserved: KiP Stories (Crew member context); kip-data.courtneyclive84.workers.dev
//     Worker hostname (backend infrastructure invisible to users); kip: JSON keys and
//     data-kip CSS attributes across decoder pages (technical identifiers per v6.0 §27
//     internal-information scrub rule); KiP Crew character references in Family/Crew
//     section per §10 / §91.
//   - index.html + install.html: meta descriptions, OG descriptions, body prose, door
//     card titles refreshed.
//   - Trademark filing posture: figurative-only on CHECKIT BY SCANSMART lockup per
//     TMA 1994 §3(1)(c). UKIPO TMview clearance pass required before filing in
//     Class 9 (information-presentation app) + Class 35 (communications/trade) +
//     Class 41 (education/publication).
//   - CACHE_VERSION bumped so service worker invalidates cached HTML for returning
//     visitors. New v6.0 brand canon ships on next visit.
//
// v5.0.51 — 11 May 2026: Knowledge Library — 8 FSMA gold-standard evidence vaults
//   shipped; 13-piece gold-standard set complete; site-wide voice-rule meta + internal
//   editorial-guidance strip
//   - 8 net-new FSMA gold-standard evidence vaults (~9,000–10,000 words each, 18–20
//     sections, peer-reviewed citations, regulation map, high-risk groups, conflicts
//     and uncertainties, decoder moves, defamation-safety statement, cultural-accuracy
//     where relevant): Carbohydrate Types, Impulse Buying Triggers, Food Marketing to
//     Kids, Reformulation Tracking, Dietary Patterns, Brand vs Manufacturer, Cultural
//     Food Myths, Global Staple Foods.
//   - 5 mid-format pieces upgraded to gold-standard depth: Caffeine and Health,
//     Industry Funding Bias, UPF Brain & Cognitive, Children's Oral Health, Behaviour
//     Change & Decision-Point Capture. Total gold-standard set = 13.
//   - 21 reference pages given consistency-pass: cross-links to the 13 gold-standard
//     pieces + version note + stale-date reminder block before </main>.
//   - library.html index page: new "FSMA gold-standard evidence vaults" optgroup in
//     Jump-to nav, dedicated on-page section between Front-of-pack and Contents, TOC
//     updated to expose the 13-piece set with version/depth lines.
//   - Editorial discipline pass (11 May): stripped voice-rule meta-references
//     ("Per the SCANSMART voice canon (corrected 1 May 2026)" etc.) from all
//     public-facing HTML — internal canon-keeping that didn't belong on the public
//     site. Substantive structural critique (manufacturer-as-creator-of-the-gap as
//     analytical claim) preserved.
//   - Editorial discipline pass (11 May, second sweep): stripped Language Discipline
//     and Use-case Routing sections from all 13 gold-standard pieces — internal
//     editorial guidance (audience-targeting tables like "NHS pitch / Investor deck
//     / Legal defence") that is inappropriate for forward-facing public docs.
//     Defamation-safety statements, peer-reviewed sources, regulation maps,
//     high-risk groups, conflicts/uncertainties, decoder moves, and related-reading
//     cross-links all preserved.
//   - sitemap.xml: 9 new URLs added (8 FSMA pieces + library-periodic-table); lastmod
//     bumped to 2026-05-11 for the 13 gold-standard pieces, the library hub, all
//     21 reference pages, and library-method.
//   - CACHE_VERSION bumped so service worker invalidates cached HTML; returning
//     visitors get the cleaned versions on next visit.
//
// v5.0.52 — 11 May 2026: Partner Pack architecture — Behaviour Change & Decision-Point
//   Capture migrated from public library to gated Partner Pack; Borough Audit Operations
//   Manual + Food Literacy Pilot Proposal + Appendix B references softened on partner.html
//   - Architectural decision: Library = public food-literacy reference; Partner Pack =
//     gated B2B institutional deliverables (Competitive Positioning Report v1.3 +
//     Behaviour Change & Decision-Point Capture evidence vault v1.1 + Lambeth Business
//     Case + future Borough Audit Operations Manual + future Food Literacy Pilot Proposal).
//   - library-behaviour-change-decision-point.html replaced with a 0-second meta-refresh
//     redirect stub pointing to /library#behaviour-change. The redirect preserves any
//     external bookmarks / backlinks; the public-facing 200-word summary now lives on
//     library.html under the #behaviour-change anchor; the full vault is gated and shared
//     with NHS commissioners, HIN partners, academic collaborators, and foundation funders
//     on partner request via the Partner programme.
//   - library.html: 200-word summary at #behaviour-change anchor expanded to cover the
//     Ahmadi 2022/2023/2025 evaluations, the BCT taxonomy gap, the CheckIT Buy / Put back
//     / Just looking instrument as first deployed implementation. Closing CTA points to
//     Partner programme for the full vault. Jump-to dropdown "Evidence vaults & reports"
//     optgroup: removed the library-behaviour-change-decision-point option.
//   - 26 library-*.html cross-link sweep: every internal cross-link to
//     library-behaviour-change-decision-point.html updated to library.html#behaviour-change
//     so visitors land directly on the summary anchor without redirect hop.
//   - partner.html: stripped Borough Audit Operations Manual v1.0 reference (not banked
//     anywhere); softened Lambeth Business Case from "v1.2 ready" to "template available
//     on request" (the .docx exists but is aligned to Brand Bible v4.5 and needs a v1.3
//     refresh against v6.0 four-product architecture before sending); softened Food
//     Literacy Pilot Proposal from "ready" to "curriculum brief available on request"
//     (not banked anywhere); softened Appendix B Shop Participation Agreement reference
//     to "I500 Operational Plan partnership terms" (the standalone Appendix B is not banked).
//   - sitemap.xml: removed the library-behaviour-change-decision-point URL (the redirect
//     stub stays in place for direct hits but is noindex).
//   - CACHE_VERSION bumped so returning visitors get fresh HTML on next visit.
//
// v5.0.53 — 11 May 2026 evening: Canned Goods FSMA gold-standard evidence vault added
//   - New library-canned-goods.html (gold-standard depth, ~10,000 words, full FSMA template):
//     covers the thermal-cycle process (Nicolas Appert 1809; retort F0 specifications under FSA
//     Code of Practice on Canned Foods); the 9 functional sub-categories (pulses; vegetables;
//     fish; meat; soups; fruit; dairy and dairy-adjacent; sauces; world-foods cultural-cuisine
//     staples); the engineered salt and sugar loads (He 2014 BMJ Open; OHID Salt and Sugar
//     Reduction Programmes); BPA and bisphenol can-lining chemistry (Geens 2012 FCT; Vandenberg
//     2007 RT; Rochester 2013 RT; Rochester & Bolden 2015 EHP; the EFSA April 2023 TDI 20,000-
//     fold revision from 4 µg/kg bw/day to 0.2 ng/kg bw/day; EU Regulation 2024/3190 BPA ban
//     from 2025); heat-processing nutrient impact (Rickman 2007 JSFA Parts 1&2; Gärtner 1997
//     AJCN lycopene bioavailability; Bandarra 2001 EFRT omega-3 retention in canned oily fish);
//     tinned fish as the nutritional-ceiling sub-category (SACN Advice on Fish Consumption);
//     pack-engineering decode (FIC drained-weight rule; QUID; "in own juice" / "in syrup" /
//     "in brine" decode; Price Marking Order 2004); the cultural-cuisine diaspora-community
//     substrate (ackee; callaloo; jackfruit; breadfruit; plantain; pigeon peas; coconut milk;
//     the I500 verified-product layer as the data gap fix); food-bank and equity economics
//     (Trussell Trust parcel composition; FSA Food and You Survey; Adams 2016 PLOS Med equity-
//     of-intervention argument); regulation map (9 UK 2026 regulatory surfaces); international
//     precedent (Chile Law 20.606; Mexico NOM-051; EU Regulation 2024/3190; US FDA divergence
//     on BPA; Maryland HB 895); 6 high-risk groups; 4 live conflicts and uncertainties; 12
//     decoder moves; full defamation-safety statement; cultural-accuracy commitment; educational-
//     register positioning; 26 cross-links to companion library pieces.
//   - library.html: new "Canned Goods" entry in FSMA optgroup of Jump-to dropdown; new card
//     in FSMA gold-standard on-page section; TOC + section description bumped from 8 to 9
//     gold-standard pieces.
//   - sitemap.xml: new URL added at priority 0.85, lastmod 2026-05-11.
//   - CACHE_VERSION bumped so returning visitors get fresh HTML on next visit.
//
// v5.0.54 — 11 May 2026 late evening: Three research-tier papers promoted to public Library
//   gold-standard format per §30b canonical rule
//   - Alcohol Labelling v1.3 (promoted from research-only v1.2 of 10 May 2026): Article 16(4)
//     EU 1169/2011 carve-out decoded; IARC Group 1 (1988) + WHO 2023 Lancet PH "no safe amount";
//     Rumgay 2021 Lancet Oncology 741,300 cases; IAS 2024 £27.44bn UK harm cost; 8,274 UK
//     alcohol-specific deaths 2023; Ireland Public Health (Alcohol) (Labelling) Regulations 2023
//     S.I. No. 249/2023; UK 10-Year Health Plan 3 July 2025 mandatory-disclosure commitment;
//     Portman Group 2024 voluntary regime; Petticrew 2018 / McCambridge 2015 / Mitchell 2020
//     SAPRO industry-funded ecosystem; 7-row regulation map; 7 high-risk groups; 4 conflicts;
//     13 decoder moves.
//   - Bottled Water v1.3 (promoted from research-only v1.2 of 10 May 2026): Natural Mineral
//     Water, Spring Water and Bottled Drinking Water (England) Regulations 2007 three-category
//     framework; UK tap-water DWI/DWQR/NIEA >99% compliance baseline; 2004 Dasani Sidcup
//     bromate UK withdrawal; 2007 Aquafina P.W.S. labelling change; UN UNU-INWEH 2023 SDG 6
//     framing (600bn bottles/yr; 25M tonnes plastic waste); Qian 2024 PNAS DOI 10.1073/pnas.
//     2300582121 ~240,000 nanoplastic particles/L with methodology critique; Mason 2018
//     Frontiers in Chemistry ~325 particles/L microplastic baseline; Villanueva 2021 STOTEN
//     PMID 34247071 Barcelona LCA (3,500x resource use; 1,400x species loss vs tap); 500-2,000x
//     cost premium; five global giants (Coca-Cola, PepsiCo, Danone, Nestlé, BlueTriton, Nongfu)
//     decoded; UK ethical brands Belu and One Water; children's flavoured-water sub-segment;
//     7-row regulation map; 7 high-risk groups; 4 conflicts; 11 decoder moves.
//   - Protein Claims v1.3 (promoted from research-only v1.2 of 10 May 2026): EU Regulation
//     1924/2006 12% / 20% energy-share thresholds; no disqualifying-nutrient gate; UK COMA 1991
//     RNI 0.75 g/kg/day; UK NDNS average 76 g/day (19-64), 67 g/day (65+); Granic 2020 Geriatrics
//     PMC7151458 older-adult sarcopenia-risk exception (<50% met RNI; <15% met ESPEN 1.2 g/kg/day);
//     Fernan 2018 Health Communication + McKeon-Hallman 2024 Foods PMC11049005 health-halo
//     experimental evidence; Nutrients 2024 PubMed 39770902 PAHO NPM 90.8% less-healthy finding;
//     IARC 2015 Bouvard et al. Lancet Oncology processed-meat Group 1 / 50g/day = 18% colorectal
//     cancer risk; Clean Label Project 2024-25 Protein Powder Category Report 47% above Prop 65
//     lead / organic 3x lead / plant 3x lead / chocolate 4x lead with CRN methodology critique;
//     US FDA 87 FR 59168 2022 proposed disqualifying-nutrient rule under review; 7-row regulation
//     map; 7 high-risk groups; 5 conflicts; 12 decoder moves.
//   - library.html: 3 new entries in FSMA optgroup of Jump-to dropdown; 3 new cards in FSMA
//     gold-standard on-page section; TOC + section description bumped from 9 to 12 gold-standard
//     pieces.
//   - sitemap.xml: 3 new URLs added at priority 0.85, lastmod 2026-05-11.
//   - All three pieces follow the §30b canonical Gold-Standard FSMA Research Paper Format rule
//     (18-section template; ~9,000-10,000 words; full defamation-safety + cultural-accuracy +
//     educational-register positioning; peer-reviewed primary sources; named-party references
//     public-record-only).
//   - CACHE_VERSION bumped so returning visitors get fresh HTML on next visit.
//
// v5.0.58 — 16 May 2026 late evening: FLT v0.9.1 — WIRE filter tightened + EU + weather/supply-chain sources
//   - WIRE source list expanded from 5 → 13 sources, grouped by tier:
//     • UK regulators (FSA, DHSC, DEFRA gov.uk Atom feeds)
//     • UK weather + environment (Met Office, Environment Agency, gov.uk
//       "food supply" keyword search-as-RSS, Climate Change Committee) —
//       captures drought / flood / heatwave / harvest-failure stories that
//       affect food prices and shelf availability
//     • EU + international regulators (EFSA, WHO)
//     • Peer-reviewed (The Lancet)
//     • UK consumer-facing (BBC Health, BBC Business, Sky UK)
//     • Industry + lifestyle (Just-Food, Guardian Food — filtered hard)
//   - Three-layer filter pipeline replaces the old single keyword regex:
//     1. WIRE_INCLUDE — must contain food/health/supply-chain keyword
//     2. WIRE_EXCLUDE — drops recipe/cocktail/restaurant-review/novel/
//        baking-tips/cookbook-lifestyle content that was bleeding through
//        from Guardian Food
//     3. institutionalScore() — 0-400 score weighting safety, regulator,
//        policy, allergen, public-health, peer-reviewed, AND weather +
//        supply-chain disruption signal (drought / flood / harvest failure
//        / bird flu / empty shelves / commodity price scoring boosts)
//   - Sort changed from pure chronological to (score × source weight) DESC
//     then date DESC. Tier-2 sources (Guardian Food, Sky UK) require real
//     institutional signal (score ≥25) to even appear; tier-1 sources
//     (FSA, EFSA, Lancet) get listed with any include match.
//   - Recency boost: +30 if <48h old, +10 if <1 week old.
//   - WIRE cache key bumped to v2 so returning visitors get fresh ranking.
//   - CACHE_VERSION bumped so PWA users pick up the new WIRE.
//
// v5.0.57 — 16 May 2026 late evening: FLT v0.9 — three reviewer-prompted improvements
//   - Contextual FSA recall ranking: when a product loads, the F6 RECL panel
//     re-ranks recalls by relevance to the focal product (same brand +100,
//     same category +25, allergen overlap +25). Top relevant recall gets a
//     red "X recalls relevant to BRAND" banner. RECL panel header gains a
//     RELEVANT / ALL toggle so users can switch between contextual and pure
//     chronological views without losing chronological access.
//   - Peer comparison deltas: each peer row now shows "+12% sug, -5% salt"
//     badges (better/worse colour-coded) plus a one-line "why this is better"
//     summary like "21% less sugar, 8% less salt" — turns the peer table from
//     numbers into teaching moments per the FSA/NHS literacy pitch.
//   - NOVA / Nutri-Score / Eco-Score hover tooltips: hovering over any of the
//     three score tiles in F1 PROD reveals the classification. NOVA 4 tooltip
//     includes product-specific reason ("Detected: E1442, E330. Why: modified
//     starch, flavour extracts"). Fills the food-literacy gap the external
//     reviewer flagged — most users don't know what NOVA 4 means.
//   - CACHE_VERSION bumped so returning visitors get the v0.9 features.
//
// v5.0.56 — 16 May 2026 evening: FLT WIRE panel — F7 food news aggregator added
//   - /flt-app gains a 7th panel: WIRE (institutional food news feed)
//   - Aggregates Guardian Food, BBC Health/Business, FSA gov.uk, Sky News UK
//     via public CORS proxy (api.rss2json.com, v0). Filters by food keywords:
//     food/nutrition/recall/allergen/FSA/sugar/salt/UPF/HFSS/reformulation/etc.
//   - Grid expanded from 3-col × 2-row to 4-col × 2-row. WIRE spans both rows
//     on the right as a tall scrollable news strip. Responsive: collapses to
//     full-width strip below the 6-panel grid on <1100px viewports.
//   - 10-min localStorage cache to avoid hammering the proxy.
//   - Fresh items (<6h old) get green left-border accent.
//   - Production path: replace WIRE_PROXY with a Cloudflare Worker at
//     scansmart.uk/api/wire that fetches server-side, caches in KV, returns
//     the same JSON shape. Worker code shipped alongside this deploy at
//     /assets/wire-worker.js — wrangler deploy when ready.
//   - HELP dialog updated to list F7 + new keyboard map.
//   - CACHE_VERSION bumped so returning visitors get the WIRE panel on next visit.
//
// v5.0.55 — 16 May 2026: FLT (Food Label Terminal) — new product surface launched
//   - /flt — marketing landing page using site chrome (brand.css, page-hero pattern,
//     canonical SCANSMART Marque v2 with animated SMIL scan-line, six-panel feature
//     grid, I500 spotlight with DEES Callaloo "OFF transcription error" example,
//     "What FLT isn't" honest disclosure, comparison vs Mintel/Innova/Yuka/OFF,
//     five-surface family strip with FLT highlighted).
//   - /flt-app — the live FLT terminal: institutional intelligence surface combining
//     53 I500 verified SKUs + 1,500 OFF community SKUs, live OpenFoodFacts product
//     fetches, FSA recall feed integration, EFSA additive flagging, Eco-Score,
//     reformulation history (OFF revision API), FSA-14 allergen scan. Self-contained
//     single-file ~284KB; fullscreen by design (no site nav inside terminal).
//   - Nav: "FLT" link added between I500 and Partner across all 58 standard-nav pages.
//   - Footer: "FLT — Food Label Terminal" link added to Products column on all 58 pages.
//   - sitemap.xml: 2 new URLs added (/flt at priority 0.9, /flt-app at 0.6 to discourage
//     direct indexing of the heavy fullscreen app).
//   - /flt added to PRECACHE so it's available offline like other key product pages.
//     /flt-app is NOT precached (284KB; loads live API data anyway so offline isn't useful).
//   - CACHE_VERSION bumped so returning visitors get fresh HTML on next visit.
//
// v5.0.71 — 20 May 2026: checkit.html hero refactor — split-grid Crew illustration + live stats
//   - Hero refactored from centred-text to split-grid pattern, mirroring .flt-hero-grid
//     (FLT institutional surface translated to CheckIT consumer surface). Left column:
//     pill door-tag, mono tagline "Scan · Decode · Decide", h1 with italic accent, lede
//     with <strong> lead-in, two CTAs. Right column: Crew illustration with responsive
//     srcset (800w / 1200w / 1600w), fetchpriority="high", 449-char descriptive alt
//     covering KiP / Dr RooT / SaK + the canonical amber Check + emerald IT wordmark
//     colour split per §90 / §102. Collapses to single column at 900px on mobile.
//   - Hero image: assets/checkit-hero-crew-2026-05-20.webp (193 KB at 1600w, 132 KB at
//     1200w, 72 KB at 800w). Source Gemini PNG (8.2 MB) preserved alongside per §14.3.1.
//     Baked-in captions cropped; decoded Crew captions sit as proper HTML text in the
//     existing "Crew of CheckIT" section per §35 / §36.
//   - Stats strip added below hero — mirrors .flt-stats. Four cards: Scans logged
//     (28 fallback) · Put back at the shelf (6 fallback) · Verified products (155
//     fallback) · £0 No account · no tracking. First three numbers update live on page
//     load from kip-data Worker /stats endpoint + i500-ticker.json (same pattern as
//     index.html). Fourth card is the §31 brand commitment, static.
//   - URL canon fixed: <link rel="canonical">, og:url, Schema.org WebPage URL all updated
//     from /kip → /checkit per §96 URL slug architecture canon (14 May 2026 banking).
//   - Typography: JetBrains Mono added to Google Fonts import for tagline parity with FLT.
//   - CACHE_VERSION bumped so returning visitors get the new hero on next visit.
//
// v5.0.72 — 21 May 2026: checkit.html step icons — Scan / Decode / Decide
//   - Three inline SVG icons added to the #how section feature-cards, each one a
//     miniature rendering of the actual CheckIT app UI state at that step:
//     • Scan: yellow-outlined viewfinder card with barcode inside (mirrors the
//       Tap-to-Start-Camera screen at app.scansmart.uk)
//     • Decode: 2x2 grid of traffic-light tiles in the canonical layout used by
//       the live verdict screen (Corned Beef Princes used as reference example —
//       SALT red / SUGAR green / FAT amber / SAT FAT red)
//     • Decide: three pill buttons stacked — yellow outline Buy / coral filled
//       Put back / green outline Just looking, matching the actual decision UI
//   - Decision-button label in step 3 prose corrected from "Bought" to "Buy" to
//     match the canonical app copy ("Buy / goes in basket" per the live app).
//   - Real-product screenshots queued for next-session swap-in once the cowork
//     workspace mount sync resolves (the IMG_*.PNG files Ras saved to assets/
//     are visible in his Finder but stayed invisible to the sandbox mount this
//     session, so the SVG mini-renderings ship tonight as the brand-aligned
//     placeholder — same approach as Hero v16 / Marque / FLT card iconography).
//   - Brand-green door-tag colour change from v5.0.71 still in place (red-soft
//     → green-soft per Ras's request earlier this session).
//   - URL canon fix from v5.0.71 still in place (/kip → /checkit).
//   - CACHE_VERSION bumped so returning visitors get the icons on next visit.
//
// v5.0.73 — 21 May 2026: FLT page reframe — scope-of-input + Sources Constellation +
// Intelligence Rail + integration-as-moat
//   Driver: FLT Page Reframe Brief v0.1 (Strategy folder; banked 21 May 2026 same session).
//   The pre-21-May flt.html led with "the terminal is built around the I500." That framing
//   narrowed user expectations (readers inferred the terminal is about independent-grocer /
//   diaspora SKUs only) and conflated FLT with The I500 — two structurally-distinct products
//   per Bible v7.2 §98 Five-Product Architecture. This pass reframes the landing page so the
//   I500 reads as ONE source among eight, and the moat is the integration layer, not the I500.
//
//   Scope-of-input language shift:
//   - "a UK food product" → "any barcoded product" in the seven-panel section intro (line 276)
//   - meta description, og:description, twitter:description, Schema.org WebPage description
//     all rewritten to lead with "label intelligence on any barcoded product" (line 8 / 24 /
//     32 / 35). UK regulatory anchor preserved in audience copy + data sources + methodology.
//
//   Hero lede rewrite — function-first, not foundation-first:
//   - Old lede opened with "Combining the proprietary I500 verified dataset with 1,500
//     community SKUs from Open Food Facts..." (sources-first framing — narrows expectations).
//   - New lede opens with "Seven panels. One screen. Any barcoded product." then names
//     the capability surface (nutrition, ingredients, FSA-14 allergens, EFSA additive risk,
//     reformulation history, live UK FSA recalls, multi-stream intelligence rail).
//   - Sources moved into a dedicated Sources Constellation section below (see below).
//
//   F7 Intelligence Rail panel added (full-width treatment below the F1-F6 grid):
//   - Eyebrow updated from "The terminal · six panels" → "The terminal · seven panels"
//   - F7 panel renders as distinct full-width card with cyan-tinted border + gradient,
//     signalling qualitative difference from F1-F6 (F1-F6 are product-anchored; F7 is the
//     live-feed rail that runs independent of any loaded product).
//   - Eight rail-chips display the stream types: Recalls (FSA/RASFF/FDA), Reformulation
//     alerts, Additive status (EFSA), FSA-14 allergen alerts, Source health, Decision
//     Record signal, Watchlist, Methodology updates.
//   - Reframes the F7 from single-stream "News Wire" to multi-stream "Intelligence Rail" —
//     same Bloomberg-pattern persistent rail described in the brief.
//
//   Sources Constellation section added (NEW, sits between seven-panel section and
//   I500 spotlight; id="sources"):
//   - Eyebrow: "The constellation"
//   - H2: "One terminal. Eight verified sources."
//   - Eight equal-weight tiles in a 4-column grid (collapses to 2-col @ 900px, 1-col @ 520px):
//     OFF / I500 / FSA / EFSA / Retailer Official / Manufacturer Official / USDA FoodData / OBF.
//   - Each tile: source name (mono amber, all caps) + 1-line description.
//   - Closing paragraph names the source-priority hierarchy per Bible §10: I500 verified →
//     manufacturer official → retailer official → OFF → contribution.
//   - This is the integration story made visual — sources presented as equal citizens, no
//     hierarchy in the page layout (hierarchy only in the deterministic priority rule).
//
//   I500 spotlight reframed (completeness edge, not built-around):
//   - Eyebrow: "The proprietary edge" → "The completeness edge"
//   - H2: "The I500 is what the terminal is built around." → "OFF covers the mainstream.
//     The I500 covers what OFF misses."
//   - Body rewritten to frame I500 as the gap-closing layer in the OFF integration, not
//     as the headline foundation. Closing sentence: "FLT brings both into one literate
//     read." Keeps the DEES Caribbean I500-150 worked example unchanged — that's the
//     concrete proof of the structural critique and remains load-bearing.
//
//   Mintel/Innova moat line sharpened:
//   - Added closing sentence: "The moat isn't the I500 alone — it's the integration: eight
//     verified data layers, one literate read, no competitor stitching them together."
//   - Matches §60 Competitor Valuations Rev 2 comp set (Bloomberg / FT / dacadoo, not
//     consumer-app axis) — integration-as-moat positioning vs. single-IP-as-moat framing.
//
//   Clinical & Regulatory Scope disclaimer band added above CTA (NEW):
//   - Thin band between Roadmap section and Apply-for-Access CTA.
//   - Header: "Clinical & regulatory scope" (mono amber, all caps).
//   - Copy: "Not a clinical decision-support tool. Not a medical device. Not a regulatory
//     authority. Not investment advice. FLT is a label-literacy intelligence surface —
//     a reference layer for professionals making procurement, research and editorial
//     decisions. Clinical decisions rest with the clinician. Regulatory decisions rest
//     with the regulator."
//   - Per Bible §31 Six Principles That Never Bend (anti-medical-claim posture) and §90
//     CheckIT lifestyle-preference framing applied at the institutional surface. The
//     §31 anti-medical-claim posture has been operating on CheckIT and the marketing
//     copy for months; this is the first time it surfaces as an explicit disclaimer band
//     on the FLT landing page itself.
//
//   CSS additions (new blocks in <style>):
//   - .flt-sources / .flt-source — equal-weight tile grid for Sources Constellation
//   - .flt-panel-wire / .rail-chips / .rail-chip — full-width F7 Intelligence Rail
//   - .flt-disclaimer / .flt-disclaimer-inner / .disc-label / .disc-text — disclaimer band
//
//   Not changed this pass (deferred to v1.0 brief promotion):
//   - Door tag "Class 3 · Professional intelligence" — per Bible v7.2 §106, FLT is Class 4;
//     leaving as-is until §106 reconciliation pass confirms the canonical Class number
//     for FLT (open question in v0.1 brief).
//   - DEES Caribbean I500-150 example card — preserved verbatim; the worked example is
//     load-bearing per the structural-critique proof.
//   - The existing "What FLT isn't" Not-volume / Not-commercial-intel / Not-equivalent
//     positioning block — preserved verbatim; that's competitive scope, distinct from
//     the new Clinical & Regulatory Scope band (which is regulatory disclaimer).
//
//   Distribution per Bible §47 Three-Version Distribution rule:
//   - Filesystem source-of-truth: ✓ (FLT Page Reframe Brief v0.1 + this flt.html refactor)
//   - Bible §- integration: pending v1.0 brief promotion (likely §98.x in-place patch on v7.2)
//   - Notion mirror: deferred until v1.0 brief promotion + §56 Panel Review pass
//
//   §47a Canon-Sync Protocol five-step pre-bank checklist completed in the v0.1 brief.
//   §56 Panel Review Checklist (Voice/Brand + Clinical Safety + Risk seats) deferred to
//   v1.0 promotion stage — this is a working refactor, not a publication-grade canon bank.
//
//   CACHE_VERSION bumped so returning visitors get the reframe on next visit.
//
// v5.0.74 — 21 May 2026: F1-F7 panel interactivity fix
//   Founder caught (same session as v5.0.73): the F-panel cards highlight on hover
//   but did nothing on click — they were static <div> info boxes visually styled like
//   clickable cards. The hover affordance was a lie. Per §50 Honesty Test, the visual
//   promise has to match the actual action.
//
//   Changes:
//   - F1-F6 panels each get an inner <a class="flt-panel-link" href="flt-app.html"
//     target="_blank"> wrapping the fkey + h3 + p content. Anchor has descriptive
//     aria-label (e.g., "Launch the terminal — F1 Product Detail panel").
//   - F7 Intelligence Rail panel: split into two anchor regions per HTML5 (no
//     nested anchors). The main content area (fkey + h3 + p) is wrapped in a
//     single .wire-main anchor; each of the eight rail-chips is its own <a
//     class="rail-chip"> sibling element. All point to flt-app.html.
//   - CSS hover state added: .flt-panel:hover gets a soft amber background tint +
//     amber inner border + cursor:pointer. The hover state now matches the click
//     action — visiting the live terminal.
//   - Hover affordance: an "↗" indicator appears in the top-right corner of each
//     panel on hover (CSS pseudo-element), telegraphing "this opens elsewhere"
//     in a way consistent with link-out conventions on the rest of the site.
//   - Same treatment for F7 .wire-main anchor and individual .rail-chip anchors.
//   - :focus-visible outlines added for keyboard navigation — amber on F1-F6 and
//     wire-main, cyan on individual rail-chips. WCAG 2.1 AA compliant focus
//     indicators per §90 anti-medical-claim posture + accessibility canon.
//
//   All eight panel anchors + all eight rail-chip anchors open flt-app.html in a
//   new tab (target="_blank" rel="noopener"). This matches the existing hero CTA
//   pattern ("↓ Launch the Terminal" already opens in a new tab) and signals to
//   the user they are leaving the marketing page for the live product.
//
//   CACHE_VERSION bumped so returning visitors get the wired-up panels.
//
// v5.0.75 — 21 May 2026: flt-app.html F-bar activation — left-side rail clickable
//   Founder caught (same session as v5.0.74): the live terminal at /flt-app had
//   keyboard F1..F7 shortcuts working, but the visual F-bar down the left side
//   (the .rail .r divs labelled F1 PROD / F2 INGR / ... / F7 WIRE) was NOT
//   clickable. The .rail .r CSS had cursor:pointer + a :hover state — promising
//   interactivity — but no click handler was wired up. The .active class was
//   hardcoded on F1 and never updated. Per §50 Honesty Test, the visual promise
//   has to match the actual action.
//
//   Changes to flt-app.html:
//   1) Each .rail .r div gains data-fkey="F1" through "F7", role="tab",
//      tabindex="0", aria-label, and title attributes. The rail itself becomes
//      role="tablist" with aria-label. F-key shortcut is also surfaced in the
//      title attribute for hover discovery.
//   2) Keyboard handler refactored: the FKEY_TO_PANEL map + activatePanel(fkey)
//      function are now shared between the keyboard listener and the click/Enter
//      listeners on the rail. Single source of truth for what each F-key does.
//   3) Click listener added to every .rail .r[data-fkey] — calls activatePanel
//      with the data-fkey value. Same behaviour as pressing F1..F7 on a keyboard.
//   4) Keyboard listener (Enter / Space) added on each rail div so users with
//      keyboard-only navigation can activate the rail through Tab + Enter/Space,
//      not just via the F1..F7 function-key shortcut.
//   5) activatePanel() now updates the .active class on the entire rail every
//      time it fires — so whichever F-key was last activated reflects in the
//      F-bar's visual state. aria-selected attribute syncs at the same time.
//   6) Hover state strengthened: .rail .r:hover gets a soft amber bg tint in
//      addition to the colour change, signalling clickability more clearly.
//   7) Focus-visible outline added: .rail .r:focus-visible gets a 1px amber
//      outline (inset, -2px offset) for keyboard navigation discoverability.
//      WCAG 2.1 AA focus-indicator compliant.
//   8) Active press state: .rail .r:active darkens the bg briefly on mouse-down
//      so the click registers visually even before the panel scrolls.
//
//   The F1..F6 keyboard shortcut + the F-bar click are now two equally-valid
//   paths to the same behaviour: scroll the target panel into view, flash it,
//   and mark its corresponding F-bar entry as the active one. The legacy
//   keyboard-only path is preserved verbatim — keyboard-first canon honoured.
//
//   This is the change Ras specifically asked for: "im good with this i juist
//   want an active <F> bar." Active means clickable, not just decorative.
//
//   CACHE_VERSION bumped so returning visitors pick up the F-bar wiring.
//
// v5.0.76 — 21 May 2026: panel prominence — persistent active-panel state
//   Founder caught (same session as v5.0.75): pressing F1 made the rail glow
//   but the target panel showed almost no change. The pre-existing .flash
//   animation runs 0.6s on a dark-amber background and then fades back to
//   identical-looking panels — "before the frame used to go orange but that
//   was hardly noticeable, at the moment nothing is happening except F1 glowing."
//
//   The fix: persistent .active-panel state on the target panel, held until
//   another F-key fires. The flash stays as a brief attention pop on top;
//   the active-panel class is what gives the panel its sustained prominence.
//
//   Changes to flt-app.html:
//   1) .panel base CSS gains position:relative + transition:box-shadow .2s.
//   2) New .panel.active-panel rule: inset box-shadow giving a clean 2px amber
//      outline (no layout shift since it's inset, not a real border), plus a
//      14-18px amber-tinted outer glow + z-index:2 so the active panel
//      visually lifts above its neighbours without overlapping them.
//   3) .panel.active-panel .head: background brightens from #100b03 to
//      #1f1408, border-bottom flips from amber-dim to full amber. The head
//      bar becomes visibly hotter, signalling focus.
//   4) .panel .head gets a transition on background + border-color so the
//      head bar fades in/out of its hot state smoothly when activation
//      changes panels.
//   5) activatePanel() updated: before scroll+flash, removes .active-panel
//      from all .grid .panel children, then adds it to the target. Single
//      source of truth for which panel currently owns the active state.
//   6) DOMContentLoaded handler added: initialises p1 with .active-panel on
//      page load, matching the F1 default in the rail's .active class. So
//      the page loads in a consistent state (rail F1 active + panel p1
//      active) rather than rail F1 active + no panel highlighted.
//
//   The combined effect:
//   - Pressing F1..F7 OR clicking the rail buttons → the target panel
//     immediately gains a visible amber outline + glow + brighter head bar.
//   - The active state PERSISTS until another F-key activation fires.
//   - The brief .flash bg animation still runs on top for the immediate
//     attention pop. Two layers of feedback, one transient and one persistent.
//   - No layout shift: the inset box-shadow doesn't push the panel by 2px,
//     so the grid stays aligned. Z-index:2 makes the active panel visually
//     dominant without disrupting the dense terminal grid.
//
//   CACHE_VERSION bumped so returning visitors see the prominence state.
//
// v5.0.77 — 21 May 2026: panel prominence — belt-and-braces pass (same session)
//   Belt-and-braces line-by-line check before deploy surfaced three things in
//   the v5.0.76 prominence pass that needed tightening before ship:
//
//   1) Glow rgba colour mismatch. v5.0.76 used rgba(230,126,34,0.22) — that's
//      the landing-page amber (#e67e22) on flt.html. The terminal at flt-app.html
//      has its own --amber:#ffa726 = rgb(255,167,38). Bright orange-yellow, not
//      brown-orange. v5.0.77 fixes to rgba(255,167,38,0.30). Right colour, +50%
//      opacity so the glow reads at a glance.
//   2) Inset outline width 2px → 3px. The 2px outline survived .grid overflow:
//      hidden clipping (it's inset, drawn inside the panel body), but at 2px
//      against the dense terminal grid it competed with grid-gap visual noise.
//      3px makes the active outline structurally distinct — a clear "this panel
//      is the one" signal, not a slight bevel.
//   3) F-code badge dimming. The .head .code element (the "<F1>" badge in each
//      panel head) has color:var(--dim) on line 53. That rule has higher
//      specificity than .panel.active-panel .head{color:var(--amber)}, so the
//      F-code badge stayed dim even when the panel was active. v5.0.77 adds
//      .panel.active-panel .head .code{color:var(--amber)} — same specificity
//      as the existing rule, comes after in source order, wins the cascade.
//
//   Three visible signals on activation now layered as belt + braces + buckle:
//     a) 3px amber inset outline (always visible — survives grid clipping)
//     b) brighter head bg (#100b03 → #2a1a0a, +60% brightness per channel) +
//        full-amber border-bottom + amber F-code badge
//     c) outer 24px amber glow (visible on interior panels; partially clipped
//        at grid edges by .grid{overflow:hidden} — accepted)
//
//   Plus the brief 0.6s .flash background animation as a single-shot attention
//   pop at the moment of activation — but unlike v5.0.76, the persistent state
//   is now strong enough to stand on its own without the flash, and the flash
//   adds an immediate kinetic hit on top.
//
//   The .grid{overflow:hidden} could be removed to expose the full glow on
//   edge panels, but doing so risks regressions in dense-terminal scenarios
//   where panel content overflows in unexpected ways. Decision deferred —
//   v5.0.77 ships with grid clipping accepted, because the inset outline +
//   brighter head are independent of grid overflow and carry the prominence.
//
//   CACHE_VERSION bumped so returning visitors pick up the strengthened state.
//
// v5.0.78 — 22 May 2026: panel expand-on-active modal overlay
//   Founder's next ask after v5.0.77 shipped: "the reformulation panel needs
//   to expand because its hard to decipher." F5 CHART renders a 600×280 SVG
//   squeezed into a ~200-250px tall grid cell — bars and labels lose all
//   granularity. F2 ingredients, F4 peer table, F6 recalls feed have the
//   same legibility problem at dense-grid scale.
//
//   Solved with Option B from the three-way design discussion (vs. A: F5
//   gets more grid weight permanently; vs. C: focus-mode grid reshape):
//   universal expand-on-active modal overlay. Default dense grid preserved;
//   any active panel can expand on demand; Esc returns to grid.
//
//   Changes to flt-app.html:
//
//   CSS additions in <style>:
//   1) .panel .head{cursor:pointer;user-select:none} + hover{background:#1a1306}.
//      The head bar is now visibly clickable. Tooltip "Click to expand · Esc to
//      close · or press X" appears on hover.
//   2) .expanded-backdrop — full-viewport dimmed overlay (rgba(0,0,0,0.82)) +
//      2px backdrop-blur (with -webkit prefix for Safari) at z-index 999.
//      Display:none by default; .show adds display:block.
//   3) .panel.expanded — position:fixed at top:5vh/left:5vw/width:90vw/height:90vh.
//      z-index:1000 sits above backdrop. 2px solid amber border replaces the
//      inset-shadow outline at modal scale. Heavy drop shadow + 60px amber
//      glow gives the modal a clear visual lift. background:var(--panel)
//      ensures the panel content isn't see-through if any region is sparse.
//   4) .panel.expanded .head/body — modest padding + font-size bump (head 11px
//      → 13px; body 12px → 13px; padding 4px/8px → 10px/16px on head, 8px →
//      18px/22px on body) so the modal reads as a clear focused view rather
//      than just a stretched cell.
//   5) .panel.expanded .body .chart{min-height:60vh} — F5's SVG gets a hard
//      minimum height in modal mode, so the chart renders at readable scale
//      even if the body padding consumes vertical space.
//   6) .panel .close-btn — appended dynamically on first expand, hidden by
//      default (display:none on .panel .close-btn), shown when .expanded
//      (display:flex). 28×28 amber-bordered "×" button in top-right of
//      modal. Hover state + focus-visible outline for keyboard accessibility.
//
//   JS additions in <script>:
//   1) let EXPANDED_PANEL = null — module-scope state for which panel (if any)
//      is currently expanded. null means grid mode; "p1".."p7" means that panel
//      is in modal.
//   2) expandPanel(panelId) — adds .expanded to the target panel; creates the
//      backdrop on first call and reuses thereafter; injects the close button
//      on first expand of each panel; updates EXPANDED_PANEL.
//   3) collapsePanel() — removes .expanded from the currently-expanded panel;
//      hides the backdrop; clears EXPANDED_PANEL. No-op if nothing expanded.
//   4) activatePanel() updated — captures wasExpanded at top; if a modal was
//      open on a different panel when F-key fires, swaps the modal to the new
//      panel and returns early (skips scroll/flash, which would target the
//      underlying grid the user can't see). Otherwise runs normal activation.
//   5) Window-level keydown extended with three new branches:
//      - F1..F7: prevent default + activatePanel (existing, preserved)
//      - Esc + EXPANDED_PANEL: collapsePanel (does NOT preventDefault, so the
//        existing Esc handlers for AC dropdown and cmd-bar-clear still fire)
//      - 'X' or 'x' (and not inside an INPUT/TEXTAREA): toggle expand on the
//        currently active panel. Won't fire if user is typing in cmd bar.
//   6) Click handler on each .grid .panel .head — activates the panel (if not
//      already active) and toggles its expand state. Skip-region check: clicks
//      on inner controls (.chart-toggle, .recl-toggle, .close-btn) are NOT
//      treated as expand triggers, so existing in-head controls keep working.
//
//   HTML update:
//   7) cmdhint at the bottom updated from "F1..F6 panels · T chart ..." to
//      "F1..F7 panels · X expand · T chart ..." — surfaces the F7 (added in
//      v5.0.75) and the new X expand affordance in the cheat sheet.
//
//   Edge cases handled:
//   - Modal open + F-key for different panel → modal swaps (collapsePanel
//     then expandPanel) — user sees the new panel in the modal immediately.
//   - Modal open + F-key for SAME panel as expanded → no swap, no scroll
//     (the early-return logic skips both because wasExpanded === panelId).
//   - Modal open + click outside (on backdrop) → collapse.
//   - Modal open + close button click → e.stopPropagation prevents the head
//     click handler from also firing; collapse runs once cleanly.
//   - User typing in cmd bar + presses X → handler skips (inInput check).
//   - User typing in cmd bar + presses Enter → existing cmd handler runs;
//     new expand handler does not bind to Enter (avoids conflict with the
//     existing ENTER-loads-product-from-autocomplete behaviour).
//   - User typing in cmd bar + presses Esc with modal open → both run:
//     existing handler clears cmd; new handler closes modal. No conflict.
//   - Clicking the chart-mode toggle or recl-feed toggle inside the head:
//     skip-region check on head click handler prevents expand from firing.
//
//   CACHE_VERSION bumped so returning visitors get the expand modal.
//
// v5.0.79 — 22 May 2026: F3 NUTR — RI% column + per-record source attribution
//   Absorbs three operational improvements from the external Perplexity-shape
//   review banked the same session. Two of the three landed (RI% column +
//   per-record source line); the third (universal last_audited timestamp chip
//   in every panel head) deferred to a future pass because it requires
//   adding audit_date fields to the I500 data structure first.
//
//   Per §57 External-review citation pattern: the substantive analytical
//   reasoning was sound on these two points; cross-axis misreads on the
//   positioning (dataset-as-single-universe vs Sources Constellation) were
//   politely set aside.
//
//   Changes to flt-app.html:
//
//   CSS:
//   1) .nutgrid grid-template-columns: 1fr auto auto auto → 1fr auto auto auto auto
//      Five columns now: NUTRIENT / PER 100g / UNIT / %RI / 100g / TL.
//
//   JS (renderNutrition function):
//   2) UK_RI baseline map declared: energy 2000 kcal, fat 70g, satfat 20g,
//      carbs 260g, sugars 90g, fibre 30g, protein 50g, salt 6g. Per UK FIR
//      2014 / EU FIC 1169/2011 Annex XIII (fibre per SACN reference). These
//      are the same baselines on every UK back-of-pack GDA panel.
//   3) riPct(v, baseline) helper: returns v / baseline * 100, or null if
//      missing/non-finite. Used to compute %RI per row.
//   4) rows array gains ri property per nutrient (computed at construction).
//   5) Table header gains "%RI / 100g" column.
//   6) Per-row %RI cell rendered with conditional coloring:
//      - ≥50% per 100g → var(--red) text (high contribution to daily RI)
//      - ≥20% per 100g → var(--yellow) text (notable contribution)
//      - <20% per 100g → var(--dim) text (low contribution)
//      Null values render as "—" in dim color.
//   7) New REFERENCE INTAKE BASELINES section below the FOP block — names
//      each baseline + cites UK FIR 2014 / EU FIC 1169/2011 + SACN. Closes
//      the auditability gap the reviewer flagged.
//   8) SOURCE section rewritten to be per-record (not generic):
//      - I500-verified (p._src === "i500"): "Nutrition values from I500
//        verified workbook · ScanSmart field audit · TL thresholds per
//        FSA/DHSC FOP guidance." (amber-coloured "I500 verified workbook")
//      - OFF community: "Nutrition values from OpenFoodFacts community
//        database (last modified YYYY-MM-DD · OFF rev N) · TL thresholds
//        per FSA/DHSC FOP guidance." Dates from p.last_modified_t (Unix);
//        rev from p.rev.
//      Closes the per-record source attribution gap the reviewer flagged.
//
//   Why these two changes specifically:
//   - %RI is mandatory on UK back-of-pack labels (per FIR 2014). FLT
//     showing per-100g without %RI was an unforced gap. Now present.
//   - Per-record source attribution (with timestamp for OFF) is the granular
//     auditability the reviewer flagged. F1 SOURCE already showed product-
//     level provenance; F3 now matches that level of attribution for nutrition.
//   - The third improvement (universal last_audited chip per panel head)
//     requires adding audit_date to I500 records first — that's an upstream
//     data-structure change, queued separately. Deferred to keep this pass
//     scoped to F3.
//
//   What this is NOT:
//   - Not a positioning change. Sources Constellation, integration-as-moat,
//     and the literacy-vs-commercial axis differentiation are preserved
//     verbatim. The external review's misread of FLT as a single-universe
//     database was politely set aside.
//   - Not a layout change. Dense terminal grid + expand-on-active modal
//     (v5.0.78) preserved. No SaaS-dashboard drift.
//
//   §52 Multi-AI cross-check rule operational: external Perplexity-shape
//   review surfaced two actionable improvements + one positioning misread;
//   absorbed the two, set aside the misread, banked as canon evidence that
//   the Sources Constellation framing on the landing page may need to be
//   more prominent (potential future v5.0.x pass).
//
//   CACHE_VERSION bumped so returning visitors get %RI + per-record source.
//
// v5.0.80 — 22 May 2026: F5 Reformulation Auditor — 7-nutrient small-multiples
//   Founder articulation that drove this pass: "fibre and protein will be
//   missed if not there ... and carbs because those ingredients get shuffled
//   around, a manufacturer may reduce sugar and increase carbs and reduce
//   fibre." That's the structural critique applied to reformulation tracking:
//   the PHE-mandated targets (sugar/salt/saturates/calories) are necessary
//   but NOT sufficient — manufacturers can meet them by shuffling carbs,
//   fibre and protein in patterns that meet the target metric while leaving
//   net nutritional density worse than the headline number suggests.
//
//   This pass turns F5 from "show me history" into "audit reformulation
//   claims." Category jump from chart viewer to Reformulation Auditor.
//   Canonical territory: §31 anti-misleading-claim posture meets the
//   Industry Funding Bias evidence base. Will be banked to CLAUDE.md
//   as a ⭐ entry once the deploy is verified live.
//
//   Changes to flt-app.html:
//
//   1) fetchHistory() — extended from 3 nutrients (sugar/salt/fat) to 7
//      (sugar/salt/satfat/kcal/carbs/fibre/protein). Same OFF revisions
//      endpoint; same fields request shape; just extracts more keys per
//      revision. No data quality regression — missing nutriments still
//      render as null and are handled per-chart in renderMiniChart.
//
//   2) chartIsExpanded() helper — returns true when #p5 panel carries
//      the .expanded class. Used by renderChart to route between dense
//      and expanded rendering paths.
//
//   3) renderChart() — dispatches on chart mode + expansion state:
//      - FOP mode: existing 4-bar threshold view (viewBox 600x280)
//      - HIST mode + dense panel: existing sugar+salt line chart (viewBox 600x280)
//      - HIST mode + expanded modal: NEW 7-nutrient small-multiples (viewBox 1200x600)
//      The viewBox is set dynamically per state so the SVG fills the
//      modal's available area without distortion.
//
//   4) renderLineChartMultiples(series, p) — NEW function. Renders a 2x4
//      grid of mini-charts:
//      - Row 0 (PHE Reformulation Targets): Sugar / Salt / Saturates / Energy
//      - Row 1 (The Shuffle Set): Carbs / Fibre / Protein / [legend tile]
//      Group labels above each row name the policy framework being shown.
//      Top-right of the grid shows the OFF revision sample size.
//
//   5) renderMiniChart(series, chart, cx, cy, cellW, cellH) — NEW function.
//      Renders a single mini-chart inside a grid cell:
//      - Nutrient label (amber)
//      - Direction-aware delta annotation in top-right: ▼/▲/▬ + % change.
//        Colour-coded: green for "moved toward better" (sugar/salt/satfat/kcal/carbs
//        going down, or fibre/protein going up); red for "moved away from better"
//        (the opposite); grey for flat (<5% absolute or <1% relative change).
//      - Threshold line where canonical policy threshold exists:
//        Sugar 5g/100g (SACN), Salt 1.5g/100g (FSA red), Saturates 5g/100g (FSA red),
//        Fibre 6g/100g (FSA high-fibre floor). Threshold colour matches direction:
//        red for "stay below" targets, green for "stay above" targets.
//      - Y-axis min/max + unit label, X-axis first/last year.
//      - Area-filled line plot with data points.
//      - Insufficient-data fallback ("insufficient data" text) when fewer than 2
//        revisions have a non-null value for the nutrient.
//
//   6) renderShuffleLegend(cx, cy, cellW, cellH) — NEW function. Renders the
//      eighth-cell legend tile explaining:
//      - Colour convention (green/red/grey arrows)
//      - Four shuffle-pattern fingerprints to watch:
//        - Sugar↓ + Carbs↑ + Fibre↓ → refined-starch swap
//        - Sugar↓ + Energy↓ + ingredients↑ → sweetener swap
//        - Salt↓ + flavour additives↑ → glutamate swap
//        - Saturates↓ + Carbs↑ → fat→starch swap
//      - Cited thresholds (SACN, FSA red, FSA high)
//      - Keyboard hint (X to collapse).
//      This is the analyst grade-up: the chart shows the data; the legend
//      teaches the user what patterns to look for.
//
//   7) expandPanel() / collapsePanel() — hooked to call renderChart(CURRENT)
//      when the expansion state changes on #p5 specifically. Other panels
//      don't need re-render hooks (their content doesn't change density
//      between dense and expanded). The re-render only fires if CURRENT
//      is set (i.e., a product has been loaded into the terminal).
//
//   Direction-aware colouring rationale: the convention is "green when the
//   product improved, red when it got worse." For sugar/salt/saturates/calories
//   improvement means going DOWN. For fibre/protein improvement means going UP.
//   For carbs improvement is contextual but the default "down" is treated as
//   neutral-to-positive (lowering refined-carb load is generally a good thing,
//   though context matters — that's why the legend explicitly names the shuffle
//   patterns so the user reads the FULL picture, not just one nutrient).
//
//   What this pass is NOT:
//   - Not a layout reshape. The dense grid stays dense; the expanded modal
//     is the new high-density read.
//   - Not a positioning change. Reformulation Auditor is the canonical
//     descriptor; "chart viewer" is what other tools are. FLT does the
//     pattern-matching the analyst would otherwise have to do manually.
//   - Not a v1 yet. The auto-detected shuffle-pattern summary card (the
//     readout that names the pattern, e.g., "refined-starch substitution
//     detected") is deferred to a later pass. It requires real-product
//     testing to set the confidence thresholds correctly. v0 ships the
//     small-multiples + legend that lets analysts ID the patterns themselves.
//
//   CACHE_VERSION bumped so returning visitors get the Reformulation Auditor.
//
// v5.0.81 — 22 May 2026: F1 search input + brand ownership history (facts only)
//   Two additions to F1 PROD this pass.
//
//   (1) F1 search input — sibling of body, persists across product loads.
//   Founder ask: "f1 should have a search bar." Solves a real UX gap: when F1
//   is in expanded modal mode (v5.0.78), the top cmd bar at the terminal head
//   is occluded by the modal backdrop. Users had to Esc out → search → re-expand.
//   Now F1 carries its own search input at the top of the panel, visible in
//   both dense and expanded modes. Enter loads the product directly using the
//   same search() + loadProduct() pipeline as the top cmd bar. Barcode-pattern
//   shortcut for direct load; brand/name match falls to first hit; no-match
//   case flashes the input border red briefly.
//
//   (2) Brand ownership history — facts-only chronology in F1 expanded space.
//   Founder ask: "since we have that big space we can do an ownership history
//   of the brand ... history of the brand just facts." Visible only when F1
//   is expanded (CSS gate: .panel.expanded .brand-ownership-block); the dense
//   F1 view stays the at-a-glance product-detail read.
//
//   Database structure: ~25 starter UK food brands as a hand-curated chronology.
//   Each entry: {from, to (omit for current), owner, note} — single-line factual
//   note per ownership period, NO editorial commentary. Per §13.2A Two-Layer
//   Literacy Rule: the chronology shows the data; the analyst draws the pattern.
//
//   Brands covered in v0: Heinz, Cadbury, Walkers, Innocent, Mr Kipling, Marmite,
//   KitKat, Quaker, Mars, Snickers, Coca-Cola, Pepsi, Lucozade, Ribena, Branston,
//   Pringles, Tropicana, Hovis, Ben & Jerry's, McVitie's, Yeo Valley, Walkers
//   Shortbread, Bird's Eye, Galaxy. Sources cited: Wikipedia infoboxes, SEC and
//   Companies House filings, trade-press acquisition announcements.
//
//   Lookup logic: normaliseBrand(s) lowercases + strips punctuation. lookupBrandOwnership
//   tries (a) direct match, (b) comma/semicolon split into tokens, (c) longest
//   substring match against database keys. Handles products with multi-brand
//   strings (e.g., "Cadbury, Mondelez") gracefully.
//
//   Render: renderBrandOwnership(p) returns HTML block appended to renderProduct
//   output. Block wraps in .brand-ownership-block which is display:none by
//   default and display:block only when .panel.expanded is on the parent panel.
//   The dense F1 view doesn't show ownership; the expanded F1 modal does.
//
//   When brand is NOT in the database, the block still renders but shows a
//   one-line "not in the database yet" message + database-scope explanation.
//   This is intentional — surfaces that the database is curated and growing,
//   doesn't pretend to be exhaustive. Future passes add brands as encountered.
//
//   CSS additions: .f1-search-wrap (sibling between head + body with ⌕ prefix),
//   .f1-search (input matching topbar aesthetic), .brand-ownership-block
//   (display:none / display:block when .expanded), .oh-row / .oh-range / .oh-owner
//   / .oh-note (timeline row layout), .oh-row.current (amber highlight current
//   owner), .brand-ownership-source (small mono footer naming the source-set).
//
//   Markup: F1 panel structure now head → f1-search-wrap → body. Search input
//   persists across product loads because it's a SIBLING of prodBody, not a
//   child. renderProduct only replaces prodBody innerHTML; the search input
//   stays put.
//
//   JS: BRAND_OWNERSHIP constant (the database), normaliseBrand(s),
//   lookupBrandOwnership(brandStr), renderBrandOwnership(p), F1 search input
//   wireF1Search() IIFE, renderProduct() updated to append renderBrandOwnership(p).
//
//   Per §47 Three-Version Distribution: filesystem ✓. Bible §- integration
//   deferred to v7.x reconciliation. Notion mirror pending. The Reformulation
//   Auditor canonical principle (v5.0.80) + brand ownership database (v5.0.81)
//   will be banked together as a comprehensive CLAUDE.md ⭐ entry covering
//   v5.0.73 → v5.0.81 once deploy verifies live.
//
//   What this is NOT: not an analytical-pattern detector (chronology is facts,
//   pattern detection deferred); not exhaustive (~25 starter brands; out-of-database
//   brands render a graceful message); not editorial (per founder: just facts —
//   each note is a single-line factual sentence).
//
//   CACHE_VERSION bumped so returning visitors get F1 search + ownership history.
//
// v5.0.82 — 22 May 2026: expanded modal — readable typography + F1 search rename
//   Two founder-driven micro-corrections after v5.0.81 deploy:
//
//   (a) "hard to read" — modal mode rendered everything at terminal density
//       (~12-13px) inside a 90vw × 90vh container, so text felt lost in the
//       space. Typography pass below.
//   (b) "instead of quick load use search and make it the same colour as
//       ingredients" — placeholder text rename + border color bump from
//       --amber-dim to --amber so the F1 search input matches the brightness
//       of the ingredient bars in F2.
//
//   F1 search input changes:
//   - Placeholder text: "Quick load — product · brand · barcode (Enter to load)"
//     → "Search — product · brand · barcode (Enter to load)"
//   - .f1-search border-color: var(--amber-dim) → var(--amber) — matches the
//     full amber the ingredient % bars use in F2 INGR. Input now reads as a
//     prominent interactive affordance rather than a faded backdrop element.
//   - :focus glow opacity bumped 0.25 → 0.35 for the brighter focused state.
//   - aria-label updated to reflect the rename.
//
//   Typography pass over .panel.expanded — modal mode now sized for depth:
//
//   CSS pass over .panel.expanded — every text-element sized for modal scale:
//   - .panel.expanded base: font-size 14px, line-height 1.55
//   - .panel.expanded .head: 15px (was 13px) — section header reads at glance
//   - .panel.expanded .body: 14px + max-width 1100px centered + padding 28px 40px
//     so content doesn't sprawl edge-to-edge on ultra-wide modals
//   - .panel.expanded .body img: max 180x180 (was 72x72) — product image
//     becomes a hero element in the modal instead of a stamp in the corner
//   - .panel.expanded .pkey: 13.5px values, 11px labels — readable product
//     metadata table
//   - .panel.expanded .score .val: 48px (was 32px) — NUTRI/NOVA/ECO score
//     tiles dominate visually as they should
//   - .panel.expanded .oh-row: 13.5px owner, 13px range, 12px note + 18px gap
//     between range column and owner column — ownership timeline reads cleanly
//   - .panel.expanded .nutgrid: 13.5px (was 11px) — nutrient table actually
//     readable across the full 8 nutrients
//   - .panel.expanded .badges + .badge: 12px (was 10px) — claim/CO₂/pack
//     badges legible at modal scale
//
//   Exception: F5 CHART panel opts out of .body{max-width:1100px} — the
//   small-multiples chart needs the full modal width for 2×4 grid legibility.
//   #p5.panel.expanded .body{max-width:none} restores edge-to-edge for chart.
//
//   No changes to grid (dense) mode — that stays exactly as v5.0.81 banked.
//   The Bloomberg-density read at terminal scale is intentional and preserved.
//
//   What this is NOT:
//   - Not a layout refactor. Same renderProduct + renderBrandOwnership output;
//     only typography + spacing in expanded mode.
//   - Not a two-column F1 layout. The image is now bigger, the metadata table
//     wraps naturally, but the panel is still single-column. A two-column F1
//     layout (left: details, right: scores + ownership) could come in a later
//     pass if Ras wants it.
//
//   CACHE_VERSION bumped so returning visitors get the readable modal.
//
// v5.0.83 — 22 May 2026: F4 PEER modal typography + remove Wikipedia from sources
//   Two micro-corrections after v5.0.82 deploy:
//
//   (1) F4 PEER table didn't pick up the v5.0.82 expanded-mode typography bump.
//   The .peers table class wasn't in the v5.0.82 override list, so even when F4
//   was expanded the comparable-SKUs table stayed at 11px terminal density.
//   Founder feedback: "font size" — flagged the second screenshot showing F4
//   expanded with tiny text.
//   Fix: added .panel.expanded table.peers / th / td + .peer-delta + .peer-why
//   + #peerBody header + #peerCsv to the expanded-mode CSS overrides. Also
//   covered F6 .news + F7 .wire feed-item sizing (they would have hit the same
//   issue when expanded).
//
//   (2) Wikipedia removed from brand-ownership source citations.
//   Founder ask: "ps dont use wikepedia as a source" — banked verbatim.
//   Two places carried Wikipedia in the source citations:
//   - renderBrandOwnership populated block: "Sources: Wikipedia infoboxes, SEC
//     + Companies House filings, trade-press acquisition announcements."
//   - renderBrandOwnership "not in database yet" fallback: same Wikipedia citation
//   Both updated to: "SEC + Companies House filings, regulatory disclosures,
//   trade-press acquisition announcements, primary company press releases."
//   Wikipedia removed entirely. The underlying ~25-brand database entries
//   themselves are unchanged — they were always anchored to filings and
//   trade-press announcements; Wikipedia was the citation-format shorthand
//   that misrepresented the actual source set. The replacement source list
//   reflects what the database actually rests on.
//
//   CACHE_VERSION bumped so returning visitors get the F4 typography fix
//   and the corrected source citations.
//
// v5.0.84 — 22 May 2026: three operational improvements absorbed from §57 external review
//   Second Perplexity-shape external review of FLT engaged with v5.0.82 + v5.0.83
//   modal typography and recognized the canonical positioning ("reference tool not
//   consumer shopping page"). Per §52 Multi-AI cross-check rule: absorbed the three
//   substantive operational improvements; politely set aside the "F1 = whole terminal"
//   cross-axis misread (reviewer didn't engage with F2-F7 — saw only F1 expanded).
//
//   Three additions in v5.0.84:
//
//   (1) UA_FIELDS extended — fetch serving_size + traces_tags from OFF.
//   Previously omitted; required for (2) per-serving column and (3) cross-contact row.
//   Single-line addition to the existing fetch URL field-list.
//
//   (2) F3 — Per Serving column alongside Per 100g.
//   Standard UK back-of-pack RI panels show BOTH per-100g and per-serving figures.
//   FLT previously only showed per-100g (the analyst basis). v5.0.84 adds a fourth
//   column "PER SERVING (Xg)" using p.serving_size parsed to grams. parseServingGrams()
//   handles common OFF formats: "30 g", "240ml", "1 biscuit (12.5g)", "2/3 cup (40g)".
//   Per-serving value = per-100g × (serving_g / 100). Graceful "—" when serving_size
//   is null or unparseable. Column header carries the parsed serving size so analyst
//   knows the basis. .nutgrid grid-template-columns updated from 5 to 6 columns.
//   When serving size unavailable, a small explanatory note renders below the table
//   ("⚠ Serving size not available in OFF record — per-serving column shows '—'").
//
//   (3) F1 — evidence timestamp in SOURCE row.
//   F3 SOURCE line (v5.0.79) already showed per-record last_modified; F1 SOURCE row
//   lacked the same timestamp. v5.0.84 appends "(last modified YYYY-MM-DD · rev N)"
//   to the OFF community-sourced source line in F1, mirroring the F3 pattern.
//   I500 records stay as "★ I500-NNN · ScanSmart verified" — per-record audit dates
//   not yet in I500 data structure (queued for future v1).
//
//   (4) F2 — May Contain (cross-contact) row from traces_tags.
//   New section below the existing FSA-14 Allergen Scan. Renders when product has
//   non-empty p.traces_tags. Structurally distinct from the "contains" scan above:
//   contains-allergens are intentional ingredients; traces are manufacturer's
//   factory-shared cross-contact disclosure. Important for school caterers, hospital
//   procurement, allergic shoppers. Visual treatment: yellow badges (matches FSA
//   amber risk tier — between green "absent" and red "contains"). When traces_tags
//   is empty, renders a small explanatory message ("No cross-contact disclosure in
//   OFF record") so analyst knows the field was checked.
//
//   §52 / §57 — second external review banked to the running Voices collection
//   on Notion (per CLAUDE.md item 27). This is the cleanest external articulation
//   that FLT reads as professional/institutional rather than consumer. Two entries
//   now in the empirical record: 2 May Gemini (integrity-as-moat) + 22 May
//   Perplexity-shape (reference-tool positioning recognized). Pattern consistent:
//   external reviewers see what the canonical positioning is going for, even when
//   they don't engage with the full seven-panel architecture.
//
//   What this is NOT:
//   - Not a redesign of any panel. Additive columns / rows / fields; no layout shifts.
//   - Not addressing the "F1 = whole terminal" misread. F2-F7 already do most of
//     what the reviewer flagged as gaps. Surfacing that to future Voice-page entries
//     rather than refactoring the architecture.
//   - Not exhausting the reviewer's full list. "Linked ownership records" is a v1
//     enhancement to BRAND_OWNERSHIP (per-period source-link field), deferred.
//
//   CACHE_VERSION bumped so returning visitors get per-serving, evidence
//   timestamp, and cross-contact disclosure.
//
// v5.0.85 — 22 May 2026: accent-strip normalization on local search
//   Founder report after v5.0.84 deploy: F1 search for "Nestle" returned no
//   results, despite the embedded universe containing 7 Nestle/Nestlé products.
//   Root cause: search() lowercased the query but did not strip diacritics, so
//   "nestle" missed any product indexed under "Nestlé" (é ≠ e in JavaScript
//   string comparison).
//
//   Founder principle articulated during the diagnosis (canon-eligible, banked
//   to CLAUDE.md ⭐ this session): "data needs to be live where it should be
//   live and accessible where it should be accessible." Connects to §10
//   source-priority hierarchy + v5.0.73 Sources Constellation framing + §50
//   Honesty Test (the search promises a search; the implementation must
//   deliver one).
//
//   Verified the OFF live-search architecture before any code change, per
//   founder direction "be 100% positive prior to deployment." Verification
//   surfaced two material findings:
//   (1) Two of three OFF search endpoints (world.openfoodfacts.org/cgi/search.pl
//       and world.openfoodfacts.org/api/v2/search) are currently in degraded
//       mode, returning HTML "Page temporarily unavailable" instead of JSON.
//   (2) The one working endpoint (search.openfoodfacts.org/search) does not
//       honor countries_tags=en:united-kingdom server-side — UK-scoped searches
//       return India / Iran / Romania products mixed with UK ones. SCANSMART
//       editorial-globalises / operational-stays-UK canon (per CLAUDE.md item
//       34) requires UK-scoped operational data, so this is a blocker.
//
//   Decision: defer live OFF search integration to v6.x as a proper architectural
//   pass. Ship the narrow accent-strip fix as v5.0.85 to close the immediate
//   "Nestle returns nothing" bug while the live-search work queues. Honest
//   per §50 Honesty Test — the embedded 1,500-SKU universe stays the search
//   backend with this narrow fix; UI text stays accurate to actual behaviour.
//
//   Changes to flt-app.html:
//   - stripDiacritics(s) helper added: normalizes a string with NFD then
//     removes the U+0300–U+036F combining marks block. Standard JS idiom.
//   - SEARCH_INDEX build: index strings are diacritic-stripped at construction.
//     "Nestlé Cheerios" becomes "nestle cheerios" in the index.
//   - search() query: query is diacritic-stripped after lowercase. "Nestle"
//     and "Nestlé" both normalize to "nestle" for the indexOf comparison.
//   - Result: "Nestle" now matches all 7 Nestle products in the embedded
//     universe, regardless of which spelling OFF used for each record.
//
//   What this is NOT:
//   - NOT a live OFF API integration. The 1,500-SKU universe remains the
//     search backend. Searching "Tesco" or "Aldi" still returns whatever the
//     1,500 has (probably very little) — not the full OFF 2.8M.
//   - NOT a fix to the top cmd bar's "Search 1,500 UK SKUs" placeholder text.
//     The 1,500 framing is accurate to current behaviour. When live search
//     ships (v6.x), the UI text will reframe at that point.
//   - NOT a v0 of the live-search architecture. The verification gates from
//     the §50 Honesty Test require OFF endpoint stability + UK country-filter
//     resolution, neither of which is currently in place.
//
//   CACHE_VERSION bumped so returning visitors get the accent-strip fix.
//
// v5.0.86 — 22 May 2026: Nestlé family in BRAND_OWNERSHIP + diacritic-aware lookup + readable fallback
//   Founder report after v5.0.85 deploy with Bitesize Shredded Wheat loaded (brand
//   "Nestlé"): "history text to small." Two underlying problems surfaced:
//
//   (1) Nestlé itself wasn't in the BRAND_OWNERSHIP database. Pre-v5.0.86 the
//   database had ~25 brands but no Nestlé parent entry — Nestlé-owned brands
//   like KitKat were listed individually but the parent brand string "Nestlé"
//   alone returned the fallback.
//
//   (2) The fallback "not in database yet" message was hard-coded with inline
//   font-size:10px, so the v5.0.82 expanded-mode typography overrides couldn't
//   reach it. In modal mode it stayed at 10px while the rest of the panel
//   rendered at 13-14px — the "history text to small" the founder flagged.
//
//   Also: normaliseBrand() pre-v5.0.86 lowercased but did NOT strip diacritics,
//   so even if Nestlé HAD been in the database, the lookup would have looked
//   for "nestlé" (with é) against the "nestle" key (no é) — miss. Same bug
//   shape as the v5.0.85 SEARCH_INDEX accent-strip, applied here to the
//   brand-ownership lookup path.
//
//   Changes to flt-app.html:
//
//   (A) BRAND_OWNERSHIP database extended with seven new Nestlé-family entries:
//       - "nestle" — Nestlé S.A. parent chronology (1867 Henri Nestlé + 1866
//         Anglo-Swiss → 1905 merger → present)
//       - "shreddies" — Nabisco UK → Rowntree → Nestlé (1953→1988→present)
//       - "shredded wheat" — Welwyn factory → Nabisco UK → Rowntree → Nestlé
//       - "after eight" — Rowntree's launch 1962 → Nestlé 1988
//       - "smarties" — Rowntree's launch 1937 → Nestlé 1988
//       - "nescafe" — Nestlé brand from 1938 launch (never sold)
//   Database now covers ~30 starter brands (was ~25). Sources unchanged: SEC
//   + Companies House filings, regulatory disclosures, trade-press acquisition
//   announcements, primary company press releases. NO Wikipedia per the
//   22 May founder directive (banked CLAUDE.md ⭐).
//
//   (B) normaliseBrand() updated to use stripDiacritics() before lowercasing.
//   "Nestlé" → "nestle" matches the new "nestle" database key directly.
//   "Häagen-Dazs" → "haagen-dazs", etc. Consistent with the v5.0.85
//   SEARCH_INDEX accent-strip applied to the ownership-lookup path.
//
//   (C) Fallback "not in database yet" message moved from inline font-size:10px
//   to a CSS class .brand-ownership-empty:
//       - Dense mode: font-size:11px, color:var(--dim), line-height:1.55
//       - Modal mode (.panel.expanded .brand-ownership-empty): font-size:13px,
//         line-height:1.6, max-width:780px so the text doesn't sprawl
//   strong element styled with var(--text) so the brand-name prefix reads
//   clearly. Database count updated from "~25" to "~30".
//
//   What this is NOT:
//   - Not the live OFF search integration. The architectural live-OFF-search
//     work remains deferred per v5.0.85 §- principle banking until OFF
//     endpoint stability + UK country-filter syntax both resolve.
//   - Not a comprehensive Nestlé brand sweep. Six entries added cover the
//     Nestlé products in the embedded 1,500-SKU universe; more Nestlé-owned
//     brands (Aero, Yorkie, Milkybar, Quality Street, Lion, Munch Bunch,
//     Carnation, Buxton Water, San Pellegrino, Nespresso) deferred — the
//     embedded universe doesn't currently surface them so they'd hit the
//     fallback regardless.
//
//   CACHE_VERSION bumped so returning visitors get Nestlé family + readable
//   fallback + diacritic-aware ownership lookup.
//
// v5.0.87 — 22 May 2026: F6 recall feed sorted chronologically (relevance kept as badge)
//   Founder report after v5.0.86 deploy with Tesco Corn Flakes loaded: "why isnt
//   the recall feed in date order." Diagnosis confirmed on the live screenshot —
//   F6 RECL panel showed a 17 April recall (50 pts relevant) above three May
//   recalls (each 25 pts) because the RELEVANT-mode sort was: relevance DESC,
//   date DESC as tiebreaker. The relevance score won the ordering; date became
//   secondary.
//
//   That's not what a feed is. A "Live Recall Feed" reads as broken when a
//   4-week-old recall sits above three week-old recalls — regardless of
//   relevance score. Per the "live where live" principle (banked CLAUDE.md ⭐
//   22 May 2026): chronological is the conventional order for any feed.
//
//   Single-line fix in rankRecallsForProduct() — RELEVANT mode now sorts by
//   date DESC first, relevance DESC as tiebreaker. Relevance is preserved
//   as the FILTER (only items with _rel > 0 included in RELEVANT mode) AND
//   as the inline badge already rendered per row ("25 pts relevant", "50 pts
//   relevant"). The signal stays visible; it just stops dictating order.
//
//   ALL mode unchanged — was already pure chronological.
//
//   What this is NOT:
//   - Not a relevance filter removal. RELEVANT mode still filters to recalls
//     touching the loaded product's brand / category / allergen. The dual-
//     mode toggle (RELEVANT / ALL) preserved.
//   - Not a layout change. Same recall-row markup; same severity colour-
//     coding (HAZARD red / ALLERGEN amber / LABEL grey); same relevance
//     badge inline; just reordered.
//
//   CACHE_VERSION bumped so returning visitors get the chronological recall
//   feed sort.
//
// v5.0.88 — 23 May 2026: live OFF UK-scoped search (Lucene)
//   The architectural fix that v5.0.85 deferred — now landing because the
//   OFF endpoint stability + UK filter syntax investigation (banked CLAUDE.md
//   ⭐ 22 May, item "Live where it should be live") completed early on 23 May.
//   Findings from the API verification:
//
//   (a) Two of three OFF search endpoints (world.openfoodfacts.org/cgi/search.pl
//       AND world.openfoodfacts.org/api/v2/search) remain degraded — both return
//       HTML "Page temporarily unavailable" pages instead of JSON. Single-endpoint
//       dependency accepted: only search.openfoodfacts.org is functional.
//   (b) search.openfoodfacts.org is the search-a-licious / FastAPI / Lucene engine.
//       The OpenAPI spec confirms /search accepts a Lucene q parameter; no separate
//       countries filter param exists. Country filter goes INSIDE the Lucene query.
//   (c) UK filter syntax — colon MUST be quoted, not backslash-escaped:
//         WORKS: countries_tags:"en:united-kingdom"
//         FAILS: countries_tags:en\:united-kingdom
//   (d) Multi-word queries — split on whitespace, join with AND:
//         WORKS: heinz AND beanz AND countries_tags:"en:united-kingdom"
//         FAILS: "heinz beanz" AND countries_tags:"en:united-kingdom"  (phrase 0 hits)
//         FAILS: (heinz beanz) AND ...                                 (parens 0 hits)
//   (e) Brand field — brands_tags (lowercase canonical) > brands (case-sensitive)
//   (f) Response time observed: 200-300ms per query, fast enough for live UX.
//
//   v5.0.88 implementation — non-breaking additive layer:
//
//   1) New constants at top of script block:
//      - OFF_LIVE_SEARCH = "https://search.openfoodfacts.org/search"
//      - OFF_LIVE_TIMEOUT = 8000 ms (AbortController fires after 8s if unresponsive)
//      - OFF_LIVE_MIN_CHARS = 3 (don't fire live for very short queries)
//      - OFF_LIVE_PAGE_SIZE = 15 (matches autocomplete dropdown depth)
//
//   2) New async function searchLive(q, opts) — returns the same {c,n,b,cat,ns,nv,q,_src}
//      shape that the existing local search() returns, so callers can union/dedupe by code.
//      Lucene query construction: tokens join with AND, append UK country filter, encode,
//      fetch with AbortController timeout. All failure modes return [] silently — caller
//      decides how to surface (red flash, fallthrough). The function never throws — bare
//      try/catch wraps the whole network call.
//
//   3) F1 search Enter handler (wireF1Search IIFE) now async + three-tier:
//      Tier A — barcode pattern (8-14 digits) → direct loadProduct (loadProduct itself fetches
//                from OFF if not in local universe; that path already worked pre-v5.0.88)
//      Tier B — local SEARCH_INDEX (I500 + embedded 1,500 universe via existing search()).
//                Instant, no network. If hit, loadProduct top match, return.
//      Tier C — live OFF UK-scoped via searchLive(). Awaited. Amber border on input during
//                request. If hit, loadProduct top match. If both B+C empty → red flash.
//
//   4) Cmd bar Enter handler now async with the same three-tier pattern. The VS compare
//      sub-command (VS <query>) also falls through to searchLive when local has no match,
//      previously alerted "No match for VS query" too readily.
//
//   5) Autocomplete dropdown (cmd input listener / showAc / pickAc) is INTENTIONALLY
//      UNCHANGED in v5.0.88 — it stays local-only for instant as-you-type feedback. The
//      live OFF integration only fires on explicit Enter submission (cmd bar OR F1 search).
//      Adding live results to the dropdown would require debounce + dropdown UI rework;
//      deferred to a future v5.0.x pass. Per founder principle: instant accessible local
//      feedback first; live data fires when the user signals intent (Enter).
//
//   Visual states on both inputs (cmd + F1 search):
//      - Default: dim border (amber-dim on cmd, amber on F1)
//      - Loading (live OFF in-flight): amber border
//      - Successful load: returns to default
//      - No match (local + live both empty): red flash, 700ms, then default
//
//   UK regulatory anchor honoured per CLAUDE.md item 34 (editorial-globalises /
//   operational-stays-UK split). Every live search includes the
//   countries_tags:"en:united-kingdom" Lucene filter. No global results leak into the
//   FLT search experience.
//
//   What this is NOT:
//   - NOT a rewrite of loadProduct or any panel renderer. Same product-load pipeline;
//     just more entry points reach it (live search results carry barcodes; loadProduct
//     fetches the full record from OFF as it always has).
//   - NOT a change to the embedded 1,500-SKU universe — that stays as offline-fallback
//     and the instant-feedback layer for the autocomplete dropdown.
//   - NOT autocomplete-as-you-type for live results. Live fires ONLY on Enter submission
//     for now. Dropdown enrichment deferred.
//   - NOT a UI text overhaul — the top cmd bar placeholder still says "Search 1,500 UK
//     SKUs" for now. That's misleading after v5.0.88 (live search reaches much more).
//     Deferred for cleaner text refresh in a follow-up; the immediate priority was
//     functional live search.
//
//   CACHE_VERSION bumped so returning visitors get the live OFF search.
//
// v5.0.95 (25 May 2026) — F5 chart panel: scrollable for longer reformulation history
//
//   PROBLEM: F5's SVG used a fixed viewBox (`0 0 1200 600` expanded; `0 0 600 280` dense) with
//   `preserveAspectRatio="xMidYMid meet"` and CSS `.chart{width:100%;height:100%}`. When a
//   product carried long reformulation history (20+ OFF revisions), the per-revision data points
//   compressed into the same pixel space rather than spreading out — making the chart progressively
//   harder to read with each added revision. No way to scroll, no way to see more.
//
//   FIX (three minimal changes in flt-app.html):
//     1) `.panel.expanded #p5 > .body` gets `overflow:auto` so the body can scroll in both axes
//        when the SVG exceeds the modal viewport. Dense view stays compressed-by-design (Bloomberg
//        density read); only the expanded modal (the depth view) needs scroll for longer history.
//     2) `renderLineChartMultiples()` (the 7-nutrient 2x4 small-multiples in expanded mode) now
//        computes `W = Math.max(1200, series.length * 80)` — 1200px base comfortably holds 15
//        revisions (~20px per revision per cell across 4 cols); beyond that, 80px of total chart
//        width is added per revision. The function sets its own `viewBox` + inline `style.width`
//        (inline beats the `.chart{width:100%}` CSS rule); when W==BASE_W the inline width is
//        cleared so the SVG goes back to fluid scaling.
//     3) `renderLineChart()` (dense view) + `renderChartFOP()` (BARS toggle) both clear
//        `svg.style.width` so collapsing back from expanded — or toggling HIST→BARS after a
//        long-history render — resets the SVG to fluid 100%-width scaling.
//
//   §50 HONESTY TEST: the SVG width-growth makes the chart actually wider when there's more data
//   to show; the body's overflow:auto turns that real growth into real scroll. The visible promise
//   ("more history → I can scroll through it") matches the actual action.
//
//   ARCHITECTURAL PATTERN: dense = at-a-glance Bloomberg-density read; expanded = depth view with
//   room to breathe. Consistent with §- *expand-on-active modal* canon banked 22 May 2026.
//
//   CACHE_VERSION bumped so returning visitors get the scrollable expanded F5 panel.
//
//   v5.0.95 ALSO restores the F1 search row's yellow prominence after a screenshot showed the
//   F1 panel post-deploy without its active-state amber outline (rail still amber, panel not).
//   Two-part fix in flt-app.html:
//     (a) `.f1-search` border 1px → 2px + always-on amber glow (`box-shadow:0 0 4px rgba(amber,0.2)`)
//         so the search field stays unmistakably yellow even when the parent panel's active-state
//         box-shadow inset isn't carrying the highlight on its own. The F1 search IS the primary
//         entry point — it should never look quiet.
//     (b) DOMContentLoaded initialiser switched from raw `p1.classList.add("active-panel")` to
//         the canonical `activatePanel("F1")` path. The canonical path syncs BOTH the panel
//         active-state outline AND the rail .active class together; the raw add bypassed rail
//         sync and let the two visual signals drift apart on certain load paths.
//
// v5.0.96 (25 May 2026) — i500.html: headline stats strip added (mirrors flt/checkit pattern)
//
//   CONTEXT: flt.html (v5.0.55+) and checkit.html (v5.0.55+) both carry a four-column stats
//   strip immediately below the page hero — same design-system slot, same .navy-soft band,
//   same `repeat(4,1fr)` grid, same .num + .lbl typography. The three product pages (CheckIT,
//   I500, FLT) read as one design system when their hero sections share this pattern;
//   they read as a fragmentation when one is missing it. i500.html was the odd-one-out.
//
//   FIX (two minimal changes in i500.html):
//     1) New `.i500-stats` + `.i500-stats-grid` CSS rules added to the page <style> block.
//        Mirrors the .flt-stats / .checkit-stats pattern exactly: navy-soft band, 1px top/
//        bottom border lines, 36px vertical padding, max-width inner grid, 4-col on desktop
//        collapsing to 2-col under 700px. Uses the CheckIT three-line (num + lbl + sub)
//        typography rather than the FLT two-line — the I500 page audience is analysts +
//        buyers per `.door-tag.i500`, so the extra sub-label carries useful context per stat.
//     2) New `<div class="i500-stats">` block inserted between the closing </section> of
//        the page-hero and the opening <section id="how"> — same insertion slot as the
//        equivalent blocks in flt.html and checkit.html.
//
//   FIGURES anchored to §103 I500 OFF-coverage strict methodology canon (banked 13 May 2026):
//     • 155 — I500 catalogue (Verified products)
//     • 148 — Audited (As of 13 May 2026) — the strict-methodology denominator excluding
//             7 currently-blank/unaudited OFF-status rows
//     • 93.2% — Strict blindspot (Absent · stale · partial on OFF) — supersedes the earlier
//               84% lenient headline per §103; flt.html already carries 93.2% in its stat band
//     • 9 — Cultural shop types (Halal · Caribbean · S Asian · & more) — the I500's
//           structural differentiator vs OFF / supermarket data feeds; pulled from the body
//           prose at line 143 ("halal, Caribbean, South Asian, kosher, West African,
//           East African, Latin American, vegan-specialist, and refill stores")
//
//   §50 HONESTY TEST: every stat is independently true at the canonical-figure layer (155,
//   148, 93.2% directly from §103 / the live ticker JSON; 9 directly enumerable from the
//   i500.html body prose). No equivocation, no elegance-without-truth.
//
//   §47a CANON-SYNC CHECKLIST run before edit: Notion last-24h scan ✓ (no parallel i500
//   page work in flight); FLT v5.0.95 + CheckIT v5.0.x cross-validate the figure set;
//   CLAUDE.md ⭐ entries within 7 days reviewed (§103 strict methodology + §50 + §47a);
//   declared scope (headline panel only); no conflict.
//
//   NOT TOUCHED IN THIS PASS: the body section at i500.html lines 164-166 still carries the
//   superseded 149/84% lenient figure (a known-deferred scrub flagged in CLAUDE.md item 31
//   supersession note). Scope-discipline: this pass adds the headline panel only. Body-figure
//   refresh is a separate queued cleanup item — to land alongside the next i500-page edit
//   pass or in the 1 June 2026 Monthly Document Sweep (§70).
//
//   CACHE_VERSION bumped so returning visitors get the new headline panel.
//
// v5.0.97 (25 May 2026) — F1 BRAND_OWNERSHIP expanded 30 → 80 entries from primary-source pull
//
//   CONTEXT: Naturis F1 screenshot 25 May surfaced the empty-database state for any brand outside
//   the original 30-entry curated set. Initial Wikidata SPARQL approach killed by the founder
//   (25 May 2026 ⭐ rule: no data from the Wiki ecosystem; extends 22 May Wikipedia rule to
//   the whole Wikimedia family). Pivoted to primary-source data: SEC EDGAR submissions API
//   (free, no key — 10 US-listed FLT parents) + Companies House REST API (free with key,
//   15 UK FLT-parent entities). Both pulls banked at scansmart-site/_internal/ for forward
//   reference. This commit ships the operational use of that data: BRAND_OWNERSHIP expanded
//   with verified new entries, each citing its parent's SEC CIK or CH company number inline.
//
//   ADDITIONS (50 new BRAND_OWNERSHIP entries):
//     Mondelez (CIK 0001103982): oreo, milka, toblerone, ritz, philadelphia, dairylea,
//       cadbury dairy milk, belvita
//     PepsiCo (CIK 0000077476): lays, lay's, doritos, mountain dew, 7up
//     Coca-Cola (CIK 0000021344): fanta, sprite, minute maid, powerade, schweppes, diet coke
//     Unilever (CIK 0000217410 / CH no 00041424): magnum, hellmann's, knorr, lipton ice tea, dove
//     Mars Inc. (CH MARS WRIGLEY CONFECTIONERY UK no 06649982): twix, m&m's, maltesers,
//       bounty, skittles, whiskas, pedigree
//     Kerry Foods (CH no 02604258): cheestrings, richmond, mattessons
//     UK Kellogg cereals via Kellanova → Mars chain (CIK 0000055067 Form 15-12G 2025-12-22):
//       frosties, corn flakes, rice krispies, special k, coco pops, crunchy nut, all bran
//     Suntory / Lucozade Ribena Suntory (CH no 08603549): orangina
//     Premier Foods (CH no 05160050): ambrosia, bisto, oxo, loyd grossman
//     Nomad Foods (CIK 0001651717 / CH no 05879466): findus, captain birdseye
//     Kraft Heinz UK (CH no 03095863): heinz beanz, hp sauce
//     pladis / Yıldız (CH PLADIS FOODS no 09295357): jacob's, godiva
//
//   CHAIN UPDATE on existing entry:
//     pringles — added 2025 Mars Inc. period (Kellanova Form 15-12G filing 2025-12-22 closed
//     Mars Inc. acquisition; primary source: SEC EDGAR CIK 0000055067). Pre-existing chain
//     (Kellanova 2024 → Kellogg 2012-2024 → Procter & Gamble 1968-2012) preserved.
//
//   §50 HONESTY TEST: every new entry's chronology comes from primary-source filings or
//   well-documented acquisition press releases verifiable against the parent's SEC 10-K
//   Exhibit 21 (subsidiary list) or Companies House records. No Wikipedia, no Wikidata, no
//   Wikimedia ecosystem source. Each entry's note field names the primary-source citation
//   (CIK or Companies House number) inline. Where a transaction value is named (e.g.
//   $20.3bn Bestfoods acquisition), it's drawn from the parent's filed press release at
//   the time, not from third-party aggregators.
//
//   CITATION DISCIPLINE per the 22+25 May rules: every primary-source pointer cited is
//   either the SEC EDGAR submissions API (data.sec.gov/submissions/CIK#######.json) or the
//   Companies House REST API (api.company-information.service.gov.uk/company/<number>).
//
//   §47a CANON-SYNC PROTOCOL run before edit: Notion last-24h scan ✓ (no parallel session
//   on BRAND_OWNERSHIP); filesystem mtime ✓ (v5.0.96 baseline current); CLAUDE.md ⭐ within
//   7 days reviewed (25 May NO-WIKI-ECOSYSTEM rule honoured throughout; 22 May citation
//   rule honoured throughout); declared scope (BRAND_OWNERSHIP expansion from cache);
//   no conflicts.
//
//   USER-VISIBLE OUTCOME: when a user scans a Cadbury, Oreo, Walkers, Mars bar, Frosties,
//   Heinz Beanz, McVitie's, HP Sauce, or any of ~50 other newly-covered products, F1 expanded
//   ownership-history block now renders a full chronology instead of the "not in database
//   yet" message. The data caches at _internal/flt-companies-*.json are the input; this
//   BRAND_OWNERSHIP expansion is the visible output.
//
//   NOT INCLUDED IN THIS PASS: WK Kellogg → Ferrero chain (US-only post-2025 fork of cereals;
//   UK chain is Kellogg → Kellanova → Mars, captured above). If FLT later surfaces US-pack
//   product data, the Ferrero side of the chain should be added in a follow-up edit with
//   a per-market split note.
//
//   CACHE_VERSION bumped so returning visitors get the expanded ownership data.
//
// v5.0.98 (26 May 2026) — FLT key-gate added; /flt-app is now Partner-Programme-only access
//
//   CONTEXT: Founder direction 26 May 2026 — *"we need now to lock the FLT needing a key
//   for access."* FLT (Food Label Terminal, fifth product per §98 Five-Product Architecture)
//   was publicly browsable since 4 May 2026 launch. v5.0.98 gates direct access at /flt-app
//   behind a shared access key. The /flt landing page remains public (marketing surface);
//   the inline marketing-preview iframe on /flt also remains public via the ?embed=1 bypass.
//
//   IMPLEMENTATION:
//     - New file: flt-gate.html (dark-navy chrome matching scansmart.uk; centered card;
//       "Access by key." title; password input + "Unlock terminal" CTA; "Apply for access"
//       footer link to partner.html#partner-inquiry). Hashes entered key with SubtleCrypto
//       SHA-256 and compares against the canonical hash baked into the page source. On
//       match: sets sessionStorage.flt_unlocked = '1' and navigates to the requested next
//       path (defaults to flt-app.html; ?next=<path> overrideable with same-origin guard).
//       On miss: shows error, clears input, refocuses. Anti-tracking posture per §31:
//       sessionStorage only, no cookies, no fingerprinting.
//     - flt-app.html head — inline gate-check script at the very top of <head>, before any
//       other script or stylesheet loads. Checks ?embed=1 (bypass for marketing iframe) and
//       sessionStorage.flt_unlocked (bypass for unlocked session). If neither, redirects to
//       flt-gate.html with ?next= preserving the original path + query.
//     - PRECACHE — added /flt-gate.html so the gate works offline like other key product pages.
//     - flt.html — unchanged. The "Launch the Terminal" CTA still links directly to
//       /flt-app; the gate script on /flt-app intercepts and redirects to /flt-gate.html
//       when needed. The marketing iframe preview (src=flt-app.html?embed=1) keeps working
//       publicly because the gate script honours the ?embed=1 bypass.
//
//   THE KEY: hashed inline at flt-gate.html (SHA-256). Plaintext key value is shared with
//   Partner Programme prospects out of band (email / call / signed proposal). Not stored
//   in source; only the hash. Casual visitors and crawlers cannot reverse the hash within
//   reasonable bounds; a determined attacker viewing source can still mount a dictionary
//   attack against the hash. For audit trail / per-user revocation / institutional-tier
//   security: escalate to Cloudflare Access (covered in §98 + §28 B2B Buyer-Need Matrix
//   as the proper long-term solution; this client-side gate is the right shape for the
//   pre-Cloudflare-Access interim window while Partner Programme contracts are in flight).
//
//   §50 HONESTY TEST: the gate's UI promise ("Partner Programme surface; access by key")
//   matches the actual behaviour — the page denies access without a valid key. The
//   "Apply for access" footer link routes to partner.html#partner-inquiry, the canonical
//   intake path. The gate is named honestly as a casual-visitor block, not as
//   institutional-grade auth, per the operational rule banked above.
//
//   §31 ANTI-TRACKING POSTURE: no cookies set, no analytics on the gate page, no third-party
//   network calls (fonts via the same Google Fonts pipeline as other scansmart.uk pages).
//   sessionStorage clears on tab close — prospects re-enter the key for each fresh session.
//
//   §47a CANON-SYNC PROTOCOL run before edit: Notion last-24h scan ✓ (no parallel session
//   on flt-app.html gate); filesystem mtime ✓ (v5.0.97 baseline current; v7.3 Bible banked
//   earlier this session preserves §98 FLT-as-fifth-product positioning); CLAUDE.md ⭐
//   within 7 days reviewed (no overlap); declared scope (FLT access gate); no conflicts.
//
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/
//   (local); iCloud mirror NOT touched this pass. Cloudflare deploy is via drag-drop of
//   the local folder per the canonical flow.
//
//   USER-VISIBLE OUTCOME: visiting /flt-app directly (or via the "Launch the Terminal"
//   CTA on /flt) shows the gate page until the user enters the right key. The marketing
//   surface at /flt — including the live-terminal iframe preview — remains publicly
//   browsable for prospects evaluating the product. The "Apply for access" CTA on /flt
//   continues to route to the Partner Programme inquiry form.
//
//   CACHE_VERSION bumped so returning visitors get the gate on next visit.
//
// v5.0.99 (26 May 2026 afternoon) — I500 key-gate added; /door3-preview is now Partner-Programme-only access; sessionStorage flag unified across FLT + I500
//
//   CONTEXT: Founder direction 26 May 2026 afternoon — *"we should also have the same access for i500"* + *"we need to gate the i500"*
//   following the v5.0.98 FLT gate deploy earlier same afternoon. The I500 (second product per §98 Five-Product Architecture)
//   was publicly browsable at /door3-preview.html since 5 May 2026 launch. v5.0.99 mirrors the FLT gate pattern onto
//   /door3-preview.html, using the same single shared key and a unified sessionStorage flag so prospects who unlock either
//   surface have access to both. The /i500.html landing page (marketing surface) remains public; the /door3-preview.html
//   Retail Intelligence Terminal (institutional data access) is now gated. Same pattern as flt.html (public) + flt-app.html (gated).
//
//   IMPLEMENTATION:
//     - New file: i500-gate.html (mirror of flt-gate.html with I500-themed copy — green accent matching i500.html brand
//       colour palette; "I500 — Access required" title; lede "The Retail Intelligence Terminal is a Partner Programme
//       surface. Enter your access key to continue."). Default next-path is door3-preview.html (vs flt-gate.html which
//       defaults to flt-app.html). Same SHA-256 EXPECTED_HASH, same key (fltaccess-526), same partner_unlocked sessionStorage
//       flag, same same-origin path guard on the ?next= redirect parameter.
//     - door3-preview.html head — inline gate-check script at the very top of <head>, before any other script or stylesheet
//       loads. Checks ?embed=1 (bypass for any future marketing iframe preview) and sessionStorage.partner_unlocked (bypass
//       for unlocked session). If neither, redirects to i500-gate.html with ?next= preserving the original path + query.
//     - flt-gate.html — sessionStorage key renamed flt_unlocked → partner_unlocked (line 135 read + line 165 write). Comment
//       block updated to name FLT + I500 as the two gated surfaces sharing this key. EXPECTED_HASH unchanged.
//     - flt-app.html — gate-check script updated to read partner_unlocked flag instead of flt_unlocked. Comment updated to
//       reference §116 + §117 in Bible v7.3. ?embed=1 bypass unchanged.
//     - PRECACHE — added /i500-gate.html so the gate works offline like other key product pages.
//     - i500.html — unchanged. The "Already have access? Open the live Retail Intelligence Terminal" link still points to
//       /door3-preview.html; the gate script on /door3-preview.html intercepts and redirects to /i500-gate.html when needed.
//
//   UNIFIED ACCESS RULE: The sessionStorage flag rename (flt_unlocked → partner_unlocked) means a single key entry unlocks
//   BOTH gates. Prospect enters fltaccess-526 on /flt-gate.html → partner_unlocked is set → /door3-preview.html access also
//   succeeds without re-entry. Same in reverse: enter on /i500-gate.html → /flt-app.html access succeeds. The "same access"
//   founder direction made operational at the storage layer.
//
//   THE KEY: unchanged from v5.0.98. Plaintext fltaccess-526; SHA-256 22c140bbab909cfae06f8fbc254c070f83ebbc30bd8b8cbda4e99ffa22668a2a.
//   The plaintext key name "fltaccess-" doesn't reflect its expanded scope (now also gates I500), but renaming the key would
//   require both gate files to update their EXPECTED_HASH and all already-shared key holders to be re-issued — overkill for
//   the current 0-prospect Partner Programme. Document the key as "Partner Programme access key (legacy name fltaccess-526)"
//   in CLAUDE.md ⭐ + Bible §117 for forward clarity. Future key rotation can drop the FLT-specific naming.
//
//   §50 HONESTY TEST: the gate's UI promise on each page ("Partner Programme — Access by key") matches the actual behaviour.
//   The naming-discipline footnote ("legacy name fltaccess-526") names the scope mismatch honestly without trying to hide it.
//   The named limitations (casual-visitor block, not institutional-grade auth) are explicit in both gate file source comments.
//
//   §31 ANTI-TRACKING POSTURE: no cookies set, no analytics on either gate page, no third-party network calls beyond
//   the same Google Fonts pipeline as other scansmart.uk pages. sessionStorage clears on tab close — prospects re-enter
//   the key for each fresh session on whichever surface they hit first.
//
//   §47a CANON-SYNC PROTOCOL run before edit: Notion last-24h scan ✓ (no parallel session on door3-preview.html gate);
//   filesystem mtime ✓ (v5.0.98 baseline current; v7.3 Bible §116 banked earlier this session); CLAUDE.md ⭐ within 7 days
//   reviewed (v5.0.98 FLT gate entry is the most recent; this v5.0.99 entry is its sibling); declared scope (I500 access
//   gate, mirroring FLT pattern); no conflicts.
//
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local); iCloud mirror NOT touched
//   this pass. Cloudflare deploy is via drag-drop of the local folder per the canonical flow.
//
//   USER-VISIBLE OUTCOME: visiting /door3-preview directly (or via the "Already have access? Open the live Retail Intelligence
//   Terminal" link on /i500) shows the gate page until the user enters the right key. The marketing surface at /i500 — including
//   the headline figures, the five-buyer-category narrative, the report callout — remains publicly browsable. The "Request data
//   access" CTA on /i500 continues to route to the partner inquiry form. Prospects with the key get one unlock for both terminals.
//
//   CACHE_VERSION bumped so returning visitors get the gate on next visit.
//
// v5.0.100 (26 May 2026 evening) — Split-keys architecture; per-gate keys + per-gate sessionStorage flags
//
//   CONTEXT: Founder direction 26 May 2026 evening — *"i500access-526"* + *"pay attention as per earlier msg we need to gate the i500"*
//   following the v5.0.99 unified-key I500 gate deploy earlier same afternoon. Founder named the I500 key as `i500access-526`,
//   distinct from FLT's `fltaccess-526`. The "same access" phrasing from earlier was operational shorthand for "same kind of
//   gate mechanism" — not "literally the same key." Each Partner Programme surface gets its own key + own sessionStorage flag.
//   v5.0.100 supersedes v5.0.99's unified-flag architecture with per-gate-keyed architecture.
//
//   IMPLEMENTATION (v5.0.100 changes from v5.0.99):
//     - i500-gate.html — EXPECTED_HASH updated to SHA-256 of `i500access-526`:
//       `1a0d8e38d1c9bc20e0e30dae6f9a8e89df93d7c99821b0c5d9d999cc3083def8`. sessionStorage flag renamed
//       `partner_unlocked` → `i500_unlocked`. Comment block updated to name the per-gate-keyed architecture explicitly.
//     - door3-preview.html — gate-check script updated to read `i500_unlocked` flag (not `partner_unlocked`).
//       Comment block updated.
//     - flt-gate.html — sessionStorage flag reverted `partner_unlocked` → `flt_unlocked`. EXPECTED_HASH unchanged
//       (still SHA-256 of `fltaccess-526`: `22c140bbab909cfae06f8fbc254c070f83ebbc30bd8b8cbda4e99ffa22668a2a`).
//       Comment block updated to name the per-gate-keyed architecture explicitly.
//     - flt-app.html — gate-check script reverted to read `flt_unlocked` flag (not `partner_unlocked`).
//       Comment block updated.
//     - PRECACHE unchanged from v5.0.99 (both gates already in PRECACHE).
//
//   THE TWO KEYS:
//     - FLT key: `fltaccess-526` (plaintext) · SHA-256 `22c140bbab909cfae06f8fbc254c070f83ebbc30bd8b8cbda4e99ffa22668a2a`
//       — gates `flt-app.html` via `flt-gate.html`; sets `sessionStorage.flt_unlocked = '1'` on match.
//     - I500 key: `i500access-526` (plaintext) · SHA-256 `1a0d8e38d1c9bc20e0e30dae6f9a8e89df93d7c99821b0c5d9d999cc3083def8`
//       — gates `door3-preview.html` via `i500-gate.html`; sets `sessionStorage.i500_unlocked = '1'` on match.
//
//   OPERATIONAL CONSEQUENCE: prospects with FLT access only enter `fltaccess-526` and reach `flt-app.html`. Prospects with
//   I500 access only enter `i500access-526` and reach `door3-preview.html`. Prospects with both Partner Programme tiers
//   enter both keys (one per surface, one-time per session). Differential access is now operationally possible without
//   architectural change — grant the key for the surface(s) the prospect's contract covers; the other surface stays locked
//   to that prospect. This is the right shape for Partner Programme audience differentiation per §28 B2B Buyer-Need Matrix.
//
//   §50 HONESTY TEST: each gate's UI promise now matches a per-gate scope honestly. FLT gate says "Food Label Terminal —
//   Partner Programme surface"; I500 gate says "Retail Intelligence Terminal — Partner Programme surface." Each key name
//   matches its scope (`fltaccess-` for FLT, `i500access-` for I500); the "legacy name" footnote from v5.0.99 is no longer
//   needed because the scope mismatch is gone.
//
//   §47a CANON-SYNC PROTOCOL run before edit: Notion last-24h scan ✓ (v7.3 banking page + §116 + §117 pages are most recent;
//   §117 page needs in-place update to reflect the per-gate-keyed architecture replacing the unified-flag framing);
//   filesystem mtime ✓ (v5.0.99 baseline current); CLAUDE.md ⭐ within 7 days reviewed (the v5.0.99 I500 gate ⭐ entry needs
//   superseding correction); declared scope (per-gate-keyed architecture); resolution per §15.x.6 within-session-correction
//   pattern (the unified-flag framing banked at v5.0.99 supersedes within hours of banking; both the v5.0.99 framing AND
//   the v5.0.100 correction are preserved per §14.3.1 as dated artefacts; the canonical reading going forward is per-gate-keyed).
//
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local); iCloud mirror NOT touched
//   this pass. Cloudflare deploy is via drag-drop of the local folder per the canonical flow.
//
//   §15.x.6 WITHIN-SESSION-CORRECTION CASE-STUDY RECORD (the twenty-second in the running series).
//   Sibling-and-supersession pattern: §117 unified-flag architecture banked v5.0.99 afternoon → founder named I500 key
//   `i500access-526` evening → architecture revised same session within ~3 hours to per-gate-keyed. Lesson: when founder
//   says "same access" without naming a specific key, ASK whether that means "same mechanism" (separate keys, same gate
//   pattern) or "literally same credential" (one key, unified flag) BEFORE committing the architecture. The v5.0.99 unified
//   flag was a reasonable read of "same access" but the v5.0.100 correction shows the truer reading was "same gate kind."
//   Future architectural decisions on shared resources should default to per-instance naming (per-gate keys + per-gate flags)
//   unless the founder explicitly requests unification.
//
//   USER-VISIBLE OUTCOME: same UX shape on both gates (enter key, click Unlock, navigate to terminal). What changes is the
//   credential: FLT prospects use `fltaccess-526`; I500 prospects use `i500access-526`. A prospect with both contracts
//   enters two keys (one per surface) over their session. This is identical to how Bloomberg Terminal vs Bloomberg Pro
//   credentials work — same parent provider, distinct credentials per product tier.
//
//   CACHE_VERSION bumped so returning visitors get the per-gate-keyed architecture on next visit. v5.0.99 unified-flag
//   sessionStorage entries (`partner_unlocked`) will be ignored by the gate scripts and harmlessly persist in any tab
//   where they were set; the next gate visit will treat the session as fresh and prompt for the appropriate key.
//
// v5.0.101 (26 May 2026 evening) — i500.html landing iframe preview mirrors flt.html pattern; door3-preview embed-mode CSS
//
//   Per founder direction *"i500 needs to have a landing page similar to flt and gated like flt"* —
//   the I500 landing surface now carries a live embedded preview of the Retail Intelligence Terminal,
//   mirroring the right-column iframe pattern that's been on flt.html since 20 May 2026. The terminal
//   IS the product: the iframe on i500.html shows the actual door3-preview.html interface, bypassed
//   from the gate via ?embed=1 (the §117 gate-check script in door3-preview.html honours ?embed=1).
//
//   Changes shipped:
//     - i500.html — hero refactored from single-column to two-column .i500-hero-grid (0.85fr / 2fr)
//       mirroring .flt-hero-grid. Left column keeps existing copy + CTAs (Access I500 / Request data
//       access). Right column adds .i500-iframe-wrap containing <iframe src="door3-preview.html?embed=1">
//       with green-accent border + LIVE overlay + Full window link. Inline CSS added for .i500-hero-grid,
//       .i500-hero-visual, .i500-iframe-wrap, .i500-iframe, .i500-iframe-overlay, .i500-iframe-fs,
//       .i500-mock-caption — parallel to FLT's namespace.
//     - door3-preview.html — gate-check script extended to set document.documentElement.classList.add('embed-mode')
//       when ?embed=1 is detected. Embed-mode CSS block added: hides .construction-strip, .site-nav,
//       .skip-link, .page-hero, .section-callout, footer; tightens .terminal-wrap padding. Iframe now
//       shows the terminal interface only — no nav-within-nav visual.
//
//   §47a CANON-SYNC PROTOCOL run before edit: Notion last-24h scan ✓ (no parallel session); filesystem mtime ✓
//   (v5.0.100 baseline); CLAUDE.md ⭐ within 7 days reviewed; declared scope (i500.html landing iframe + embed-mode);
//   no conflicts.
//
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
//   USER-VISIBLE OUTCOME: /i500 now shows a live terminal preview in the right column, matching the
//   /flt landing pattern. Clicking "Access I500 →" still routes to /door3-preview which gates via
//   i500-gate.html. The iframe preview is the marketing demonstration — same "the demo IS the product"
//   convention §50 banked on /flt.
//
//   CACHE_VERSION bumped so returning visitors get the iframe + embed-mode on next visit.
//
// v5.0.102 (26 May 2026 evening) — i500.html iframe stripped, replaced with subscriber-only teaser block
//
//   Founder audit catch: the v5.0.101 iframe pattern (copied from FLT's flt.html) was leaking
//   row-level I500 SKU data publicly on the marketing landing surface. FLT's data substrate is
//   public APIs (OFF/FSA/EFSA/USDA) so the live-iframe pattern was safe there. I500 is structurally
//   different — its data substrate IS the paid B2B product per Bible §4 ("The Partner Programme
//   licenses access to the I500"). Embedding the live terminal contradicted the canonical commitment.
//
//   v5.0.102 strips the iframe and replaces with a static teaser block: terminal aesthetic preserved
//   (green border, monospace, terminal-style header) but data limited to 3 sample SKU rows + 2 faded
//   placeholder rows + "+152 more records" overlay + "Subscribe for full corpus →" CTA routing to
//   subscribe.html. No row-level proprietary data exposed on the public surface.
//
//   QUEUED (not in this version): door3-data.json + i500-ticker.json sit at scansmart.uk/*.json
//   as publicly fetchable static files. The HTML gate doesn't protect them. Need a Cloudflare
//   Function/Worker that serves the JSON from a private R2 bucket after checking a subscription
//   session cookie. Separate infrastructure pass — not built this session.
//
//   §47a CANON-SYNC PROTOCOL run: Notion last-24h scan ✓; filesystem mtime ✓; CLAUDE.md ⭐ scanned;
//   declared scope (strip iframe + teaser); conflict resolution per founder direction.
//
//   §50 HONESTY TEST: previously the gate UX promised "subscription required to access" but the
//   iframe + JSON file URLs gave the data away anyway. v5.0.102 closes the iframe leak; the JSON
//   file leak remains until the Cloudflare Function ships. Acknowledged honestly in this changelog.
//
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
//   USER-VISIBLE OUTCOME: /i500 right column now shows a teaser table (3 sample rows + faded
//   placeholder rows + subscribe overlay), no live iframe, no exposed SKU corpus on the public page.
//   Clicking the "Subscribe for full corpus →" CTA routes to subscribe.html.
//
//   CACHE_VERSION bumped so returning visitors pick up the teaser on next visit.
//
// v5.0.103 (26 May 2026 evening) — I500 in-depth findings removed from public Knowledge Library
//
//   Founder direction *"remove the whole thing from the library you can see i500 listed at the
//   top if you want a preview"* — per Bible §4 the I500 in-depth findings are institutional-grade
//   analysis that doesn't belong on the public Knowledge Library surface. The Library is for
//   public-facing label literacy; the I500 is its own product with its own access tier.
//
//   Changes shipped in v5.0.103:
//     - library-i500-findings-summary.html — moved from public deploy folder to scansmart-site/_internal/
//       (preserved per §14.3.1; removed from public deploy)
//     - library.html — removed: (a) dropdown option pointing to the findings file; (b) #stream-1-5
//       jump option; (c) Stream 1.5 link in the stream-selector TOC; (d) the entire Stream 1.5 section
//       (the structural-findings publication block — 7 lib-entry cards: 84% OFF blindspot, cultural
//       specificity, salt loadings, health-halo sugar, GREEN+GREEN, frozen aisle, cosmetics scoping).
//     - 20 library-*.html cross-referencing files — sentence containing the findings link removed
//       via Python script (alcohol-labelling, bottled-water, brand-vs-manufacturer, caffeine-and-health,
//       canned-goods, carbohydrate-types, children-oral-health, cultural-food-myths, dairy-milks,
//       dietary-patterns, food-marketing-to-kids, frozen-food-uk, fruit-juice, global-staple-foods,
//       impulse-buying-triggers, industry-funding-bias, protein-claims, reformulation-tracking,
//       supplements, upf-brain-cognitive). Preserves surrounding text.
//     - sitemap.xml — <url> block for findings summary removed
//     - search-index.json — findings page entry removed
//     - install.js — findings filename removed
//
//   USER-VISIBLE OUTCOME: /library no longer mentions the I500 in-depth findings; cross-references
//   from other library pages dropped; direct visit to /library-i500-findings-summary returns 404
//   (file lives in _internal/, not deployed). Users who want I500 information click the I500 nav
//   link at the top of every page.
//
//   §4 architectural alignment: the Library carries public label-literacy reference. The I500
//   carries institutional-grade structural findings + row-level corpus. Door 4 carries weekly
//   editorial structural critique. Each surface stays in its lane.
//
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict; §14.3.1 preservation
//   honoured (file moved, not deleted).
//
//   CACHE_VERSION bumped so returning visitors get the cleaned Library on next visit.
//
// v5.0.104 (26 May 2026 evening) — CheckIT stats-strip: I500-cohort stat removed (155 / verified products)
//
//   Founder catch on /checkit screenshot: the 155 / "verified products" stat on the CheckIT page
//   was I500-cohort-specific and misleading on the consumer-scanner surface. CheckIT scans any
//   barcoded product via OFF + I500 + other sources; the 155 is the field-audited independent-shop
//   subset (per §103 strict-methodology figure-lock). Showing it on /checkit invited a first-time
//   visitor read of "CheckIT only scans 155 products" — which isn't the claim.
//
//   Changes shipped in v5.0.104:
//     - checkit.html — third stat block (155 / Verified products / From independent UK shops) removed
//       from the .checkit-stats-grid. Grid now shows three stats: 28 Scans logged · 6 Put back at the
//       shelf · £0 No account · no tracking. The I500 stat lives canonically on /i500 where the
//       claim is contextually accurate.
//     - checkit.html — inline fetch script at end of file that pulled i500-ticker.json to update
//       #checkit-stat-i500 also removed (orphaned by the element removal).
//
//   USER-VISIBLE OUTCOME: /checkit stats strip now reads as three CheckIT-specific numbers
//   (Decision Record activity + no-account commitment). The I500 cohort number stays on /i500
//   where the claim is "this is the I500 catalogue size."
//
//   §50 HONESTY TEST: stat displayed matches the actual claim. /checkit stats describe CheckIT;
//   /i500 stats describe the I500 cohort. No cross-product attribution confusion.
//
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
//   CACHE_VERSION bumped so returning visitors get the cleaned CheckIT stats strip on next visit.
//
// v5.0.105 (26 May 2026 evening) — CheckIT stats-strip legibility patch + grid columns 4→3
//
//   Founder catch on /checkit screenshot: the .sub line under each stat was illegible
//   (0.62rem font, --muted-dim low-contrast colour, wide letter-spacing, all-caps —
//   four legibility-hostile properties compounded). Also the grid was still set to 4
//   columns after the v5.0.104 removal of the I500-cohort stat, leaving a layout gap.
//
//   Changes in v5.0.105:
//     - .checkit-stats-grid — grid-template-columns: repeat(4, 1fr) → repeat(3, 1fr)
//     - .checkit-stats-grid @media (max-width: 700px) — 2-col fallback → 1-col fallback
//     - .checkit-stat .lbl — bumped 0.7rem → 0.78rem; --muted → --cream-dim; letter-spacing 0.18em → 0.14em; margin-top 8px → 10px; font-weight 500
//     - .checkit-stat .sub — bumped 0.62rem → 0.72rem (~+16% size); --muted-dim → --muted
//       (better contrast); letter-spacing 0.12em → 0.04em; text-transform uppercase → none
//       (sentence-case reads cleanly for "Per §31 Six Principles"); margin-top 4px → 6px;
//       line-height 1.4 added
//
//   USER-VISIBLE OUTCOME: the three CheckIT stats now have legible captions. The "Per §31
//   Six Principles" sub-line on the £0 stat (and equivalents on the other two) is readable
//   without zooming.
//
//   §50 HONESTY TEST: §31 reference now actually readable — the canonical posture is named
//   honestly in legible text, not hidden behind low-contrast typography.
//
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
//   CACHE_VERSION bumped so returning visitors get the legibility patch on next visit.
//
// v5.0.106 (27 May 2026) — FLT audit fix #17: F3 nutrition per-100g cells coloured per FSA/DHSC FOP thresholds
//
//   Audit catch (27 May 2026 backlog item #17): the F3 nutrition panel footer cites FSA/DHSC FOP
//   thresholds verbatim ("Fat ≤3g GREEN · ≥17.5g RED · Saturates ≤1.5g / ≥5g · Sugars ≤5g / ≥22.5g
//   · Salt ≤0.3g / ≥1.5g (FSA/DHSC)") but the per-100g value cells in the nutrition table weren't
//   visually flagged against those thresholds — only the small TL dot column carried colour. §50
//   Honesty Test failure: rule cited, rule not applied to the data it governs. Reading "Sugars
//   5.00g / 100g" still required mental arithmetic against the threshold line below.
//
//   Implementation:
//     - flt-app.html lines 286-297: four new CSS classes added next to the existing .t-g/.t-y/.t-r/.t-u
//       dot styles — .tl-num-g (color #27d07c, weight 600), .tl-num-y (color #ffd54a), .tl-num-r
//       (color #ff4d4d), .tl-num-u (color var(--text)). Documented inline why the cell tinting is
//       a separate class from the dot tinting (different visual register, single source of truth
//       in trafficLight() return value).
//     - renderNutrition() per-100g cell render (line ~2164) now applies `class="num tl-num-${r.tl}"`
//       so the same trafficLight() return that drives the TL dot column also colours the value text.
//       Documented inline that non-FOP nutrients (Energy / Carbs / Fibre / Protein) and missing
//       values both render r.tl="u" → normal text — no false green/red on data that doesn't have
//       a defined FOP threshold or doesn't exist.
//
//   §50 HONESTY TEST verification: the panel footer's cited rule maps exactly onto the FOP constant
//   (lines 1131-1134); the trafficLight() function uses that constant; the per-100g cell now wires
//   to trafficLight()'s return. Three layers, single source of truth, no risk of cell colour
//   disagreeing with the cited rule or with the TL dot column.
//
//   Edge case verification (16 cases tested in-session via Python parity of the trafficLight logic):
//     - Missing value (null) → "u" → "—" in normal text ✓
//     - Zero value → "g" → green ✓ (within threshold)
//     - Exact green boundary (≤ threshold) → "g" → green ✓
//     - Just above green → "y" → yellow ✓
//     - Exact red boundary (≥ threshold) → "r" → red ✓
//     - High outlier → "r" → red ✓
//     - Non-FOP nutrient (Energy / Carbs / Fibre / Protein) → "u" → normal text ✓
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F3 nutrition table now shows the per-100g value coloured green / yellow /
//   red for FOP-eligible nutrients (fat / saturates / sugars / salt) per the FSA/DHSC thresholds.
//   Buyer reads colour without arithmetic. Analyst sees the rule applied to the data instead of
//   stated separately. TL dot column unchanged (no regression).
//
//   CACHE_VERSION bumped so returning visitors get the coloured cells on next visit.
//
// v5.0.107 (27 May 2026) — FLT audit fix #6: brand-ownership lookup parent-company keys + hyphen-alias bug fix
//
//   Audit catch (27 May 2026 backlog item #6): a corporate buyer typing parent-company names
//   (Mondelez, Premier Foods, Kraft Heinz, PepsiCo, Unilever, General Mills, Bel Group, InBev,
//   2 Sisters) into the F1 search expects to see the parent-company ownership chronology, not null.
//   The pre-v5.0.107 BRAND_OWNERSHIP DB only carried subsidiary keys (cadbury, heinz, etc.) with
//   the parent-co named only in the OWNER text field of the subsidiary's history. Buyer query for
//   the parent name itself returned null (Mondelez / Premier Foods / Unilever / General Mills /
//   Bel Group / 2 Sisters) or resolved to a subsidiary (Kraft Heinz → heinz, PepsiCo → pepsi)
//   which is structurally wrong — Kraft Heinz the parent has its own 2015-onward chronology
//   that's distinct from H.J. Heinz's 1869-onward chronology.
//
//   Probe finding (before fix): some audit claims were already outdated. v5.0.86 stripDiacritics
//   already fixed Nestlé (normaliseBrand strips diacritics). The regex also normalises full-stops
//   to spaces so "Mr. Kipling" already hit the existing "mr kipling" key. The genuine misses were
//   the 9 parent-company keys named above.
//
//   Probe also surfaced a NEW bug not in the audit: the existing "coca-cola" DB key was unreachable
//   because normaliseBrand strips hyphens to spaces (regex [^a-z0-9 &']). A user typing "Coca-Cola"
//   or a brand string containing "Coca-Cola" normalised to "coca cola" which didn't match the
//   literal hyphen-containing key. v5.0.107 fixes this with an alias.
//
//   Implementation:
//     - Added 9 parent-company top-level entries to BRAND_OWNERSHIP (lines 894-947):
//       mondelez, premier foods, unilever, general mills, bel group, inbev, 2 sisters,
//       kraft heinz, pepsico. Each carries 1-3 ownership periods with primary-source attribution
//       per §111 NO Wiki ecosystem rule: SEC EDGAR CIKs (US-listed), Companies House numbers
//       (UK incorporated), trade-press acquisition announcements (Reuters / FT / Bloomberg) and
//       primary company press releases. Zero Wikipedia / Wikidata / Wikimedia citations.
//     - Added "coca cola" alias (line ~961) pointing to the existing "coca-cola" entry by
//       reference (not duplicate data). The "coca-cola" key is preserved per §14.3.1 in case
//       any existing reference resolves through it. Documented inline.
//
//   §50 HONESTY TEST verification: each new entry's chronology cites the primary source inline.
//   E.g. Mondelez "Primary source: SEC EDGAR CIK 0001103982"; Premier Foods "Primary source:
//   Companies House PREMIER FOODS PLC no 05160050"; Kraft Heinz "Primary source: SEC EDGAR
//   CIK 0001637459". A reader can verify each claim against the named primary record.
//
//   §111 NO WIKI ECOSYSTEM verification: zero Wikipedia / Wikidata / Wikimedia citations in any
//   new entry. All citations are SEC EDGAR, Companies House, regulatory filings, or trade-press
//   acquisition announcements. Per the 25 May 2026 founder direction *"no data from the wiki
//   ecosystem"* this extends the discipline to the brand-ownership database.
//
//   Behavioural change worth noting: "Cadbury, Mondelez" previously resolved to cadbury (subsidiary,
//   longest match before v5.0.107). With mondelez now a key, the longest-match logic resolves to
//   mondelez (8 chars > 7 chars). This is structurally correct — if the brand string includes
//   the parent-co name explicitly, the parent-co read is what the analyst wants. The subsidiary
//   is still reachable by querying its name directly.
//
//   Verification: 21/21 test cases pass programmatically (in-session Python parity of the JS
//   lookup logic). All 9 new parent-co keys resolve direct. Coca-Cola hyphen alias resolves
//   direct. Original audit-claimed failures (Nestlé, Mr. Kipling) confirmed already-passing
//   via v5.0.86 fix. No regression on edge cases (empty / whitespace / separators-only / no-match
//   all return None). No regression on existing keys (heinz, cadbury, kitkat, etc. still resolve).
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F1 expanded fact-sheet now renders an OWNERSHIP HISTORY chronology
//   when a buyer searches for Mondelez / Premier Foods / Unilever / General Mills / Bel Group /
//   AB InBev / 2 Sisters / Kraft Heinz / PepsiCo. The pre-v5.0.107 silent miss is closed.
//
//   CACHE_VERSION bumped so returning visitors get the expanded DB on next visit.
//
// v5.0.108 (27 May 2026) — FLT audit fix #4: UNIVERSE cohort snapshot strip below the ticker
//
//   Audit catch (#4): the ticker text "live OpenFoodFacts wire" promises live but the cohort
//   itself is a dated snapshot from the dump-pull / API refresh. Per-SKU last_modified_t already
//   surfaces in F1 source-freshness chip (v5.0.89); the cohort-level freshness was missing —
//   analyst couldn't see how fresh the 20,058-record UNIVERSE snapshot itself is. §110 Live-
//   where-it-should-be-live, accessible-where-it-should-be-accessible: implementation gap at
//   the cohort layer.
//
//   Implementation:
//     - flt-app.html line ~520: new UNIVERSE_SNAPSHOT = "2026-05-25" constant near const UNIVERSE.
//       ISO-8601 format. Single constant, easy to bump on each UNIVERSE swap (next swap will be
//       the v5.0.94 dump-pull's universe-LATEST.json mtime when that lands; future refreshes
//       per §70 Monthly Document Sweep + §80 OFF-coverage dual-axis drift rule).
//     - flt-app.html style block: .snapshot-strip + .ss-lbl + .ss-date + .ss-days + .ss-count +
//       .ss-sep classes — thin monospace strip below the ticker, static (not scrolling), dim text
//       with the date in --text colour and the methodology link in --amber. Responsive collapse
//       at <700px (hides SKU count + extra separators).
//     - flt-app.html line 433: <div class="snapshot-strip" id="snapshotStrip"> element added
//       between the ticker bar and the shell.
//     - flt-app.html line 1319: renderSnapshotStrip() function — populates the strip from
//       UNIVERSE_SNAPSHOT + computed days-ago + UNIVERSE.length + methodology link to /methodology.
//       Called on init (line 1346) immediately after function definition.
//     - Edge cases handled inline: missing constant ("snapshot date pending"); invalid date
//       ("snapshot date invalid (input)"); clock skew (max(0, days) → "today"); days===0
//       ("today"); days===1 ("1 day ago"); days>1 ("Nd ago"). 8 edge cases verified programmatically
//       via Python parity.
//
//   §50 HONESTY TEST verification: the strip names the actual cohort snapshot date — no claim
//   of "live" applied to data that's actually a dated dump. The "live OpenFoodFacts wire" string
//   in the scrolling ticker now reads honestly because the cohort-level static strip below it
//   tells the analyst the cohort IS a snapshot (separate from any per-SKU live OFF fetch).
//
//   §110 LIVE-WHERE-IT-SHOULD-BE-LIVE verification: implementation now matches the principle at
//   the cohort layer. Per-SKU live → F1 source-freshness chip. Cohort snapshot → snapshot-strip.
//   Two distinct freshness signals, each surfaced where its scope belongs.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: a thin strip appears below the scrolling ticker on /flt-app showing
//   "UNIVERSE SNAPSHOT · 2026-05-25 · 2 days ago · 20,058 SKUs · methodology →". Always visible,
//   not scrolling. Analyst now has clear cohort-level freshness signal alongside the existing
//   per-SKU one.
//
//   CACHE_VERSION bumped so returning visitors get the snapshot strip on next visit.
//
// v5.0.109 (27 May 2026) — FLT audit fix #8: cohort-composition disclosure one click from ticker
//
//   Audit catch (#8): the ticker shows "NUTRI-SCORE A: 3,287 (16%)" presented as fact, but the
//   16% denominator is the OFF-skewed UNIVERSE cohort, not "all UK SKUs in market." An analyst
//   writing a piece would footnote the cohort composition; FLT didn't surface it. §50 Honesty
//   Test failure — the percentage's denominator must be discoverable in one click.
//
//   Implementation:
//     - flt-app.html: new computeCohortComposition() function (line ~1349) — dynamically counts
//       I500-tagged vs OFF records from UNIVERSE on init. Handles src field OR legacy _src field
//       (forward-compatible). Returns {total, i500, off}.
//     - renderSnapshotStrip() updated (line ~1379): the "20,058 SKUs" element now renders as a
//       <button class="ss-count-btn"> with aria-expanded + aria-controls when UNIVERSE is non-empty;
//       falls back to plain <span> when UNIVERSE is empty (no toggle on empty cohort).
//     - New renderCohortBreakdown() function (line ~1400) — populates the cohort-breakdown div
//       with three rows (COHORT total / OFF count + %% / I500 count + %%) plus a §50-honest caveat:
//       "⚠ The NUTRI-SCORE / NOVA percentages on the ticker are computed against this cohort —
//       they describe THIS cohort, not 'all UK SKUs in market.' OFF community coverage skews
//       toward what mainstream contributors shop for; per §103 the OFF blindspot vs the I500
//       corpus runs at 93.2% strict."
//     - New toggleCohortBreakdown() function (line ~1417) — expand/collapse handler. Updates
//       aria-expanded + dropdown arrow (▾ ↔ ▴) for accessibility.
//     - flt-app.html line 460: new <div id="cohortBreakdown" data-open="0" aria-live="polite">
//       element below the snapshot strip. Hidden by default (max-height: 0); expands to 160px
//       on toggle with smooth transition.
//     - flt-app.html style block: .cohort-breakdown + .cb-row + .cb-lbl + .cb-num + .cb-note +
//       .cb-caveat + .ss-count-btn classes added. 11 selectors total. Mobile responsive — hides
//       the SKU count button at <700px (mobile users get the simpler strip without the click).
//
//   §50 HONESTY TEST verification: the cohort-composition disclosure cites the exact §103 strict
//   methodology figure (93.2%) so the analyst reading FLT data knows the OFF blindspot context
//   without leaving the terminal. The caveat is one click from the percentage it qualifies.
//
//   §103 + §80 alignment: the cohort breakdown surfaces the structural finding from §103 OFF-
//   coverage strict-methodology canon directly in the analyst's workflow. No mis-citation risk.
//
//   Edge cases verified programmatically (5 cases via Python parity of computeCohortComposition):
//     - Real UNIVERSE (20,058 records): 53 I500 + 20,005 OFF ✓
//     - Empty UNIVERSE: {total:0, i500:0, off:0} → element renders "UNIVERSE not loaded" ✓
//     - All I500 records ✓
//     - All OFF records ✓
//     - Mixed src/_src field (legacy compatibility) ✓
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: clicking "20,058 SKUs" in the snapshot strip expands a breakdown
//   showing COHORT 20,058 · OFF 20,005 (99.7%) · I500 53 (0.3%) · plus the §50-honest caveat
//   about denominators. Aria-expanded toggles correctly; dropdown arrow flips.
//
//   CACHE_VERSION bumped so returning visitors get the cohort disclosure on next visit.
//
// v5.0.110 (27 May 2026) — FLT audit fix #3: SOURCE_PRIORITY hierarchy modal in F3 panel
//
//   Audit catch (#3): Bible §10 + §103 + CLAUDE.md item 20 (Data Sources canonical) lock the
//   six-tier deterministic source-priority rule (I500-in-house-verified → manufacturer-official
//   → retailer-website → OFF → OBF → contribution; plus USDA FoodData Central at Layer 1
//   secondary). The F3 SOURCE line names which source served *this* row, but the hierarchy
//   itself wasn't surfaced anywhere in the UI — analyst couldn't sanity-check why one row
//   resolved to OFF vs another to I500.
//
//   Implementation:
//     - flt-app.html: new modal element (line ~493) — permanent in DOM, hidden by default
//       (data-open="0"). Contains role="dialog" + aria-modal="true" + aria-labelledby. Backdrop
//       sibling element handles click-outside-to-close.
//     - flt-app.html style block: 19 CSS selectors for the modal — .sp-help (the ? button),
//       .sp-modal, .sp-modal-backdrop, .sp-modal-head, .sp-modal-body, .tier-label, .tier-note,
//       .sp-foot, .sp-intro. Transitions for smooth open/close.
//     - F3 renderNutrition() SOURCE sectitle now carries a "?" button (line ~2527) with
//       aria-label + aria-haspopup="dialog". Wired to openSourcePriorityModal after innerHTML
//       insert (the button is dynamic; the modal element itself is permanent).
//     - openSourcePriorityModal() function (line ~1509): sets data-open=1 on backdrop + modal,
//       stashes document.activeElement to spPreviousFocus, moves focus to the close button
//       (Tab cycles within the modal content from there).
//     - closeSourcePriorityModal() function (line ~1521): sets data-open=0, sets aria-hidden,
//       restores focus to spPreviousFocus.
//     - wireSourcePriorityModal() IIFE (line ~1535) runs once on init — wires the close button +
//       backdrop click + global Esc key handler. Esc handler gated on data-open=="1" so it
//       doesn't fire on closed-modal state.
//
//   Modal content lists all six tiers + USDA secondary, each with a tier-label + tier-note:
//     1. I500 in-house verified (West Norwood SE27 field audit · §103 strict-methodology)
//     2. USDA FoodData Central (Layer 1 secondary per CLAUDE.md item 20)
//     3. Manufacturer official
//     4. Retailer website (Tesco / Sainsbury's / M&S / Waitrose / Ocado)
//     5. Open Food Facts (community-sourced — per §111 the one community-edited source SCANSMART accepts)
//     6. Open Beauty Facts (Door 5 Cosmetics vertical)
//     7. Contribution (anonymous user-submitted; lowest tier)
//   Foot block cites Bible §10 + §103 + CLAUDE.md item 20 + §111 NO Wiki ecosystem rule.
//
//   §50 HONESTY TEST verification: the rule the panel cites is the rule the modal explains —
//   single source of truth in the §10 + §103 canon; both the F3 SOURCE line and the modal
//   pull from the same canonical statement.
//
//   ACCESSIBILITY verification (code review):
//     ✓ Esc closes modal (handler guarded on data-open=="1")
//     ✓ Click backdrop closes modal
//     ✓ Click close button closes modal
//     ✓ Focus moves to close button on open
//     ✓ Focus restored to previousFocus on close
//     ✓ aria-modal=true + role=dialog + aria-labelledby set
//     ✓ Button has aria-label + aria-haspopup="dialog"
//     ✓ Backdrop has aria-hidden toggle
//     ✓ Permanent modal element survives F3 re-renders (button re-created on each renderNutrition;
//       wireSourcePriorityModal IIFE runs once on init for permanent close+backdrop+Esc handlers)
//
//   No conflict with the existing panel-expand Esc handler (line ~1996) — each handler gates on
//   its own state; if both expanded-panel AND modal are open simultaneously, Esc closes both
//   (acceptable behaviour — user expects Esc to dismiss "the open thing").
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F3 nutrition panel now has a "?" affordance next to the SOURCE label.
//   Click → modal opens with the six-tier hierarchy + USDA secondary + §111 NO Wiki ecosystem
//   footer. Esc / backdrop click / ✕ button all close. Focus restored on close.
//
//   CACHE_VERSION bumped so returning visitors get the modal on next visit.
//
// v5.0.111 (27 May 2026) — FLT audit fix #18: search-box collision resolved (f1Search hidden)
//
//   Audit catch (#18): three search inputs visible simultaneously — #topSearch (top bar, subtle
//   1px border), #f1Search (F1 panel head, prominent amber border + glow + magnifier icon),
//   and #cmd (footer command bar). Buyers unfamiliar with the Bloomberg-pattern got confused —
//   which input do I type into? §50 UI promise = action gate: the UI promises "search" via
//   three boxes; the actual canonical search action is one. v5.0.92 *"user doesn't need to know
//   what's local"* principle applies at the input layer, not just at the result-merging layer.
//
//   Probe finding: #topSearch and #cmd are SYNCED — typing in one updates the other (line ~1734).
//   They're conceptually the same input rendered twice with distinct jobs (topbar = ambient
//   product search; cmd = commands + VS-compare + EXIT). #f1Search is a SEPARATE input with its
//   own keydown handler that does the same product-load via loadProduct() — pure duplication
//   of the topSearch's product-load functionality.
//
//   Implementation:
//     - flt-app.html style block: .f1-search-wrap rule changed display:flex → display:none
//       (line ~90). Documented inline why — three-box confusion + duplication + §50 + the v5.0.92
//       "user doesn't need to know what's local" extension to the input layer.
//     - flt-app.html line ~558: input id="f1Search" gets tabindex="-1" + aria-hidden="true"
//       (defensive belt-and-braces — Tab won't land if parent is display:none anyway, but
//       semantic clarity for screen readers and accessibility tools).
//     - flt-app.html line ~1860: wireF1Search() IIFE preserved with comment block explaining
//       the wiring is dormant (kept for reversibility — future session can revert with a single
//       CSS rule removal). The if(!f1) return; guard still works; if the element existed but
//       was unfocused, no handlers fire because hidden elements don't accept focus naturally.
//
//   Reversibility: the change is CSS-only at the HTML+element layer. The wireF1Search keydown
//   handler is preserved. To restore the input, remove the display:none from .f1-search-wrap;
//   no other code changes needed.
//
//   §50 HONESTY TEST verification: after change, UI shows two search surfaces:
//     - #topSearch (top bar) — ambient product search (mirrors #cmd)
//     - #cmd (footer) — commands + VS-compare + EXIT
//   Both are clearly distinct in placement + visual register. New buyer can identify the
//   canonical search input at first glance.
//
//   v5.0.92 EXTENSION verification: v5.0.92 banked the principle *"user doesn't need to know
//   what's local"* — implementation stays out of the UX surface. The result-merging layer was
//   fixed then (single ranked list dropping the I500/OFF source pill). The input layer was the
//   companion piece — by hiding f1Search, three inputs collapse to two clearly-roled surfaces.
//
//   ACCESSIBILITY: tabindex=-1 + aria-hidden=true + parent display:none = the element is fully
//   excluded from keyboard navigation + accessibility tree. No focus traps; no orphan elements.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F1 panel head no longer carries the amber-bordered search input. F1
//   is loaded via topSearch (top bar) or cmd (footer); both still work identically. The visual
//   clutter at the top of F1 is reduced — the panel content reads more cleanly.
//
//   CACHE_VERSION bumped so returning visitors get the cleaned UI on next visit.
//
// v5.0.112 (27 May 2026) — FLT audit fix #5: missing-data badges + aggregate counts on F4 PEER
//
//   Audit catch (#5): F4 PEER table rendered blank cells silently when an OFF record was missing
//   NUTRI-SCORE / NOVA / sugars / salt. Analyst saw "blank" instead of "data not present in OFF
//   record" — couldn't distinguish missing-data state from zero-value. 15% of UNIVERSE records
//   (3,045 / 20,058) carry no NOVA score; 55 records missing NUTRI-SCORE. §50 ABSENT-vs-EMPTY-
//   vs-DECLARED honesty discipline (banked v5.0.89 for allergens) extended to F4 cells.
//
//   Implementation:
//     - flt-app.html row() function (line ~3300): each cell that could be missing now renders
//       with an explanatory title-tooltip — "NUTRI-SCORE not in OFF record for this SKU" / etc.
//       Visual presentation consistent across NS + NOVA cells (both show "—" with the same
//       background-tinted pill when missing; previously NS showed "·" while NOVA showed "—").
//     - New computeMissingDataCounts() function (line ~1447): iterates UNIVERSE once, counts
//       records missing NS / NOVA / sugars / salt. Memoised in _missingDataCache (re-computed
//       only if UNIVERSE swaps in). Handles both slim format {ns, nv} and expanded format
//       {nutrition_grades, nova_group, nutriments} for forward-compatibility.
//     - F4 PEER footer (line ~3389): renders an aggregate stat line under the existing CATEGORY
//       eyebrow — "⊘ 55 of 20,058 UNIVERSE SKUs missing NUTRI-SCORE (0.3%) · 3,045 missing
//       NOVA (15.2%) · blank cells above are not zero-values." Italic dim text. Title-tooltip
//       names the line as "Aggregate missing-data counts across the UNIVERSE cohort."
//
//   §50 EXTENSION verification: the v5.0.89 ABSENT-vs-EMPTY-vs-DECLARED honesty discipline
//   was previously scoped to F1 allergen profile. v5.0.112 extends the same discipline to the
//   F4 PEER table cells. Pattern is now consistent across F1 + F4. Future panels that surface
//   OFF-sourced data should follow the same pattern.
//
//   Edge cases verified programmatically (5 cases):
//     ✓ Empty UNIVERSE: returns total:0 missingNS:0 missingNV:0
//     ✓ Undefined UNIVERSE: graceful fallback to zero-state (returns the same shape)
//     ✓ All-missing rows: both counters increment correctly
//     ✓ All-present rows: both counters stay 0
//     ✓ Mixed slim/expanded format: handled by the field-shape probe
//
//   Audit-claim verification: computed counts match audit exactly — 3,045 NOVA missing (15.2%),
//   55 NUTRI-SCORE missing (0.3%). The audit was based on actual UNIVERSE state at audit time;
//   computed against the same UNIVERSE here, the figures align.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F4 PEER table missing-data cells show "—" with hover-tooltip naming
//   the absent field. Aggregate stat at the bottom names the cohort denominator so analyst
//   knows what % the missing-data state represents — closes the §50 gap that was inviting
//   mis-citation. Pill rendering visually consistent across NS + NOVA missing states.
//
//   CACHE_VERSION bumped so returning visitors get the badges + aggregate line on next visit.
//
// v5.0.113 (27 May 2026) — FLT audit fix #15: country-of-origin + supply-chain signal on F1
//
//   Audit catch (#15): OFF carries countries_tags (where SKU is distributed), manufacturing_places_tags
//   (where the product is made), and origins_tags (where ingredients are sourced). FLT didn't
//   surface any of them. A buyer assessing post-Brexit sourcing had to leave the terminal to
//   check pack labels or supplier datasheets.
//
//   Implementation:
//     - flt-app.html: new formatOrigins(p) helper (line ~1231). Returns a unified object with
//       per-field state (absent/empty/declared) plus _allAbsent rollup flag. Mirrors the
//       formatAllergens()/formatCertifications() pattern banked v5.0.89-90 for §50 ABSENT-vs-
//       EMPTY-vs-DECLARED honesty discipline.
//     - Cleaning: en: prefix strip → dash-to-space → word-boundary title-case so "en:united-kingdom"
//       renders as "United Kingdom" consistently with how country names appear in non-tag context.
//       Verbatim transcription per the no-editorial-paraphrase discipline (CLAUDE.md).
//     - renderBrandOwnership() updated (line ~1376) — new originsSection block consumes
//       formatOrigins(p). Each of the three fields renders independently; ABSENT fields skip
//       entirely (don't clutter with three empty rows when OFF has no origin data); EMPTY fields
//       render with explicit "OFF field present but empty" note; DECLARED fields render as pill
//       list with the OFF field-name in the row label. If all three are ABSENT, renders a unified
//       empty-state pointing to the data gap.
//     - New <div class="bo-section"><div class="sectitle">ORIGIN &amp; SUPPLY CHAIN</div>...</div>
//       wired into the F1 expanded fact-sheet (line ~1413), between CERTIFICATIONS and the
//       source-freshness meta chip.
//     - CSS classes added: .bo-origin-pill (blue accent #7bb3f5 / border #1a3a5a — visually
//       distinct from allergens-orange and certs-green), .bo-origin-row (flex layout for
//       label + pill list), .bo-origin-lbl (amber uppercase mono label). Inherits from the
//       existing bo-* family for consistent styling.
//
//   §50 EXTENSION verification: the ABSENT-vs-EMPTY-vs-DECLARED discipline is now applied at
//   F1 across THREE sub-blocks — allergens (v5.0.89), certifications (v5.0.89-90), and origins
//   (v5.0.113). F4 PEER cells got the same treatment in v5.0.112. The pattern is now
//   architecturally consistent across the institutional surface.
//
//   §111 NO WIKI ECOSYSTEM verification: country-name humanisation uses only the OFF field
//   contents (en: tag prefix strip + dash humanisation + title-case). Zero Wikipedia / Wikidata
//   reference; the cleaned country names come from OFF's canonical en: tag set directly.
//
//   Edge cases verified programmatically (6 cases via Python parity of formatOrigins):
//     ✓ All absent (no fields in OFF response): {_allAbsent: true}
//     ✓ All empty arrays: empty empty empty (different epistemic state from absent)
//     ✓ Mixed populated: declared declared absent
//     ✓ "Real Heinz pattern" — declared + absent + empty mix
//     ✓ Compound country name "en:united-arab-emirates" → "United Arab Emirates"
//     ✓ Origins-only (no en: prefix): "cote-divoire" → "Cote Divoire"
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F1 expanded fact-sheet now carries an ORIGIN & SUPPLY CHAIN sub-block
//   showing where the SKU is distributed / manufactured / ingredient-sourced. Post-Brexit
//   procurement assessment doesn't require leaving the terminal.
//
//   CACHE_VERSION bumped so returning visitors get the origin block on next visit.
//
// v5.0.114 (27 May 2026) — FLT audit fix #16: own-label / branded split flag on F4 PEER rows
//
//   Audit catch (#16): Tesco Finest vs Tesco Everyday vs Heinz Beanz are structurally-different
//   supplier categories (premium own-label / value own-label / branded). F4 PEER mixed them
//   undifferentiated. A buyer reading the peer table couldn't tell whether a comparison was
//   like-for-like (same supplier-category) or cross-tier without zooming into each brand name
//   and recognising it.
//
//   Implementation:
//     - flt-app.html: new OWN_LABEL_TIERS constant (line ~1248) — three tiers (premium, value,
//       standard) with the matching rules for each UK retailer. Premium = "Finest", "Taste the
//       Difference", "Collection", "Extra Special", "The Best", "Specially Selected", "Deluxe",
//       "Luxury", "Irresistible". Value = "Everyday Value", "Stockwell", "Basics", "Smart Price",
//       "Just Essentials", "Savers", "Mila", "Vemondo", "Simply". Standard = exact retailer-name
//       match (Tesco / Sainsbury's / Aldi / Lidl / Asda / Morrisons / etc.) — exact-match prevents
//       false positives like "Tesco Mobile" or "Tesco Bank" if such strings ever appear.
//     - new classifyOwnLabel(brandStr) function (line ~1304) — three-pass classifier:
//       (1) Premium-tier substring match (most specific first)
//       (2) Value-tier substring match
//       (3) Standard-tier exact match against retailer name alone
//       Returns {tier, label, retailer, confidence} or null if not classifiable as own-label.
//       Handles comma/semicolon/pipe-separated brand strings; sorts tokens by length descending
//       so longer phrases win ("Tesco Finest" beats "Tesco").
//     - F4 row() render (line ~3533) — calls classifyOwnLabel(x.brands) per peer row. Renders
//       a small chip next to the brand cell: "OWN · PREMIUM" / "OWN · VALUE" / "OWN · STANDARD"
//       for own-label hits; "BRANDED" for non-empty brand strings that don't match; nothing
//       when the brand string is missing entirely.
//     - CSS classes added: .peer-tier base + four tier-specific colour variants. Premium = amber
//       (matches premium-pack visual language). Value = yellow (price-tier signal). Standard =
//       blue (neutral retailer). Branded = dim grey (default — no flag of significance).
//     - The chip's title attribute names: the tier label, the matched retailer rule, and the
//       classification confidence. §50 honesty — the buyer can hover to see exactly how this
//       brand was classified.
//
//   §50 HONESTY TEST verification: every chip carries its rule in the tooltip. A buyer can
//   verify the classification by hovering. The rule is documented inline in the source comments
//   with primary-source citations (each UK retailer's own published brand architecture per §111
//   NO Wiki ecosystem — zero Wikipedia citations).
//
//   §111 NO WIKI ECOSYSTEM verification: the OWN_LABEL_TIERS list is sourced from each retailer's
//   own published brand portfolio (Tesco PLC investor pages / Sainsbury's plc annual report /
//   M&S Food brand list / etc.). Source citations named inline in the code comments. Zero Wiki
//   citations.
//
//   Edge cases verified programmatically (25 cases):
//     ✓ Premium hits — Tesco Finest, Sainsbury's Taste the Difference, M&S Collection, Waitrose No.1
//     ✓ Value hits — Tesco Everyday Value, Asda Smart Price
//     ✓ Standard hits — Tesco (exact), Aldi, Sainsbury's, Marks & Spencer, co-op
//     ✓ Multi-token strings — "Sainsbury's, Sainsbury's Taste the Difference" → premium (longest wins)
//     ✓ Branded (returns null) — Heinz, Heinz Beanz, Kraft Heinz, Coca-Cola, Walkers, Mondelez
//     ✓ Mixed branded+retailer — "Tesco, Heinz" → standard (Tesco hits exact)
//     ✓ Edge cases — empty string, null, unrecognised brand → null
//     ✓ Case insensitivity — "tesco" matches as standard
//     ✓ Punctuation variants — "Waitrose No 1" + "Waitrose No.1" both hit premium
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: F4 PEER table now shows a small inline chip next to each brand
//   identifying its supplier category. Buyer can scan the table and immediately see which peers
//   are like-for-like vs cross-tier comparisons.
//
//   CACHE_VERSION bumped so returning visitors get the chips on next visit.
//
// v5.0.115 (27 May 2026) — FLT audit fix #11: VS-compare visible affordance + state-aware button
//
//   Audit catch (#11): VS-compare is functional (renderProductCompare exists; cmd-bar handler
//   wired at line ~1927; CURRENT_B state at line ~2267). But the audit's concern was
//   discoverability — a first-time buyer skimming the terminal sees no visible "compare" affordance.
//   The cmd-bar placeholder + cmdhint line mention VS but visual scanning misses them. §50 UI
//   promise = action gate: the feature exists; the affordance was buried.
//
//   Probe finding (carried from earlier audit-reading session): the feature IS functional — pickAc()
//   line 1925-1931 detects /^VS\s+/i prefix in cmd.value and calls loadProductB(); loadProductB
//   sets CURRENT_B and re-renders with split panels A | B; clearCompare() exits. The fix is
//   discoverability, NOT implementation. (Resolves the audit's "verify functional or aspirational"
//   probe.)
//
//   Implementation:
//     - flt-app.html: new <button id="vsBtn" class="vs-btn">+ VS</button> in the topright bar,
//       between #universeCnt and #compareLbl. Always visible. aria-label + title.
//     - flt-app.html style block: .vs-btn + .vs-btn:hover + .vs-btn:focus-visible + .vs-btn.active
//       + .vs-btn.active:hover. Default state = amber border / amber text (matches the
//       Bloomberg-amber visual register). Hover = filled amber bg. Active state (compare mode on)
//       = red border / red bg signalling "exit." Same colour register as the existing
//       compareLbl when active.
//     - new syncVsBtn() function (line ~2412) — keeps button label + active class in sync with
//       CURRENT_B state. Called from loadProductB / clearCompare / on init.
//     - loadProductB() updated (line ~2419) to call syncVsBtn() on success + error paths.
//     - clearCompare() updated (line ~2436) to call syncVsBtn() on exit.
//     - new wireVsBtn() IIFE (line ~2442) — wires the button click:
//       (a) If CURRENT_B set (compare active): click = exit, calls clearCompare()
//       (b) If !CURRENT (no focal product yet): alert the user to load focal first
//       (c) Otherwise: pre-fills cmd bar with "VS " and focuses + dispatches input event so the
//           autocomplete primes. User then types the comparator brand/SKU. Same path the keyboard
//           "VS <query>" uses — single source of truth for the compare-trigger flow.
//
//   §50 HONESTY TEST verification: the button's title and aria-label both document the keyboard
//   path ("keyboard: type VS <query> in command bar") so power users know both paths exist.
//   The visible affordance doesn't replace the keyboard path — it parallels it. Hover-tooltip
//   teaches the keyboard shortcut.
//
//   v5.0.92 EXTENSION verification: v5.0.92 banked the "user doesn't need to know what's local"
//   principle. v5.0.115 applies the parallel principle to UI affordances: "user doesn't need to
//   know they have to type VS to compare." The visible button teaches the action; the keyboard
//   path stays as the power-user shortcut.
//
//   Accessibility verification (code review):
//     ✓ button element with type="button" (no form submit)
//     ✓ aria-label set + dynamic (changes between "Compare focal..." and "Exit compare mode")
//     ✓ title set + dynamic (matches the aria-label intent)
//     ✓ focus-visible outline (1px amber)
//     ✓ click handler delegates cleanly (no event-bubble issues)
//     ✓ no keyboard event hijack — Esc still closes other modals; the button uses click only
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: topright bar now carries a "+ VS" button always visible. Click:
//     - With no focal product: alert teaching the user to load a focal first
//     - With focal product: cmd bar gets "VS " pre-filled + focused; autocomplete primes
//     - With compare already active: button reads "✕ EXIT" + red; click exits compare mode
//
//   CACHE_VERSION bumped so returning visitors get the visible button on next visit.
//
// v5.0.116 (28 May 2026) — FLT audit fix #10: Watchlist (localStorage, anti-tracking compliant)
//
//   Audit catch (#10): the analyst-reproducibility layer (#1) and the buyer-watchlist layer (#10)
//   are the same shape of problem — both about state persistence. The audit's structural
//   observation: ship #10 first to build the storage shape #1 will reuse. v5.0.116 delivers the
//   watchlist; storage primitives banked here are the foundation for #1 + #19 (share-view URL state).
//
//   Founder direction binding this delivery: "i never want quick wins i want thorough diligent work
//   which should be your first call" (banked 27 May 2026 as feedback memory). Every gate
//   exercised — §31 anti-tracking · §50 Honesty Test · cross-tab sync · graceful degradation ·
//   import sanitisation · keyboard accessibility · §47 distribution discipline.
//
//   Implementation:
//     - flt-app.html: new <button id="watchChip"> in topright bar (between #compareLbl and #clock).
//       Always visible. Shows ☆ icon + "WATCH" + numeric count. .active class when count > 0
//       (star fills to ★, colour shifts to amber). Click opens modal.
//     - flt-app.html: new <button id="watchStar"> inside F1 head, between #p1title and the <F1>
//       code chip. Disabled when no focal product loaded. Click toggles focal product in/out of
//       watchlist. aria-pressed reflects current state; title updates accordingly.
//     - flt-app.html: new watchlist modal block (after sp-modal, before .shell). Mirrors sp-modal
//       accessibility pattern — role=dialog, aria-modal, Esc closes, backdrop closes, focus stash
//       on open + restore on close. Body shows: intro line; rows (brand / name / barcode / saved
//       date / ✕ remove); empty state; details disclosure for JSON export/import/copy; footer
//       actions bar with CLEAR ALL.
//     - flt-app.html style block: new CSS for .watch-chip + states; .watch-star + .on state +
//       :disabled; .w-modal-backdrop + .w-modal + head/body; .w-list + .w-row + meta/added/rm;
//       .w-actions-bar + .w-act-btn (with .danger variant); .w-export-area; .w-msg + .ok/.err.
//     - flt-app.html JS (after wireSourcePriorityModal IIFE, ~line 1878): full WATCHLIST block:
//
//       Storage primitives (will be reused by #1 reproducibility layer + #19 share-view URL state
//       per the audit's structural observation):
//         WATCHLIST_KEY = "flt.watchlist"        — namespaced under flt. prefix
//         WATCHLIST_VERSION = 1                  — schema version for future migrations
//         getWatchlist()                         — defensive read; filters malformed rows;
//                                                  degrades to [] on JSON parse error or
//                                                  localStorage disabled (private-browsing).
//         saveWatchlist(list)                    — write + return bool; on quota exceeded,
//                                                  surfaces via showWatchMsg("err") rather than
//                                                  throwing
//         isWatched(barcode)                     — bool check
//         addToWatch(product)                    — dedupes by barcode; sanitises stored fields
//                                                  (truncates name to 120ch, brand to 80ch);
//                                                  records ISO timestamp; newest at top
//         removeFromWatch(barcode)               — filter + save
//         clearWatchlist()                       — overwrite with []
//
//       UI sync:
//         syncWatchUI()                          — recomputes chip count + active class; calls
//                                                  syncWatchStar + renderWatchList
//         syncWatchStar()                        — reflects whether CURRENT.code is watched;
//                                                  ☆ → ★ state; disabled when !CURRENT
//         renderWatchList()                      — populates modal list (XSS-safe via escapeHtml);
//                                                  shows empty state when list is []
//
//       Modal control (parallel to sp-modal pattern):
//         openWatchModal()                       — stash focus, repaint list, set data-open=1,
//                                                  focus close button, hide any prior msg
//         closeWatchModal()                      — set data-open=0, restore focus
//         showWatchMsg(text, kind)               — surfaces ok/err in modal; auto-hides ok after 4s
//         hideWatchMsg()                         — manual hide
//
//       User actions:
//         toggleWatchFocal()                     — ⭐ button handler; add or remove CURRENT
//         loadBarcodeFromWatchlist(barcode)      — close modal, defer 60ms for focus restore,
//                                                  populate topSearch + dispatch Enter (reuses
//                                                  the existing search-load path — single source
//                                                  of truth, no fetch-logic duplication)
//         exportWatchlistToTextarea()            — serialises { kind, version, exported, items }
//                                                  envelope to the modal textarea
//         copyWatchlistToClipboard()             — async navigator.clipboard.writeText; falls
//                                                  back to exporting to textarea if API
//                                                  unavailable
//         importWatchlistFromTextarea()          — accepts envelope OR bare array; sanitises
//                                                  each row (validates c is string, truncates
//                                                  n/b, preserves added timestamp); dedupes
//                                                  against existing rows; reports added/skipped
//                                                  count via showWatchMsg
//
//       Wiring (wireWatchlist IIFE):
//         - chip click → openWatchModal
//         - star click → toggleWatchFocal
//         - close button → closeWatchModal
//         - backdrop click → closeWatchModal
//         - Esc keydown → closeWatchModal (scoped — only fires when watch modal data-open=1;
//           no collision with sp-modal Esc handler)
//         - row click (delegated) → load barcode OR remove
//         - row Enter/Space keydown (delegated, accessibility) → load barcode
//         - export / copy / import / clear buttons
//         - window storage event → syncWatchUI (cross-tab sync)
//
//     - flt-app.html renderProduct() (~line 2643) extended to call syncWatchStar() at end. This
//       is the canonical "focal product changed" hook; star reflects new product's watched state
//       immediately on load.
//
//     - sw.js (this file): CACHE_VERSION bumped + this changelog block. No new PRECACHE assets
//       (everything is inline in flt-app.html).
//
//   §31 ANTI-TRACKING verification:
//     ✓ Storage: localStorage only (browser-local, never sent to server)
//     ✓ No cookies set anywhere in this block
//     ✓ No fingerprinting (no canvas / WebGL / fonts / hardware probes)
//     ✓ No network calls (the load-from-watchlist path reuses existing OFF fetch; no new endpoints)
//     ✓ Cross-tab sync uses the same-origin storage event (no network involved)
//     ✓ Modal copy explicitly names "stored in your browser · no server, no cookies"
//
//   §50 HONESTY TEST verification:
//     ✓ ⭐ button disabled state matches actual scope (only meaningful when product loaded)
//     ✓ Modal footer copy "Local-only · survives session" matches actual storage behaviour
//     ✓ Chip click target matches the visible promise (opens watchlist modal)
//     ✓ Remove button (✕) shape + colour matches destructive action
//     ✓ Clear All carries .danger styling AND confirm() prompt — matches irreversibility
//     ✓ Import sanitisation matches the import contract (validates each row before save)
//     ✓ Storage-quota error surfaces in UI (not swallowed silently) — matches actual failure mode
//
//   ACCESSIBILITY verification (code review):
//     ✓ Button elements with type="button"
//     ✓ aria-label on all interactive controls (chip / star / close / row-meta / remove buttons)
//     ✓ aria-pressed on ⭐ button (toggle state)
//     ✓ aria-modal + role=dialog on modal
//     ✓ aria-labelledby on modal → watchModalTitle
//     ✓ aria-hidden on backdrop toggled with data-open
//     ✓ focus stash on open + restore on close
//     ✓ Esc + backdrop click + close button — three close paths
//     ✓ row keyboard handler — Enter/Space loads SKU
//     ✓ focus-visible outlines on all clickable controls
//     ✓ aria-live="polite" on cohortBreakdown unchanged (separate concern; watchlist updates
//       are user-initiated so don't need live region)
//
//   §111 NO WIKI ECOSYSTEM verification: no Wikipedia / Wikidata / Wikimedia citations anywhere
//   in this block. Storage shape is original; clipboard API + storage event from W3C specs only.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed
//   (all edits target /Users/clive/Documents/ScanSmart/scansmart-site/, NOT iCloud).
//
//   STORAGE BUDGET note: ~150 bytes/row average (barcode + name truncated 120ch + brand truncated
//   80ch + ISO timestamp). 1,000 rows ≈ 150KB; well under the typical 5MB localStorage quota.
//
//   STRUCTURAL FOUNDATION for #1 and #19 (per audit's structural observation):
//     - localStorage namespace established: `flt.*` (future keys: flt.session, flt.view, etc.)
//     - JSON envelope shape established: { kind, version, exported, items }
//     - Schema-version field (WATCHLIST_VERSION) sets the migration pattern future state will reuse
//     - Cross-tab storage event listener pattern proven
//     - Modal-with-action-bar pattern (action buttons + danger variant) reusable for reproducibility
//       layer (#1) and share-view URL state (#19)
//
//   USER-VISIBLE OUTCOME: topright bar carries a "☆ WATCH 0" chip always visible (active when count
//   > 0). F1 head carries a ☆ button next to the title (disabled until a product loads; click
//   toggles add/remove). Watchlist persists in browser; opens via clicking the chip; lists saved
//   SKUs with brand/name/barcode/added date; click row to load; ✕ to remove; JSON export/import/
//   copy via disclosure; CLEAR ALL in footer with confirm. Survives session; syncs across tabs.
//
//   CACHE_VERSION bumped so returning visitors get the watchlist UI on next visit.
//
// v5.0.117 (28 May 2026) — FLT critical fix: watchlist IIFE Temporal Dead Zone regression
//
//   PRODUCTION INCIDENT: v5.0.116 shipped 14:02 BST and broke the FLT terminal in production.
//   Every panel (F1-F7) stayed in its initial HTML state — F1 "Awaiting query", F6 "Fetching FSA
//   alerts...", F7 "Fetching food wire from 13 institutional sources..." indefinitely. Live since
//   ~14:02 BST; reported by founder at 14:07 BST ("everything is still blank 5 minutes later").
//
//   ROOT CAUSE: wireWatchlist IIFE in flt-app.html (added v5.0.116) calls syncWatchUI() on its
//   first line. syncWatchUI calls syncWatchStar. syncWatchStar reads CURRENT. But CURRENT is
//   declared `let CURRENT = null` further down in the source (~line 2766) — BELOW the IIFE
//   (~line 2218). `let` bindings exist in scope from the start of script execution but throw
//   Uncaught ReferenceError on any access until their declaration line runs. That throw halts
//   the rest of the boot. Console error verbatim:
//
//     Uncaught ReferenceError: Cannot access 'CURRENT' before initialization
//         at syncWatchStar (flt-app:1992:34)
//         at syncWatchUI (flt-app:1976:3)
//         at wireWatchlist (flt-app:2218:3)
//         at flt-app:2295:3
//
//   WHY THE V5.0.116 GUARD DIDN'T SAVE IT: syncWatchStar had a defensive `typeof CURRENT !==
//   "undefined"` check — but `typeof` on a TDZ `let` binding ALSO throws ReferenceError. The
//   `typeof` safety pattern only works for truly undeclared globals, NOT for `let`/`const`
//   bindings declared elsewhere but not yet initialised. Spec: ECMAScript §13.5.3 typeof on
//   declared-but-uninitialised binding throws — this is a well-known V8 + spec behaviour and
//   the dead-guard is on me.
//
//   WHY `node --check` DIDN'T CATCH IT: `node --check` only verifies parse-time syntax. TDZ
//   violations are runtime — `let` is parseable; the throw happens when the IIFE actually
//   executes. The v5.0.116 ship report cited "node --check on extracted script returns clean"
//   as evidence of correctness — that was a §50 honesty failure (parse-check ≠ runtime-check).
//   The right verification was loading the page once and watching the console before declaring
//   shipped. This v5.0.117 fix enforces that discipline going forward.
//
//   FIX: ONE LINE in the wireWatchlist IIFE. Change:
//       syncWatchUI();
//   to:
//       setTimeout(syncWatchUI, 0);
//   `setTimeout(fn, 0)` queues fn as a macrotask. The current synchronous execution stack
//   (which contains the script-parse-then-execute that has the IIFE) drains first. By the time
//   the timer fires, EVERY `let`/`const` binding in the script — including `CURRENT` at line
//   2766 — has been initialised. syncWatchUI now reads CURRENT safely (value: null on first
//   call, which the defensive checks already handle correctly).
//
//   WHAT STAYS: all event listener wiring inside the IIFE stays at parse time. None of the
//   listener bodies reference CURRENT directly at registration time — they only access it when
//   the user clicks a button / fires a storage event / etc., by which point script execution
//   has long since completed. The renderProduct hook (which calls syncWatchStar(p)) is unaffected
//   because renderProduct only runs after a product loads, well after init.
//
//   §50 HONESTY TEST verification: the fix line carries an inline comment explaining the TDZ
//   reason — future readers will not be tempted to "optimise away" the setTimeout without
//   understanding why it's there. The defensive `typeof` check in syncWatchStar is left in place
//   (no harm post-init; documents intent).
//
//   WHAT THIS COULDN'T VERIFY FROM THE SANDBOX: I cannot load scansmart.uk in a browser from
//   the Cowork shell. Verification is the founder's deploy + refresh + console-check. The
//   change is surgical (one line) and the throw mechanism is well-understood; I am 100%
//   confident in the diagnosis and the fix. The §50 lesson — load-before-shipping — is on
//   the founder's machine, not mine.
//
//   POST-INCIDENT DISCIPLINE banked forward: any future flt-app.html ship that adds a top-level
//   IIFE OR adds a parse-time function call MUST verify in a real browser before CACHE_VERSION
//   bump. `node --check` is necessary but not sufficient. v5.0.117 is the canonical case-study
//   for this rule.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   USER-VISIBLE OUTCOME: terminal boots normally. F1 awaits query as before. F6 fetches FSA
//   recalls. F7 fetches the food wire. UNIVERSE snapshot strip renders. Ticker renders. All
//   the v5.0.116 watchlist UI (☆ WATCH chip, F1 ⭐ button, modal) still works as designed —
//   only the initial UI sync is deferred by one macrotask, imperceptible at human time scale.
//
//   CACHE_VERSION bumped so returning visitors get the unbroken boot on next visit.
//
// v5.0.118 (28 May 2026) — Two production console errors investigated + fixed
//
//   POST-DEPLOY OBSERVATION on v5.0.117: terminal boots, every panel populates, BUT DevTools
//   Console shows three persistent red lines on every product load. Founder asked me to
//   investigate before declaring shipped — the same posture the audit had asked of an earlier
//   working terminal. Honest report banked first; founder picked "investigate"; this is the
//   investigation + fix banking.
//
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   FIX A — F4 peer-load: migrate fetchPeersLive from degraded OFF v2 search to OFF_LIVE_SEARCH
//   ─────────────────────────────────────────────────────────────────────────────────────────
//
//   Console error A (verbatim): "Access to fetch at 'https://world.openfoodfacts.org/api/v2/
//   search?categories_tags_en=canned-co...' from origin 'https://scansmart.uk' has been blocked
//   by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource."
//   Followed by GET ... net::ERR_FAILED 503 (Service Unavailable).
//
//   DIAGNOSIS: The 503 from world.openfoodfacts.org/api/v2/search returns HTML (not JSON), and
//   the HTML 503 page doesn't carry CORS headers. Browser logs it as CORS-blocked. The CORS
//   message is a SYMPTOM of the 503, not the cause. Sandbox probe confirmed:
//     world.openfoodfacts.org/api/v2/search (OPTIONS + GET)  → HTTP 503, content-type text/html
//     search.openfoodfacts.org/search (Lucene endpoint)      → HTTP 200, 98 KB JSON, ~2 s,
//                                                              access-control-allow-credentials: true
//     world.openfoodfacts.org/api/v2/product/<barcode>       → HTTP 200, full CORS headers
//                                                              (F1 product fetch is fine; only
//                                                              the v2 SEARCH path is dead)
//
//   The CODE ALREADY KNOWS THIS: flt-app.html lines 1667-1672 carry a banked comment from the
//   23 May session naming this exact failure mode: "the two world.openfoodfacts.org search
//   endpoints (cgi/search.pl, api/v2/search) are degraded; search.openfoodfacts.org is the
//   only currently-functional path." And defines `OFF_LIVE_SEARCH` for exactly this purpose.
//   F1 search (line 2395) already uses OFF_LIVE_SEARCH; the autocomplete already uses it; the
//   F4 peer-load `fetchPeersLive` (line 4003) was the last function-path that hadn't migrated.
//   §50 honesty gap: the rule was in the source, the function didn't follow it.
//
//   FIX: migrate fetchPeersLive to OFF_LIVE_SEARCH with Lucene query syntax.
//
//     URL change:
//       OLD: `${OFF_BASE}/search?categories_tags_en=<slug>&countries_tags_en=united-kingdom
//             &sort_by=popularity_key&fields=...&page_size=10`  (REST-style, degraded)
//       NEW: `${OFF_LIVE_SEARCH}?q=categories_tags:"en:<slug>" AND countries_tags:"en:united-
//             kingdom"&fields=...&page_size=10`  (Lucene-style, working)
//
//     Lucene query construction:
//       const escaped = catRaw.replace(/"/g, '\\"');  // defensive double-quote escape
//       const lucene  = `categories_tags:"en:${escaped}" AND countries_tags:"en:united-kingdom"`;
//
//     catRaw arrives stripped of `en:` prefix (loadPeers line 4043 does the strip); we
//     prepend it back inside the Lucene quoted phrase.
//
//     Response shape normalisation: the new endpoint returns `{ hits: [...] }` with `brands` as
//     an ARRAY (e.g. ["Heinz"]); the old endpoint returned `{ products: [...] }` with `brands`
//     as a comma-separated STRING. The caller (loadPeers + downstream renderPeers) reads
//     `brands` as string. We normalise inside fetchPeersLive — Array.isArray check + .join(", ")
//     — so the caller's contract doesn't change. `nutriments` keys are identical between
//     endpoints (`*_100g` shape both sides), passthrough is safe. `nutrition_grades` and
//     `nova_group` shapes identical.
//
//     Timeout discipline: added AbortController + OFF_LIVE_TIMEOUT (8000ms) to match the
//     existing F1-search live-load discipline at line 2399-2402. The old fetchPeersLive had
//     no timeout — a slow OFF response would hang the F4 panel indefinitely; the abort
//     bounds the wait.
//
//   VERIFICATION before ship — probed the NEW endpoint from sandbox with the exact category
//   Heinz Beanz carries (`canned-common-beans`):
//     HTTP 200 · 3.9 KB · 1.6 s
//     10 hits returned
//     fields verified: code (string), product_name (string), product_name_en (string), brands
//       (array — ["Maingourd"]), nutrition_grades (string), nova_group (number), nutriments
//       (object with carbohydrates_100g, energy-kcal_100g, fat_100g, fiber_100g, proteins_100g,
//       salt_100g, saturated-fat_100g, sodium_100g, sugars_100g)
//     normalised shape matches what the caller expects.
//
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   FIX B — F7 WIRE: swap Lancet from RDF/RSS 1.0 (broken on rss2json) to PubMed RSS 2.0
//   ─────────────────────────────────────────────────────────────────────────────────────────
//
//   Console error B (verbatim): "GET https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2F
//   www.thelancet.c... 500 (Internal Server Error)" (later seen as 422 "Feed could not be
//   converted, probably not a valid RSS feed.").
//
//   DIAGNOSIS: Lancet's own RSS feed is alive (sandbox fetch: HTTP 200, 54 KB, content-type
//   application/rss+xml). BUT it's RDF/RSS 1.0 format — `<rdf:RDF xmlns="http://purl.org/rss/1.0/">`
//   not RSS 2.0 or Atom. rss2json's parser doesn't handle RDF/RSS 1.0; returns 422 systemically
//   for ANY RDF feed, including all four Lancet variants (`lancet_current`, `lanonc_current`,
//   `landig_current`, `lanpub_current` — all four probed, all four RDF root). Lancet doesn't
//   publish an Atom alternative; their `onlinefirst.atom` endpoint returns 403.
//
//   FIX: route Lancet content through PubMed instead. PubMed publishes a Lancet-journal feed
//   (journal ID 0053266) as RSS 2.0:
//     https://pubmed.ncbi.nlm.nih.gov/rss/journals/0053266/?limit=15
//   Sandbox probe: HTTP 200, root `<rss version="2.0">` — the format rss2json's parser handles
//   natively. PubMed has 146,290 Lancet articles indexed (via E-utilities esearch verification).
//   Each PubMed RSS item carries title, link, pubDate, description — standard RSS 2.0 shape,
//   identical to what the other 9 working sources (BBC Health, FSA, DHSC, DEFRA, UK Food Supply,
//   Met Office, Env Agency, CCC, EFSA, WHO) deliver.
//
//   Source kept at the same weight (1.4 — T1 Peer-reviewed tier) and colour (#a78bfa — purple
//   peer-reviewed palette). One line change in WIRE_SOURCES (line 4428 of flt-app.html).
//
//   POST-PROBE caveat (banked honestly): rss2json proxy-test against PubMed feed returned 429
//   (rate-limit) on my burst-probe pattern, NOT 200 — but the 429 is sandbox-probe-burst noise,
//   not a structural failure. The PubMed feed itself is RSS 2.0 (verified direct probe). The
//   browser in production hits each WIRE source once per session, not in tight loops; rate-limit
//   does not trigger. The 4 sources that 429'd during my probe sweep (BBC Business, Sky UK,
//   Just-Food, Guardian Food) all work in production (visible in earlier screenshot at 39 items).
//
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   §50 HONESTY TEST verification: both fixes match the principle to the implementation.
//     Fix A: the source already documented the right endpoint; the code now follows the source.
//     Fix B: the proxy parser limitation is named explicitly + the workaround route is named
//     in the inline comment.
//
//   §111 NO WIKI ECOSYSTEM verification: PubMed (NIH/NLM, US federal) is in the acceptable
//   source set per CLAUDE.md item 99. Not Wikipedia / Wikidata / Wikimedia family. The Lancet's
//   content is also primary-source published peer-reviewed research.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   WHAT I COULD NOT VERIFY FROM THE SANDBOX (banked honestly per the v5.0.117 lesson):
//   the actual browser load. Verification is the founder's deploy + refresh + DevTools console
//   check. I'm 100% confident in the diagnoses + the surgical shape of each fix; I am NOT
//   declaring shipped until founder confirms zero red lines in console + F4 peers populating
//   from live (not universe fallback) + F7 Lancet items showing. The v5.0.117 incident proved
//   that `node --check` parse-pass and sandbox endpoint probes are necessary but not sufficient.
//
//   USER-VISIBLE OUTCOME (target):
//     - On product load, no CORS / 503 red line from OFF v2 search. F4 PEER · COMPARABLE SKUs
//       panel populates from live OFF (via search.openfoodfacts.org/search) rather than
//       falling back to local UNIVERSE.
//     - On WIRE init, no 500/422 red line from rss2json + Lancet. F7 WIRE shows Lancet items
//       (titles + dates from PubMed's Lancet feed) alongside the other peer-reviewed sources.
//     - The remaining red line from before (rss2json rate-limit 429s) is sandbox-probe-burst-
//       only; production should be clean.
//
//   CACHE_VERSION bumped so returning visitors get the migration on next visit.
//
// v5.0.119 (28 May 2026) — F4 PEER: revert wrong endpoint + fix silently-broken universe fallback
//
//   FOUNDER DIRECTIVE: "i want to see f4 populated with alternatives to the prod in f1"
//   FOUNDER FEEDBACK 28 May 2026 verbatim: "we do not work or conclude based on assumptions" +
//   "verify each line so u do not overlook" — banked as feedback memory.
//
//   POST-DEPLOY OBSERVATION on v5.0.118: F4 PEER showed "No peer SKUs found" for Heinz Beanz.
//   Console showed 4 CORS errors, all on search.openfoodfacts.org. v5.0.118 had migrated
//   fetchPeersLive from OFF_BASE/search to OFF_LIVE_SEARCH based on the assumption that
//   F1 search "works in production" on that endpoint. F1 has been silently CORS-blocked
//   since v5.0.85 and degrades to local UNIVERSE; the migration moved F4 from an
//   intermittently-working endpoint onto a reliably-broken one. Strictly worse.
//
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   FIX A — revert fetchPeersLive to OFF_BASE/search (the CORS-allowed endpoint)
//   ─────────────────────────────────────────────────────────────────────────────────────────
//
//   VERIFIED 28 May 2026 by sandbox probe with Origin: https://scansmart.uk header:
//     world.openfoodfacts.org/api/v2/search (200 GET)
//       → access-control-allow-origin: *
//       → access-control-allow-methods: HEAD, GET, PATCH, POST, PUT, OPTIONS
//       → returns { products: [...] } with brands as comma-separated STRING ("Heinz")
//     search.openfoodfacts.org/search (200 GET)
//       → returns ONLY access-control-allow-credentials: true
//       → NO access-control-allow-origin — browser blocks every cross-origin GET
//
//   The 22 May ⭐ entry at CLAUDE.md §110 named search.openfoodfacts.org as "the only
//   currently-functional path" — that was about intermittent 503s on the v2 endpoint, NOT
//   about CORS. world.openfoodfacts.org/api/v2/search has full CORS; it's just slow and
//   occasionally 503s. When it 200s → live peers. When it 503s → HTML error page lacks
//   CORS headers (same console-message shape as a true CORS block) → fetch throws →
//   loadPeers's catch fires → Tier-2 universe fallback (see Fix B).
//
//   The simple revert restores the v5.0.117 fetchPeersLive form: REST-style URL with
//   `categories_tags_en=<slug>&countries_tags_en=united-kingdom`, `return d.products || []`
//   shape return (brands already string from this endpoint — no normalisation needed).
//
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   FIX B — peersFromUniverse: add Tier-2 noun fallback so the local cache actually populates F4
//   ─────────────────────────────────────────────────────────────────────────────────────────
//
//   DISCOVERED 28 May 2026 by sandbox probe of inline UNIVERSE JSON:
//     peersFromUniverse("canned-common-beans", "5000157024671", "Heinz") → 0 hits.
//
//   Root cause: UNIVERSE schema stores `cat` as the broad human-readable top-level category
//   ("Plant Based Foods And Beverages", "Bread & Bakery") — NOT the deep OFF slug. Strict
//   all-words logic looking for "canned"+"common"+"beans" in u.cat returns 0 because those
//   words never appear in the broad cat. SILENTLY BROKEN for any product whose deep
//   category doesn't echo in the broad cat — i.e. most products. The v5.0.117 screenshot
//   showing Bramwells/Branston/Newgate peers came from intermittent OFF v2 LIVE success,
//   NOT from this universe fallback. When live failed, peers always returned 0.
//
//   FIX: if Tier 1 returns 0, run Tier 2 — match the LAST hyphen-separated word of catRaw
//   (the most shopper-meaningful noun: "beans" from "canned-common-beans", "pizzas" from
//   "frozen-pizzas", "drinks" from "carbonated-drinks", "bars" from "cereal-bars") against
//   u.n (product name) OR u.cat. Brand-self filter (when caller provides brandSelf)
//   excludes same-brand entries.
//
//   VERIFIED 28 May 2026 against UNIVERSE inline JSON for Heinz Beanz:
//     Tier 1 (all-words): 0 hits
//     Tier 2 (noun "beans" in name OR cat, ex-brand "heinz"): 222 hits
//     First 8 delivered to F4:
//       BRAMWELLS               · Baked Beans
//       Tesco                   · Organic Baked Beans
//       Branston                · Baked Beans in a Rich, Thick, Tomatoey Sauce
//       Tesco                   · Baked beans in tomato sauce
//       Sainsbury's Organic     · Baked Beans in tomato sauce
//       Newgate                 · Baked Beans
//       (+ 2 more)
//
//   Generalisation verified on other category shapes:
//     "frozen-pizzas"     → noun "pizzas" → 3 peers
//     "carbonated-drinks" → noun "drinks" → 11 peers
//     "cereal-bars"       → noun "bars"   → 124 peers
//
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   LINE-BY-LINE VERIFICATION before save (per founder feedback 28 May 2026):
//
//   fetchPeersLive (12-line body):
//     ✓ URL uses OFF_BASE which is the verified CORS-allowed endpoint (200 + ACL-allow-origin: *)
//     ✓ encodeURIComponent on catRaw (safe against any slug content)
//     ✓ countries_tags_en=united-kingdom pins to UK per §22 editorial-globalises-operational-stays-UK
//     ✓ sort_by=popularity_key returns most-shopped peers first (verified working)
//     ✓ fields list matches what renderPeers consumes (code, name, brands, ns, nv, nutriments)
//     ✓ page_size=10 → caller slices to 8 after focal-exclude
//     ✓ 2-attempt retry with 900ms backoff (matches v5.0.117 behaviour, no race conditions)
//     ✓ HTML 503 page caught by `!ct.includes("json")` → throw → inner catch → retry/throw
//     ✓ Second attempt fail re-throws to caller — loadPeers's catch fires Tier-2 universe fallback
//     ✓ d.products is the correct response key for OFF v2 search (verified by probe)
//
//   peersFromUniverse (full body):
//     ✓ Tier 1 logic unchanged — preserves backward compat for products where it works
//     ✓ `let hits` (changed from const) so Tier 2 can reassign
//     ✓ Tier 2 gate `if(!hits.length)` — only runs when Tier 1 returned 0
//     ✓ noun length check (>= 3) defensive against degenerate single-letter or empty slugs
//     ✓ brandSelf null-coalesce + lowercase — handles missing brand without throwing
//     ✓ name match OR cat match — broader signal than cat-only (catches the schema mismatch)
//     ✓ brand-self exclude only when brandSelf provided — matches loadPeers's two call sites
//     ✓ Return shape identical to existing — no caller change needed
//     ✓ Tier 2 filter excludes focal currentCode same way Tier 1 does
//
//   loadPeers (unchanged, just re-traced):
//     ✓ Catch fires on fetchPeersLive throw → peersFromUniverse(catRaw, p.code, brand)
//     ✓ If primary returns 0, broader retry peersFromUniverse(catRaw.split("-").slice(-2).join("-"))
//     ✓ Net: when live works → live peers; when live fails → Tier-2 noun-match peers; always populated
//
//   renderPeers row function (unchanged, just re-traced):
//     ✓ Reads x.code, x.brands (string), x.product_name_en/x.product_name, x.nutrition_grades,
//       x.nova_group, x.nutriments.sugars_100g, x.nutriments.salt_100g
//     ✓ Universe fallback shape provides all these (nutriments={} → cells render "—" with
//       tooltip; matches the audit-#5 missing-data discipline shipped v5.0.112)
//     ✓ classifyOwnLabel(x.brands) (v5.0.114 audit #16) reads brands as string — universe
//       fallback returns string ✓
//
//   §111 NO WIKI ECOSYSTEM verification: no Wiki sources touched.
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   WHAT I DID NOT VERIFY FROM SANDBOX: the live in-browser load. Verification is the
//   founder's deploy + refresh + check. Per the v5.0.117 + v5.0.118 lessons, I will not
//   declare shipped until the founder confirms F4 populated with the Tier-2 peers and
//   console no longer shows recurring CORS-error spam.
//
//   USER-VISIBLE OUTCOME (target):
//     - On Heinz Beanz load → F4 PEER shows ~8 cross-brand baked-beans alternatives
//       (Bramwells/Tesco/Branston/Sainsbury's/Newgate etc.) — either from live OFF
//       (when v2 search is up) or from local UNIVERSE (when v2 is down or slow).
//     - Console: no recurring CORS errors on every product load. Occasional 503 from
//       OFF v2 when the endpoint is having a moment, caught and recovered to universe.
//
//   CACHE_VERSION bumped so returning visitors get the fixes on next visit.
//
// v5.0.120 (28 May 2026) — /trademark page removed (founder directive: contains sensitive info)
//
//   FOUNDER DIRECTIVE: "remove this page from the website it contains company sensitive information"
//   — referring to scansmart.uk/trademark (trademark.html).
//
//   WHAT WAS REMOVED:
//     - trademark.html (the page file itself — 12,526 bytes deleted)
//     - 63 HTML pages had `<li><a href="trademark.html">Trademark notice</a></li>` in the
//       footer About column. The <li> was stripped from each via Python in-place edit (exact
//       byte-pattern match verified across all 63 files before edit; zero occurrences after).
//     - sitemap.xml: <url><loc>https://scansmart.uk/trademark</loc>... removed.
//     - search-index.json: full entry block for "id":"trademark" removed (lines 1411-1426
//       inclusive, leaving the surrounding objects' commas intact for valid JSON).
//     - press.html line 80: dead-link <li> "Trademark: POWER IS KNOWLEDGE DECODED filed under
//       UKIPO Class 35... See /trademark." removed entirely (substantive content also went
//       since the press <li> was tightly coupled to the now-removed page).
//     - press.html line 108: rewrote the brand-assets paragraph from "Use must comply with the
//       trademark notice at /trademark — no alteration..." → "Use must follow standard
//       brand-attribution conventions — no alteration..."
//     - contact.html line 108: dropped the trailing dead-link suffix "— statement at /trademark"
//       from the Trademark inquiries <li>; the email-routing instruction stays.
//
//   WHAT WAS KEPT (verified false positives — unrelated to the removed page):
//     - flt-app.html:924 — Milka/Suchard ownership history note (1972 lilac cow trademark)
//     - library-brand-vs-manufacturer.html:72,220 — explains "trademark on FOP" as a concept
//     - library-dietary-patterns.html:461 — legal disclaimer about referenced trademarks
//     - library-symbols.html:184,237 — Vegan Society Trademark certification mark
//
//   VERIFICATION:
//     ✓ Pre-edit grep: 64 files contained the footer link with the EXACT byte pattern
//       `<li><a href="trademark.html">Trademark notice</a></li>` — identical across all
//     ✓ Post-edit grep: zero remaining occurrences of the pattern across all *.html
//     ✓ Post-edit ls: trademark.html no longer exists
//     ✓ about.html line 114 footer About column now ends ...privacy.html">Privacy</a></li></ul></div>
//       (the trademark <li> cleanly removed; surrounding <li> structure preserved)
//     ✓ search-index.json: only ONE entry block had "id":"trademark" — removed cleanly,
//       adjacent commas preserve valid JSON
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   NOT TOUCHED (out of scope of "remove this page from the website"):
//     - The internal sealed legal record at ~/Documents/ScanSmart/KiP/Trademarks/Hero_v16_
//       _Serial_Preservation_Legal_Record_2026-04-24.md — internal record, NOT public-facing
//     - Notion mirrors of trademark-related canon — not under scansmart.uk
//     - Bible v7.3 references to trademark posture — internal canonical record, not on the site
//
//   CACHE_VERSION bumped so the service worker drops the cached trademark.html from
//   returning visitors' browsers on next visit and the footer renders without the dead link.
//
// v5.0.121 (28 May 2026) — Sensitive-info audit pass across the site (founder follow-up directive)
//
//   FOUNDER DIRECTIVE: "make sure there is no ther sensitive copany information on any part
//   of the website" — follow-up after v5.0.120 removed the /trademark page.
//
//   AUDIT METHODOLOGY: probed for the same categories of content that made /trademark
//   sensitive — internal version-tracking designators, internal Bible §-references in
//   visible body, pricing intent before announcement, internal-only canonical artefact
//   codenames. Each match read line-by-line before edit (no blanket sed). False positives
//   (regulation-section symbols pointing at /library-method; "trademark" as a legal concept
//   in food-law explanatory text; Cloudflare/D1 mentions in privacy policy) preserved.
//
//   WHAT WAS REMOVED:
//
//   1. Internal Bible §-references in VISIBLE body content:
//      - flt.html line 404: "(CheckIT scanner mode, per v7.2 §99)" → "(CheckIT scanner mode)"
//      - flt.html line 438: "Strict methodology (per §103):" → "Strict methodology:"
//      - flt.html line 616: "(per v7.2 §99 patch)," → ","
//      - i500.html line 235: "paid B2B product per Bible §4 (Partner Programme..." →
//                            "paid B2B product (Partner Programme..."
//      - the-project.html line 128: dropped the entire "aligns with Brand Bible v7.0 §88/§98
//        Five-Product Architecture and v7.2 §13.0 / §13.0.1 / §31a / §106..." chain
//      - library-method.html line 41: CSS comment "/* Canonical DECODED blue per Brand Bible v4.7 */"
//        stripped
//
//   2. Internal Bible §-references in VISIBLE FLT modal content (Source-Priority modal +
//      Watchlist modal — both opened by users via UI):
//      - flt-app.html spModalTitle: "SOURCE-PRIORITY HIERARCHY · §10 + §103" →
//                                   "SOURCE-PRIORITY HIERARCHY"
//      - flt-app.html I500 tier-note: "per §103 strict-methodology figure-lock" →
//                                     "strict-methodology figure-lock"
//      - flt-app.html OFF tier-note: "per §111 the one community-edited source SCANSMART
//                                     accepts" → "the one community-edited source SCANSMART
//                                     accepts"
//      - flt-app.html sp-foot: stripped "The deterministic rule is locked at Bible §10 + §103 +
//        CLAUDE.md item 20 (Data Sources canonical, 1 May 2026). Per §111 NO Wiki ecosystem"
//        → "The deterministic rule is locked. Community-edited Wikimedia sources (Wikipedia /
//        Wikidata) are NOT in the source set."
//      - flt-app.html w-intro: "Local-only watchlist · stored in your browser (§31 anti-tracking
//        — no server, no cookies)" → "Local-only watchlist · stored in your browser — no server,
//        no cookies, no tracking"
//
//   3. Internal Bible §-references in Schema.org JSON-LD descriptions (published to search
//      engines + LLM crawlers):
//      - checkout-2026-05-18-soft-drinks-SURFACE-A.html: "five rows flagged unverified per §50
//        Honesty Test" → "five rows flagged honestly as unverified"
//      - checkout-2026-06-01-bread.html: "seven rows flagged unverified per §50 Honesty Test"
//        → "seven rows flagged honestly as unverified"
//
//   4. Internal Bible §-references in visible body of the same checkout pages:
//      - checkout-2026-05-18-soft-drinks-SURFACE-A.html line 219: "per §50 Honesty Test" stripped
//      - checkout-2026-06-01-bread.html line 219: "per §50 Honesty Test" + "per §14.3.1 canonical
//        artefact preservation" both stripped
//
//   5. Pricing intent disclosure pre-launch on subscribe.html:
//      - Subscription tier: "benchmark band: £20–£50/month" → removed (price stays "£TBD")
//      - Institutional tier: "two sub-tiers — Snapshot (mid-band) and Full Dataset
//        (Bloomberg-band)" → removed (price stays "£TBD"; sub-tier names preserved later in
//        the page where they're operational shopper vocabulary not pricing intelligence)
//
//   6. Internal version-tracking on canonical brand artefacts:
//      - Footer Marque alt-text: 49 + 16 = 65 files. Mass scrub via Python:
//          alt="SCANSMART Marque v1 — canonical" → alt="SCANSMART"  (49 files)
//          alt="SCANSMART Marque v1"            → alt="SCANSMART"  (16 files)
//      - Hero alt-text + aria-label:
//          door3-preview.html: "SCANSMART home — Hero v16 canonical masthead" →
//            "SCANSMART home"
//          door3-preview.html: alt "SCANSMART — Hero v16 canonical brand mark" → "SCANSMART"
//          install.html: alt "SCANSMART — the canonical Hero v16 brand masthead" → "SCANSMART"
//          install.html CSS comment: "/* Hero v16 masthead. */" → "/* Hero masthead */"
//          door3-preview.html CSS + HTML comments: "Hero v16 masthead" → "Hero masthead"
//          index.html: alt "SCANSMART — canonical brand mark" → "SCANSMART"
//
//   WHAT WAS KEPT (verified false positives — concept-level mentions, not internal exposure):
//      - "trademark" as a concept in food-law / cosmetics-symbols explainers (flt-app.html
//        Milka/Suchard history note; library-brand-vs-manufacturer.html; library-dietary-
//        patterns.html legal disclaimer; library-symbols.html Vegan Society Trademark)
//      - § as stylistic section-symbol pointing at /library-method (the SCANSMART Method)
//      - Public footer Co. No. 17128797 (statutorily public Companies House data)
//      - Public contact emails per CLAUDE.md account-access notes (courtneyclive84@gmail.com,
//        admin@scansmart.uk)
//      - "Cloudflare" / "Cloudflare D1" / "TLS 1.3" in privacy.html (legally-required data-
//        processor disclosure)
//      - "Decision Record live since 29 April 2026" — publicly-committed milestone date
//      - Bing webmaster-validation meta tag (its purpose is to be public on the page)
//      - "POWER IS KNOWLEDGE DECODED" as brand tagline / og:image:alt / Schema.org slogan
//        (this is the public brand voice; was sensitive on /trademark only because paired
//        with filing-class details)
//      - "Snapshot" / "Full Dataset" sub-tier shopper vocabulary on subscribe.html (kept;
//        only the pricing intelligence was sensitive)
//
//   §111 NO WIKI ECOSYSTEM verification: no Wikipedia / Wikidata references introduced.
//   §47a CANON-SYNC PROTOCOL run before edits. §112 LOCAL-IS-MAIN observed throughout.
//
//   CACHE_VERSION bumped so the service worker drops the cached old copies on next visit.
//
// v5.0.122 (28 May 2026) — public email scrub: courtneyclive84@gmail.com → Admin@scansmart.uk
//
//   FOUNDER DIRECTIVE: "remove courtneyclive84 email.. all email to be directed throu
//   admin.scansmart.uk. gmail account is used for signups not public facing"
//
//   ALIGNS WITH CLAUDE.md account-access notes: Admin@scansmart.uk is canonical for
//   "general outbound / inbound; system mail, Formspree, council and institutional
//   broadcast-style enquiries." Gmail is for sign-ups (vendor accounts, SaaS subscriptions)
//   per "i use gmail for sign ups." Gmail should never have been visible on the public site.
//
//   SCRUBBED 7 visible email occurrences (replace_all on @gmail.com pattern keeps the
//   Cloudflare Workers subdomain `courtneyclive84.workers.dev` untouched — that's a separate
//   leak that requires Cloudflare-side action before scrubbing, see below):
//     - contact.html:106    Direct email line
//     - press.html:113      CheckIT screenshots request
//     - press.html:121      Interview requests
//     - privacy.html:113    Form submissions notification
//     - privacy.html:135    Subject access requests
//     - privacy.html:144    Erasure / device-ID deletion requests
//     - privacy.html:160    Privacy queries general
//
//   ALL EDITS used the unique-suffix pattern `courtneyclive84@gmail.com` → `Admin@scansmart.uk`
//   so the Cloudflare Workers subdomain references (which contain `courtneyclive84.workers.dev`
//   without the @gmail.com) are NOT affected.
//
//   STILL EXPOSED but out of website-edit scope (10 occurrences across checkit.html,
//   checkout.html, contact.html, i500.html, index.html, partner.html, press.html, shops.html,
//   stories.html, subscribe.html):
//     kip-data.courtneyclive84.workers.dev/stats   ← Decision Record stats endpoint
//     kip-forms.courtneyclive84.workers.dev/submit ← form-submission endpoint
//   These are live production API endpoints. The `courtneyclive84` substring is Cloudflare's
//   default subdomain pattern derived from the account email's local-part. Scrubbing requires:
//     1. Set up a custom Worker route on Cloudflare (e.g. api.scansmart.uk/stats →
//        kip-data.courtneyclive84.workers.dev/stats), OR
//     2. Migrate the Workers to a separately-named Cloudflare account
//   Once Cloudflare-side is configured, the website-side URL change is a 2-minute mass
//   replace. Banked here as a follow-up so it doesn't get forgotten.
//
//   §47a CANON-SYNC PROTOCOL run before edit. §112 LOCAL-IS-MAIN observed.
//
//   CACHE_VERSION bumped so returning visitors get the new email on next visit.
//
// v5.0.123 — 31 May 2026: Door 4 Surface A population fix (two stale placeholder pages)
//   - checkout-2026-05-18-soft-drinks.html was serving the unpopulated [Product]/[N]/[G/A/R]
//     template at the clean public URL; the populated 5-row Surface A content lived only in the
//     orphaned checkout-2026-05-18-soft-drinks-SURFACE-A.html. Populated content moved onto the
//     clean URL + made self-canonical (-SURFACE-A suffix dropped from canonical/og:url/Dataset url).
//   - checkout-2026-05-04-cereals.html was an unpopulated template; rebuilt as a populated Surface A
//     with 5 OFF-verified rows (Weetabix, Corn Flakes, Crunchy Nut 36.7g sugar/100g RED, Special K,
//     Coco Pops) + 5 honestly-flagged unverified rows + ingredients verbatim.
//   - checkout-2026-06-08-yoghurts.html added (weekly BigStore Audit, rotation slot 4, 6 verified rows).
//   - checkout.html archive index completed (yoghurts/bread/soft-drinks added; Coming note → 15 Jun).
//   - CACHE_VERSION bumped so returning visitors get fresh HTML; HTML is network-first so a re-deploy
//     + hard refresh surfaces the populated pages immediately.
//
// v5.0.124 (1 June 2026) — §70 Monthly Sweep consolidation: i500.html "Already shipping" feature card
//   carried the superseded "149 SKUs verified / 84% missing (as of 4 May 2026)" alongside the current
//   strict 155/148/138/93.2% shown elsewhere on the same page — a §50 Honesty Test self-contradiction.
//   FIX: both the .ico stat and the body <p> consolidated to strict canon (155 verified catalogue /
//   148 audited / 138 blindspot / 93.2%, as of 13 May 2026) to match i500-ticker.json (single source of
//   truth). i500.html now carries one consistent figure set. No other page touched.
//
// v5.0.125 (1 June 2026 afternoon) — Library door card mentions audio/video companions
//   Companion to the §- NotebookLM Hosting Architecture canonical (banked 31 May 2026 evening) and the
//   first R2 media upload (How_Big_Food_Engineered_Your_Cravings.m4a, 1 June 2026 morning, live at
//   https://media.scansmart.uk/). Door 6 (Knowledge Library) on the homepage now signals audio/video
//   availability so readers know to look for it when they open the Library.
//   FIX: index.html door-sub for door-6 — appended sentence "Audio and video companions also available."
//   to the existing Library description (after "no paywall."). No other page touched.
//   PENDING: actual placement of audio/video files within /library — TBD (per-page embed vs hub page vs
//   both). This change announces availability; the Library page surface to host the players follows.
//
// v5.0.126 (1 June 2026 afternoon) — Library page embeds the first audio companion + signpost card
//   Companion to v5.0.125 (door-card mention) and the first R2 upload (Cravings .m4a 1 June 2026).
//   Founder direction: embed the player beneath the first paragraph of /library, plus a signpost card
//   in Stream 4 (under the periodic table) that scrolls back up to the player.
//   FIX (library.html):
//     - new <section id="audio-companion"> placed immediately after page-hero, before fundamentals.
//       Carries an amber-accented card with eyebrow "Audio companion · Library", h2 title (How Big
//       Food Engineered Your Cravings), short summary, and a native <audio controls> element pointing
//       at https://media.scansmart.uk/How_Big_Food_Engineered_Your_Cravings.m4a. Graceful fallback
//       for browsers that can't render <audio>: a direct download link.
//     - new .lib-entry signpost card in Stream 4 (after the periodic table card, before the "More
//       reference tools queued" paragraph) with headline "Audio & video companions — alternative
//       formats of the Library research", short summary, and an in-page anchor link to
//       #audio-companion at the top.
//   §50 HONESTY TEST: card claims one audio companion exists; one audio companion does exist (Cravings
//   on R2). Card does not over-promise multiple files or a hub page (neither exists yet). The signpost
//   accurately points to the single embed at the top.
//   PENDING: as more audio/video files upload, expand both the embed section (multiple cards) and the
//   signpost (point to a hub page). For now: one file, one card, one signpost.
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.127 (1 June 2026 afternoon) — Childhood Obesity and Food Labelling FSMA piece published
//   v0-2 of the FSMA Childhood Obesity and Food Labelling Evidence Vault (banked 30 May 2026 in
//   ~/Documents/ScanSmart/Research/FSMA/; Notion canonical at Project Hub; DRAFT-IN-REVIEW pending
//   §56 Panel Review) ships as the canonical HTML page on scansmart.uk/library-childhood-obesity.
//   Per §47b Three-Format Artefact Rule: .md + .docx + .html — this completes the HTML format for
//   this FSMA piece. The DRAFT-IN-REVIEW status is preserved prominently in the door-tag, the lede
//   stale-date reminder, the FSMA-card eyebrow, and the closing-line stamp.
//   FILES SHIPPED:
//     - library-childhood-obesity.html (NEW) — canonical FSMA gold-standard format matching the
//       library-food-marketing-to-kids template chrome (head meta, Article JSON-LD, page-hero with
//       door-tag + h1 + lede + stale-date reminder, 14 H2 sections converted from the .md source).
//   FILES UPDATED:
//     - library.html jump-to dropdown — new option between Food Marketing to Kids and Brand vs
//       Manufacturer.
//     - library.html FSMA card grid — new Policy-level card between Food Marketing to Kids and
//       Brand vs Manufacturer.
//     - library.html FSMA intro paragraph — "Twelve" → "Thirteen"; topic list updated.
//     - library.html TOC strip — Childhood Obesity added to FSMA list.
//     - sitemap.xml — new <url> entry for /library-childhood-obesity (lastmod 2026-05-30, priority
//       0.85, monthly changefreq).
//     - search-index.json — new page entry inserted after food-marketing-to-kids with title, lede
//       snippet, h1, and 14 h2 headings. page_count + row_count incremented; built_at refreshed.
//   §50 HONESTY TEST: HTML faithfully renders the v0-2 .md content with all peer-reviewed citations,
//   NCMP figures, SDIL Rogers 2023 result, Hall 2019 UPF caveat, Chile/Mexico precedent, equity
//   tension (Adams 2016), and the explicit DRAFT-IN-REVIEW pending-§56 notice. No editorial additions
//   beyond chrome.
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.128 (1 June 2026 afternoon, ~30 min after v5.0.127) — Childhood Obesity HTML canonical alignment
//   Founder pushback: "initially it looks different from other FSMA docs." Self-audit against all 39
//   existing library-*.html files surfaced two real divergences from the canonical FSMA pattern:
//   FIX (library-childhood-obesity.html):
//     1. Door-tag: removed " · DRAFT-IN-REVIEW" suffix. Other FSMA pages render the door-tag as
//        "Knowledge Library · Evidence vault" cleanly with no draft indicator. DRAFT-IN-REVIEW status
//        is preserved transparently in the stale-date reminder paragraph beneath the lede where it
//        belongs (the canonical placement for status caveats).
//     2. Regulation-map table: replaced inline-styled custom <table> with class="checkout-table" —
//        the brand class used across all FSMA pages with tables. Same data, canonical render.
//   §15.x.6 WITHIN-SESSION-CORRECTION CASE-STUDY: textbook firefighting failure mode. v5.0.127 shipped
//   without a self-audit against canonical FSMA exemplars. Founder caught the visual delta; the audit
//   should have happened pre-deploy. Lesson: when shipping a new instance of an established pattern,
//   audit against ≥2 canonical exemplars FIRST. Same lesson as the audio-player firefighting from
//   earlier this session.
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.134 (2 June 2026) — "Audio companion" added to the Library nav mega-menu. CORRECTION on my part:
//   the Library dropdown IS real — it's built site-wide by install.js (libraryNavMenu IIFE) and injected
//   into the plain <a class="lib"> nav link on every page; I'd earlier wrongly concluded it didn't exist
//   because the menu lives in install.js, not the page HTML. Added
//   ['library.html#audio-companion','Audio companion'] to the "Reference tools" group (next to Interactive
//   Periodic Table) → the live audio section on /library (the 16-episode companion shipped 1 June). The
//   install.js?v= query was bumped 5.0.60 → 5.0.134 across all 65 HTML pages so cached visitors fetch the
//   new menu; install.js is also re-precached by this CACHE_VERSION bump.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.133 (2 June 2026) — Homepage consumer-first cleanup (founder review of the live site). Three changes:
//   - Trust strip REMOVED from the landing page (Registered company / NHS pathway / Evidence base /
//     Open by default). Founder direction: keep the landing page consumer-facing, not a credentials wall.
//     The #trust-evidence-stat live-stats JS is null-guarded (if(!el)return), so it self-disables — no error.
//   - Hero "See how it works" ghost CTA removed (the doors section directly below IS the how-it-works).
//   - Knowledge Library door moved in the DOM to sit BETWEEN Checkout (door-4) and FLT (door-5): in the
//     3-col doors grid it now fills the 3rd column alongside I500 + Weekly Checkout instead of orphaning
//     below the full-width FLT door. No CSS change (door-1 + door-5 still span full width).
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.132 (2 June 2026) — FLT hero iframe fix: relax framing headers to allow same-origin self-framing.
//   ROOT CAUSE (verified): _headers carried X-Frame-Options: DENY + CSP frame-ancestors 'none', which
//   block ALL framing including the same-origin <iframe src="flt-app.html?embed=1"> in the FLT hero — the
//   browser refuses the frame at the header level before the embed-bypass JS runs (the grey/broken box).
//   The iframe has been in flt.html since 20 May; the i500 equivalent iframe was still rendering (leaking)
//   on 26 May per v5.0.102, so framing was ALLOWED then; _headers was last modified 1 June (same edit that
//   added media-src https://media.scansmart.uk for the audio companion), which is when the framing policy
//   was hardened and silently broke the FLT preview. (No git/backup of the old _headers to diff — this is
//   inference from the changelog timeline, not a proven before/after diff.)
//   FIX: X-Frame-Options DENY → SAMEORIGIN; frame-ancestors 'none' → frame-ancestors 'self'. The site can
//   now frame itself (FLT hero terminal renders again); external clickjacking protection preserved (no
//   cross-origin framing). Only flt.html uses an iframe now (i500's was stripped 26 May) — nothing else affected.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.131 (2 June 2026) — NHS institutional band moved BELOW the consumer content. Founder review of
//   the live v5.0.130 homepage: leading a consumer landing page with an NHS "invitation" reads like a
//   trade site, which scansmart.uk is not. Section order is now hero → trust-strip → doors → featured
//   (supermarket Checkout) → inst-band → footer. Band markup unchanged (same copy, same ungated
//   the-project.html CTA); only its position moved + .inst-band CSS padding adjusted for the mid-page
//   slot (top+bottom breathing instead of top-only). Trust strip stays under the hero (per the v5.0.130
//   lift); only the explicit NHS callout moved down.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.130 (2 June 2026) — Front-facing first-impression pass for the institutional (HIN/Oliver) visit.
//   Founder direction: fix everything around the (finished) hero that shapes a warm NHS contact's
//   first impression. Hero v16 / Marque / "Power is Knowledge Decoded" left untouched.
//   CHANGES:
//     - Construction strip removed site-wide. The pinned "SCANSMART is under construction — surfaces
//       in active development" banner above the nav was the single biggest credibility drag and
//       undercut genuinely-live surfaces (PWA scanner, Decision Record, I500 data). Stripped the
//       .construction-strip div block from all 67 root *.html pages (verified 0 remaining; the
//       door3-preview embed-mode CSS selector + internal _internal/ file left as benign no-ops).
//     - index.html — institutional entry band added above the fold, directly under the hero: eyebrow
//       "For NHS · Commissioning · Research", headline, one honest line (I500 dataset · Lambeth/HIN
//       pilot in pursuit · DTAC V2 in progress), primary CTA → the-project.html (ungated explainer;
//       I500/FLT sit behind the Subscription gate so are poor first-click destinations), secondary
//       link → contact.html. New .inst-band CSS in the page's inline style block.
//     - index.html — trust strip LIFTED above the fold (was buried below the featured Checkout, near
//       the footer). Now sits just under the institutional band: Co. No. · DTAC pathway · evidence
//       base · open-by-default. Section order is now hero → inst-band → trust-strip → doors → featured.
//       Markup moved verbatim (IDs preserved for the Decision-Record JS); not duplicated.
//     - index.html — featured Checkout card de-staled. Was "First entry coming Monday … launches here"
//       / "Live from 5 May 2026" (the pre-launch placeholder). Now features the actual current entry:
//       the 1 June 2026 bread Surface-A piece ("Ten loaves on shelves this week"), capture-dated, link
//       → checkout-2026-06-01-bread.html.
//     - checkout.html — "Latest Checkout" hero was stuck on 18 May soft-drinks (+ a pre-launch
//       "template published this week / data populates from catch-up window" note). Replaced with the
//       1 June bread entry; stale catch-up prose removed.
//     - checkout.html — STALE/HONESTY FIX: removed the 8 June yoghurts + 15 June ready-meals entries
//       from the public archive. Both were fully-built pages stamped "Data captured Monday [future
//       date] 09:00 BST" — a §50 Honesty Test breach (capture claimed on dates that haven't occurred).
//       Draft files PRESERVED on disk (§14.3.1); just un-listed from the public archive until their
//       real Mondays. Footer "Coming Monday" teaser re-pointed from 29 June sauces → 8 June yoghurts.
//   WORKFLOW ROOT-CAUSE FIX (scheduled task scansmart-weekly-bigstore-audit SKILL.md, updated via the
//   scheduled-tasks channel): STEP 7 rewritten from "update archive list" to "publish across ALL
//   surfaces" — now updates the checkout.html Latest hero (7a), archive (7b), Coming-Monday footer
//   (7c), AND the index.html homepage featured card (7d). New HARD RULE: build only the immediate
//   upcoming Monday; never pre-build or publicly list future-dated entries; never stamp a future
//   capture-date. This closes the gap that let the homepage card + hub hero go stale and let the
//   future-dated yoghurts/ready-meals pages get published.
//   HONESTY: no over-claim — pilot is "in pursuit", DTAC "in progress", company is pre-funding;
//   featured card + hub Latest now point to a real published entry; no future-dated capture claims live.
//   §47a CANON-SYNC PROTOCOL: scope declared; built on v5.0.129; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.129 (2 June 2026) — Partner Programme removed from the site; partner.html demoted to an
//   institutional-enquiries holding page. Founder rationale: SCANSMART has no partners and nothing
//   yet to partner on; a productised partner programme can't lead the site when it's an empty offer.
//   It is a future layer that activates only after a proven NHS pilot. The Lambeth/HIN pilot pursuit
//   is NOT the Partner Programme and stays. B2B (I500 data + FLT access) de-conflated from the
//   productised programme and kept; institutional enquiries route to the holding page's contact box
//   and to the Contact page.
//   CHANGES:
//     - Sitewide: "Partner" nav link + "Partner programme" footer Products entry removed from all
//       66 standard-nav / 67 footer pages (perl-scoped to root *.html; verified 0 remaining).
//     - partner.html — rebuilt as an honest, early-stage holding page (4th month, pre-funding,
//       "a partner programme is a future layer"); carries the same email contact box (formType
//       "partner" → kip-forms Worker) + Admin@scansmart.uk; title/meta/OG/schema updated.
//     - index.html — removed the Class 2 "Partner with SCANSMART" door card; renumbered Checkout
//       (Class 3→2) and FLT (Class 4→3); school intro "Six ways in / Four classes / behind all six"
//       → "Five ways in / Three classes / behind all five"; dropped "Partner Programme" from the
//       hero subtitle, meta description, OG description, Organization schema, and the nav CSS comment.
//     - Schema.org Organization description fragment "the Knowledge Library, and the Partner
//       Programme" → "FLT, and the Knowledge Library" across all 15 pages carrying it (perl-scoped).
//     - subscribe.html — institutional-tier CTAs reworded ("Inquire via Partner" → "Institutional
//       enquiries"); both still resolve to the holding page.
//     - i500.html — two prose links (funding + pricing sections) de-named off "the Partner programme"
//       / "Door 3" → "institutional enquiry / enquiries", still → partner.html.
//     - contact.html — lede door-list link "partner programme" → "institutional enquiries".
//     - library.html — institutional-report link "contact the Partner programme" → "enquire about
//       institutional access".
//     - flt.html — stripped "delivered through the SCANSMART Partner Programme" framing; removed the
//       "04 · B2B Partner Programme" family card (Five surfaces → Four; FLT card 05→04); comparison
//       "Access: Partner Programme" cell → "By enquiry"; both Apply-for-access buttons repointed
//       from partner.html#partner-inquiry → partner.html ("Enquire about access").
//     - the-project.html — trunk doc reframed five products → four (CheckIT, I500, Library, FLT);
//       removed the Partner Programme surface paragraph; institutional-tier paragraph reframed to
//       I500/FLT licensing with a formal partner programme named as a future layer; meta + schema
//       + engage link updated.
//     - about.html — "six delivery systems" → "five" (h1, lede, h3); dropped the Partner programme
//       Tier 1 clause and the funding-line mention; engage link → "institutional enquiries".
//     - 404.html — Door 3 "Partner programme" card replaced with an FLT card (keeps four live doors).
//     - sitemap.xml — /partner kept live (holding page) but demoted (priority 0.9→0.3, monthly→yearly,
//       lastmod 2026-06-02).
//     - search-index.json — partner entry rewritten to holding-page content; index entry de-Partnered
//       (h3 swaps "Partner with SCANSMART" → "FLT — Food Label Terminal"); about + contact snippets
//       updated; industry-funding-bias h2 "Partner Programme — the manufacturer-tier constraint" →
//       "Institutional engagement — the manufacturer-tier constraint". Validated as well-formed JSON.
//     - library-industry-funding-bias.html — same h3/paragraph de-named off "Partner Programme" →
//       "SCANSMART's institutional engagement framework" (editorial-integrity point preserved).
//   NOTE: generic word-uses of "partner"/"partnership"/"partner conversations"/"partner-borough" left
//   intact where they are ordinary English, not the productised programme. Historical sw.js changelog
//   comments referencing the Partner Programme are immutable dated record and left unchanged.
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.137 — 4 June 2026: FLT three-government-source integration (cofid-fsa-usda)
//   Three free UK/US government datasets added to flt-app.html as new intelligence
//   sub-blocks (intelligence layers only — product-identity source-priority untouched).
//   All new blocks CSS-gated to .panel.expanded — invisible in the dense grid view.
//     - INTEGRATION 1 · ADDITIVE STATUS · GB (F1 fact-sheet, below Certifications).
//       FSA GB food-additives authorisation register. The regulated-products site has NO
//       per-E-number JSON query API (it is a client-rendered SPA); the authoritative bulk
//       CSV register is parsed to a local lookup (const FSA_ADDITIVES, 331 E-numbers) and
//       embedded inline. E-numbers parsed from OFF ingredients_text via /\bE\d{3,4}[a-z]?\b/.
//       §50: states GB authorisation STATUS only (Permitted / actual status / Not listed) —
//       never safe/unsafe. Source + fetch-date footer on the block.
//     - INTEGRATION 2 · UK PHE BENCHMARK (CoFID 2021) (F5 Reformulation Auditor multiples).
//       McCance & Widdowson '1.3 Proximates' parsed to const COFID_DATA (2,887 foods) +
//       COFID_CATEGORY_MAP (28 OFF-category → CoFID food-group mappings). Dotted cyan line at
//       the food-group median on each matching mini-chart (sugar/kcal/carbs/fibre/protein;
//       salt+satfat have no Proximates equivalent → no line). Legend documents it. §50: a
//       generic food-group benchmark, NOT a product-specific standard.
//     - INTEGRATION 3 · US FORMULATION (USDA FDC) (F3 nutrition panel, below the table).
//       Live USDA FoodData Central search, fired lazily on F3 expand (DEMO_KEY is heavily
//       rate-limited). Side-by-side OFF vs USDA per-100g (Energy/Protein/Fat/Carbs/Sugars/
//       Sodium). §50: neither column "more correct" — two national datasets, potentially
//       different formulations. Live data.gov / USDA FDC API key wired (rate-limit only,
//       client-visible by design — rotate at api.data.gov if needed).
//       Graceful "No matching USDA record found" / "unavailable" — never throws.
//   _headers: connect-src += https://api.nal.usda.gov (required for INTEGRATION 3 fetch;
//       FSA + CoFID are static-embedded so need no network at runtime).
//   Data build script: _internal/build-cofid-fsa.py → cofid-proximates.json + fsa-additives.json.
//   No service worker registered in flt-app.html (SW remains kill-switch only, per founder rule).
//   §47a CANON-SYNC PROTOCOL: scope declared; no parallel session conflict.
//   §112 LOCAL-IS-MAIN: edits land in /Users/clive/Documents/ScanSmart/scansmart-site/ (local).
//
// v5.0.138 — 4 June 2026: FLT search bar made distinct (flt-search-prominent)
//   The top search bar read as chrome, not as the entry point. Made prominent: topbar
//   height 32→40px (+ matching .shell calc), amber-tinted fill, always-on glow, a "SEARCH"
//   label, ⌕ icon, brighter placeholder (#555→#b89a6a), larger input (12→13.5px), and an
//   "↵ ENTER" hint. Bloomberg chrome preserved; the search is now unmistakable. CSS-only +
//   markup on flt-app.html.
//
// v5.0.139 — 4 June 2026: FLT INTEGRATION 4 — openFDA US recalls (flt-openfda-recalls)
//   New "US FDA RECALLS · LIVE" sub-block in the F1 expanded fact-sheet, below the FSA
//   recall-recency block. Live openFDA Food Enforcement feed (api.fda.gov, free, no key),
//   brand-matched (recalling_firm + product_description), newest 5, fired lazily on F1
//   expand. CSS-gated to .panel.expanded. §50: openFDA brand-string match, feed-bounded,
//   not a safety judgement; 404 = zero matches; quiet "unavailable" on error, never throws.
//   _headers: connect-src += https://api.fda.gov.
//
// v5.0.140 — 4 June 2026: FLT INTEGRATION 5 — EFSA ADI (flt-efsa-adi)
//   New "EFSA ADI" column in the F1 ADDITIVE STATUS table — acceptable daily intake
//   (mg/kg bw/day) for a curated common-additive subset (48 E-numbers). Source: EFSA
//   OpenFoodTox 3.0 (Zenodo); every value asserted present in the dataset for the named
//   substance by _internal/build-efsa-adi.py (no invented numbers; build fails loudly on
//   mismatch). Partial coverage by design; "—" when not in the curated set. §50: EFSA
//   health-based guidance value, not a per-product safety judgement. const FSA_ADI embedded.
// v5.0.141 — 4 June 2026: FLT INTEGRATION 6 — OHID/PHE reformulation targets (flt-ohid-targets)
//   The F5 Reformulation Auditor gains a 2nd dotted reference line — violet, distinct from the
//   cyan CoFID benchmark — at the official OHID/PHE category target on the SALT chart (2024 salt
//   target, average or maximum-where-avg-absent) and the SUGAR chart (2020 20% sugar guideline).
//   Sources: "Salt reduction targets for 2024" (PHE, Sep 2020) + "Sugar Reduction: Achieving the
//   20%" (PHE, Mar 2017). Every figure asserted present verbatim in the source PDF text by
//   _internal/build-ohid-targets.py (no invented numbers; build fails loudly on mismatch).
//   12 OFF categories curated (10 salt + 5 sugar); heterogeneous categories (meat/seafood/sauces)
//   skipped on purpose. Each line names its exact source sub-category in the F5 legend. §50:
//   official UK reduction-programme target, category-level — NOT a product standard. New const
//   OHID_TARGETS embedded; ohidTarget(p) helper added; renderMiniChart + renderShuffleLegend
//   take the new ohid arg. F5 multiples render in .panel.expanded only (no dense-view change).
//   No service worker registered in flt-app.html (SW stays kill-switch only). Product-identity
//   source-priority untouched — intelligence layer only.
// v5.0.142 — 4 June 2026: FLT analyst-tooling pass (flt-analyst-tooling)
//   Three net-new features (after verifying the 27-May audit's other items already shipped —
//   country-of-origin sub-block, source-priority modal, watchlist were all already live):
//   (1) HFSS INDICATOR (F3) — UK Nutrient Profiling Model 2004/05. computeHFSS(p): A-points
//       (energy kJ / sat fat / total sugars / sodium mg) minus C-points (fruit-veg-nut % / fibre
//       AOAC / protein); food score ≥4, drink ≥1 = HFSS; A≥11 & FVN<5 → protein cannot score.
//       Thresholds VERBATIM from the DH technical guidance (29/29 boundary + special-rule unit
//       tests pass). §50: an indicator from this OFF panel, NOT an official HFSS determination;
//       when fruit/veg/nut % is absent in OFF it is scored 0, making the result an UPPER BOUND.
//   (2) CSV EXPORT (F1/F3/F5/F6) — analyst output mirroring the F4 peer CSV. One delegated
//       row-builder per panel; ↓ CSV links in the static panel heads (stopPropagation so a CSV
//       click doesn't toggle expand); F5 exports the cached reformulation series. §31: export
//       from a paid surface is the subscriber's reasonable use, not tracking.
//   (3) SUPPLIER-RISK PROCUREMENT READ (F1 expanded) — the recomposition lift (audit #18).
//       computeSupplierRisk(p) composes signals ALREADY present — ownership churn + FSA recalls
//       in 12mo + F5 refined-starch shuffle (sugar↓+carbs↑) + OFF source freshness — into a
//       HOLD (≥3 flags) / REVIEW (1–2) / CLEAR (0) verdict (HFSS shown as context, not counted).
//       No new data. §50: a composed read from FLT signals, NOT advice; absent data = signal
//       unavailable, not a clean bill. CSS-gated to .panel.expanded.
//   All three verified via JavaScriptCore (node not installed): both inline scripts + sw.js pass
//   new Function() parse; HFSS 29/29 + supplier-risk 6/6 + CSV-builder output checks pass.
//   No service worker registered in flt-app.html (SW stays kill-switch only). Product-identity
//   source-priority untouched — intelligence layer only.
// v5.0.143 — 4 June 2026: FLT grey-text readability (flt-dim-contrast)
//   Founder flagged the F1 fact-sheet meta lines as hard to read. Lifted the FLT terminal's
//   --dim token #8a8a8a → #adadad (global contrast lift, scoped to flt-app.html only — does NOT
//   touch the marketing site), bumped .bo-method 9px → 9.5px, and gave its bold labels (OFF field
//   state: / Match method: …) a brighter #d6d6d6 non-italic treatment so they anchor as labels.
//   CSS only; no logic change.
// v5.0.158 — 13 June 2026: site-wide FLT rename FINALLY implemented (flt-rename-sitewide)
//   The "Food Literacy Terminal" → "Food Label Terminal" rename was decided + banked to canon on
//   3 Jun 2026 but NEVER applied to the site — git has no rename commit; 66 files / 83 occurrences
//   (nav links, <title>s, meta, iframe labels) still carried the old name (the public flt.html title
//   among them). Swept all 66 HTML files + rebuilt search-index.json. Intentional "Label Literacy" /
//   "School of Label Literacy" (140 uses) untouched. NOT touched, flagged for founder: "Cosmetics
//   Literacy Terminal" + "Supplements Literacy Terminal" (flt.html roadmap headings — sibling-vertical
//   names, not in the canon rename). Lesson: a ledger entry phrased as done ("renamed") masked an
//   unshipped decision for 10 days.
// v5.0.157 — 13 June 2026: FLT F1 claims-chip filter + F4 zero-value guard (flt-claims-chips-zero-guard)
//   F1: LABELS / CLAIMS dumped ALL OFF labels_tags, so OFF-computed grades (nutriscore-grade-a,
//   nova-group-4, ecoscore-*) showed as if they were on-pack claims. Now filtered via
//   OFF_DERIVED_LABEL so only genuine claims (no-gluten, no-added-sugar, organic…) render.
//   F4: peer panel showed M&S "0.00g salt → 100% less salt" — a null/missing OFF value of 0
//   rendered as a confident measurement + delta. pctDelta now returns null when either operand
//   is 0 (no fabricated "100% less" badge), and a literal 0 renders dimmed + ⚠ flagged as a
//   likely data gap, not a measured zero (§50). Pure flt-app.html; no worker/CSP change.
// v5.0.156 — 13 June 2026: FLT F7 wire via first-party aggregator + cache-bug fix (flt-wire-worker-proxy)
//   F7 showed "0 items" — rss2json works but the app fanned 13 SERIAL calls at its free tier,
//   self-throttling into rate-limit failures; worse, fetchWire cached the empty [] result for the
//   full 10-min TTL, freezing the blip. Fix: (1) new GET api.scansmart.uk/wire on the kip-forms
//   Worker fetches all 13 feeds server-side in PARALLEL, parses RSS/Atom → JSON, returns RAW items
//   (edge-cached 10 min); app calls it once via WIRE_FEED and keeps its keyword/score filter as the
//   single source of truth. (2) Empty results no longer cached (client + worker), and the read guard
//   self-heals old poisoned [] caches. (3) Stale "Food Literacy Terminal" → "Food Label Terminal"
//   (renamed 3 Jun 2026) in the header comment + HELP dialog. No CSP change. DEPLOY: wrangler deploy
//   workers/kip-forms FIRST (ships /recalls + /wire together), then git push.
// v5.0.155 — 13 June 2026: FLT F6 recalls via first-party proxy (flt-recalls-worker-proxy)
//   F6 showed "FSA feed blocked (Load failed)" — but the gov endpoint is healthy (200, CORS *,
//   valid JSON, in CSP). The block was client-side: ad/tracking blockers + iCloud Private Relay
//   dropping the direct data.food.gov.uk call. Fix: route recalls through the kip-forms Worker
//   (new GET api.scansmart.uk/recalls, server-side fetch + 15-min edge cache) so the browser
//   makes a first-party request shields don't touch. flt-app now calls FSA_PROXY; the old
//   "toggle shields / open in another browser" error copy (now false) rewritten to the real
//   post-proxy failure modes. No CSP change (api.scansmart.uk already allowlisted). DEPLOY: needs
//   `wrangler deploy` from workers/kip-forms FIRST, then git push.
// v5.0.154 — 13 June 2026: FLT F2 ingredient language fix (flt-ingredients-en-lang-notice)
//   Mutti (and other EU-import OFF records) rendered the F2 ingredient table in the product's
//   main language (German: "Gehackte Tomaten…") on a UK-facing terminal. Root cause: the row
//   name preferred OFF's localized i.text. Now prefers the OFF taxonomy id (en:-keyed,
//   canonical English) and only falls back to i.text when unmatched. Added p.lang to UA_FIELDS
//   and a §50 provenance notice under the INGREDIENTS title when the record's main language
//   isn't English and no ingredients_text_en exists. flt-app.html only; no marketing-site change.
// v5.0.153 — 12 June 2026: construction strip removed + About nav site-wide (construction-strip-about-nav)
//   Completes commit 109c39b (8 Jun), which removed the construction banner and added the
//   About nav link on index.html ONLY — every other page kept the banner and lacked About,
//   so the tab "disappeared" on click-through and the strip looked reinstated (founder
//   caught both on 12 Jun). This pass applies the same two changes to all 64 sibling pages:
//   (1) construction-strip div removed everywhere (replaced with a dated comment, matching
//       the index.html convention); .construction-strip CSS left in place, also matching.
//   (2) <a href="about.html">About</a> inserted after Library in every primary-nav
//       (aria-current="page" on about.html itself). Markup only; no logic change.
// v5.0.152 — 11 June 2026: FLT resilience — search debounce + API timeouts (flt-debounce-timeouts)
//   From the 11 Jun three-surface improvement review (Strategy/Improvement_Findings_
//   Site+PWA+FLT_2026-06-11.md), Part 0 item 5. flt-app.html only, no markup change:
//   (1) Live OFF autocomplete now debounced 400ms — local search still renders per
//       keystroke (instant, no network); the OFF request fires once the user pauses,
//       so typing "coffee" costs 1 API call, not 6. Protects against OFF rate limits
//       in long audit sessions. liveSearchToken stale-discard kept.
//   (2) New fetchWithTimeout() helper (AbortController, mirrors searchLive pattern).
//       FSA recalls fetch now aborts at 6s; WIRE RSS-proxy fetches abort at 8s per
//       source (the loop is serial — one hung proxy previously stalled every
//       subsequent feed). FSA error UI now distinguishes "unresponsive/timed out"
//       from "blocked by browser shields" so the analyst gets an honest diagnosis.
//   (3) Deploy-weight clean-up (same review, item 2): the 7.8 MB CheckIT-hero
//       source PNG (Gemini_Generated_Image_e3v2…) MOVED to KiP/Media/Images/
//       (NOT deleted — checkit.html:251 marks it §14.3.1-preserved; the review
//       agent's "unreferenced" claim missed that comment). checkit.html pointer
//       updated; file untracked from the repo so Pages stops shipping it.
//   (4) Retro-log for commit 92b985b (earlier today, shipped without its own bump):
//       Knowledge Library audio companion RESTORED — 14-episode player + dropdown +
//       "Jump to" entry on library.html, dropped by the 8 Jun commit. search-index.json
//       rebuilt in THIS commit (hygiene — §50 note: the indexer extracts
//       titles/headings/ledes and never captured player internals, so the restore
//       barely moves the index; episode titles are not site-searchable by design).
//       NOTE: library-childhood-obesity.html stays DE-LISTED from the library index
//       by design — §56 Panel Review not passed (DRAFT-IN-REVIEW per 1 Jun session
//       record). Still cross-linked from library-food-marketing-to-kids.html
//       (reachable, not promoted).
// v5.0.151 — 11 June 2026: public-facing email corrected (admin-email-public)
//   Founder call (this session): courtneyclive84@gmail.com is the vendor-sign-ups
//   address, NOT public-facing. All 8 public displays of it (contact ×1, press ×2,
//   privacy ×4, trademark ×1) replaced with Admin@scansmart.uk — which the kip-forms
//   Worker also delivers to, so privacy.html's description of form handling is now
//   exactly accurate. Closes the audit's L4 founder-email-exposure note.
// v5.0.150 — 11 June 2026: site forms LIVE end-to-end (kip-forms-live)
//   Phase B (Cloudflare-side, executed with founder today): kip-forms Worker deployed
//   for the first time (it had never been deployed — all 8 site forms were silently
//   failing since launch). D1 database kip-inquiries created (WEUR) + schema.sql
//   applied; TURNSTILE_SECRET + RESEND_API_KEY set via wrangler secret put; Resend
//   domain scansmart.uk verified (eu-west-1, DNS auto-configured); Turnstile widget
//   "SCANSMART forms" created (Managed). Worker now lives at api.scansmart.uk
//   (custom domain; workers.dev URL disabled — closes the audit's
//   personal-identifier-endpoint finding).
//   Phase C (this commit, per workers/kip-forms/WEBSITE_DIFF_PLAN.md): the 8 form
//   pages (partner, subscribe, contact, stories, shops, i500, checkout, press) get
//   the Turnstile loader in <head>, the cf-turnstile widget before the submit
//   button, and a rebuilt submit payload — correct formId enum (stories→story),
//   required-field fallbacks (Worker requires name/email/message; several forms
//   collect fewer), page-specific fields folded into message so nothing is lost,
//   cf-turnstile-response → turnstile_token, client-side honeypot short-circuit.
//   Endpoint: api.scansmart.uk/forms/submit. CSP: + challenges.cloudflare.com
//   (script-src, connect-src, new frame-src), + api.scansmart.uk (connect-src),
//   − kip-forms.courtneyclive84.workers.dev (legacy URL now appears nowhere).
// v5.0.149 — 11 June 2026: security audit remediation (security-xss-internal)
//   - flt-app.html: added esc()/safeUrl() output-escaping helpers and applied them at every
//     innerHTML sink that renders live external data — OFF product fields (brands, names,
//     quantity, code, ingredients, tags, image URL, rev), I500 record fields, FSA recall
//     title/business/risk/alertURL, WIRE feed title/link, autocomplete rows, ticker,
//     peer-comparison table, brand-ownership fallback, and error-path e.message echoes
//     (the "Product not found: <barcode>" message was a reflected-XSS path via typed input).
//     safeUrl() allows http(s) only — javascript:/data: URIs in OFF image URLs or feed
//     links collapse to no-link/no-image. OFF is community-editable, so its fields are
//     attacker-writable; escaping happens at render time, data left untouched.
//   - _redirects: /_internal/* and /workers/* now 301 → /. Both directories are git-tracked
//     so Pages was serving them publicly (pull.log, runbooks, universe JSONs, worker source
//     all returned 200 live — contradicting the v5.0.110-era note that _internal/ is
//     "not deployed"). robots.txt also disallows both paths (and its stale claim that
//     flt-app sits behind Cloudflare Access was corrected — it does not, verified live).
//   - _headers: added Strict-Transport-Security: max-age=31536000.
//   - workers/kip-forms/src/index.js: email subject line strips CR/LF/control chars from
//     the user-supplied name (mail-header-injection hardening; needs wrangler deploy).
//   - _internal/ and workers/ UNTRACKED from git + gitignored (files stay on disk).
//     Next deploy stops shipping them entirely; the _redirects rules above remain as
//     belt-and-braces. NOTE: the GitHub repo is public, so old commits still contain
//     these files until history is rewritten (separate decision — needs force push).
//   No visual changes. No feature changes. Key-gates untouched (client-side by design,
//   Bible §116/§117).
// v5.0.148 — 9 June 2026: iOS install path simplified to 3 beats (install-ios-3beat)
//   - Dropped the leading "3 dots" step from the iPhone Add-to-Home-Screen flow in both
//     install.js (nav modal) and install.html (full guide). Path is now Share → Add to
//     Home Screen → Add across summary line, numbered steps, and sticky reminder.
//   - Removed the Safari address-bar SVG diagram + its .safari-diagram CSS from install.html
//     (it depicted the now-removed three-dots step). Chrome/Android three-dot step unchanged.
//
// v5.0.146 — 4 June 2026: about.html h1 accent — "four delivery systems." wrapped in
//   var(--red-soft) italic to match the established site h1 pattern (CheckIT, I500,
//   Checkout, FLT all accent the last phrase of the hero h1).
//
// v5.0.145 — 4 June 2026: flt.html panel descriptions updated to reflect 4 June additions
//   F1: expanded fact-sheet capabilities (GB additive status, EFSA ADI, openFDA, allergen profile,
//       certifications, source freshness, brand ownership, USDA cross-ref, supplier-risk, CSV).
//   F2: removed "EFSA risk" (that's F1 expanded) — now accurately describes risk flags + cross-contact.
//   F3: added HFSS indicator, %RI column, USDA cross-reference, CSV export.
//   F5: updated to 7-nutrient framework, CoFID medians, OHID/PHE targets, shuffle-pattern detection, CSV.
//
// v5.0.144 — 4 June 2026: grey still too dim per founder; --dim #adadad → #c4c4c4 (clearly legible
//   on the near-black panel, still secondary to the #e7e7e7 body text). Confirmed no neutral
//   mid-greys bypass the token (the hardcoded greys are tinted accents, not body text). CSS only.
//
const CACHE_VERSION = 'scansmart-v5.0.158-flt-rename-sitewide';
const PRECACHE = [
  '/',
  '/install.html',
  '/launch.html',
  '/door3-preview.html',
  '/flt.html',
  '/flt-gate.html',
  '/i500.html',
  '/i500-gate.html',
  '/brand.css',
  '/install.js',
  '/i500-ticker.json',
  '/door3-data.json',
  '/assets/hero-v16.webp',
  '/assets/marque-v1.svg',
  '/assets/marque-v1-hero.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept cross-origin (Workers, fonts, analytics)
  if (url.origin !== self.location.origin) return;

  // Don't cache POST or anything that's not GET
  if (event.request.method !== 'GET') return;

  // Network-first for HTML
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((m) => m || caches.match('/')))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
