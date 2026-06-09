// =============================================================
// SCANSMART shared install handler
// Loaded on every page; provides global installScansmart() function
// for the nav "Install" button.
//
// Behavior per platform:
//   Android Chrome / desktop Chrome → triggers native install dialog
//                                     via captured beforeinstallprompt
//   iPhone Safari                   → opens inline modal with the 4-beat
//                                     path (3 dots → Share → Add to Home Screen → Add)
//   Already installed (standalone)  → button hidden on load
//   Anything else                   → falls through to /install page
//
// Built 3 May 2026 — site-wide install enablement
// =============================================================

(function () {
  // ---- Platform detection
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith('android-app://');

  // ---- beforeinstallprompt capture
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // ---- appinstalled — hide button after install completes
  window.addEventListener('appinstalled', () => {
    document.querySelectorAll('.install-btn').forEach(b => b.style.display = 'none');
    deferredPrompt = null;
  });

  // ---- Hide install buttons if already installed
  function hideIfInstalled() {
    if (!isStandalone) return;
    document.querySelectorAll('.install-btn').forEach(b => b.style.display = 'none');
  }

  // ---- iPhone Safari modal injection
  function injectModal() {
    if (document.getElementById('install-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'install-modal';
    modal.className = 'install-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'install-modal-title');
    modal.innerHTML = `
      <div class="install-modal-backdrop" onclick="closeInstallModal()"></div>
      <div class="install-modal-card">
        <button class="install-modal-close" type="button" aria-label="Close" onclick="closeInstallModal()">&times;</button>
        <h2 id="install-modal-title">Add SCANSMART to your iPhone</h2>
        <p class="install-modal-path">
          Share <span class="path-arrow">&rarr;</span> Add to Home Screen <span class="path-arrow">&rarr;</span> Add
        </p>
        <ol class="install-modal-steps">
          <li><strong>Tap "Share"</strong> in Safari.</li>
          <li><strong>Scroll down and tap "Add to Home Screen"</strong>.</li>
          <li><strong>Tap "Add"</strong> in the top right.</li>
        </ol>
        <a href="install.html" class="install-modal-link">See the full install guide &rarr;</a>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ---- Modal open/close (exposed globally for onclick handlers)
  window.openInstallModal = function () {
    injectModal();
    requestAnimationFrame(() => {
      document.getElementById('install-modal').classList.add('is-open');
    });
  };
  window.closeInstallModal = function () {
    const m = document.getElementById('install-modal');
    if (m) m.classList.remove('is-open');
  };

  // ---- Main install action — wired to nav button click
  window.installScansmart = async function (event) {
    if (isStandalone) {
      // Already installed — nothing to do
      if (event && event.preventDefault) event.preventDefault();
      return;
    }

    // Android / desktop Chrome with captured prompt — fire native dialog
    if (deferredPrompt) {
      if (event && event.preventDefault) event.preventDefault();
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          document.querySelectorAll('.install-btn').forEach(b => b.style.display = 'none');
        }
      } catch (e) {
        // If prompt fails for any reason, fall back to the install page
        window.location.href = 'install.html';
      }
      deferredPrompt = null;
      return;
    }

    // iPhone Safari — show the 4-beat modal inline (no navigation)
    if (isIOSSafari) {
      if (event && event.preventDefault) event.preventDefault();
      window.openInstallModal();
      return;
    }

    // Anything else (Firefox iOS, desktop Safari, etc.) — let the link
    // navigate to /install for the full guide
    // (event.preventDefault NOT called, anchor href takes over)
  };

  // ---- "Open in browser" / "Share" affordance for standalone-PWA users
  // Injects a small floating button bottom-right when running as a standalone PWA.
  //
  // Per-platform behaviour:
  //   iOS PWA      → button labelled "Share ↗" → navigator.share() opens the
  //                  iOS share sheet, which includes "Open in Safari" as a
  //                  default action. Apple intentionally blocks any other path
  //                  for opening same-origin URLs externally — the share sheet
  //                  IS the only reliable escape from a standalone PWA shell.
  //   Android PWA  → button labelled "Open in browser ↗" → window.open() opens
  //                  Chrome in a new tab cleanly.
  //   Other        → window.open() / clipboard fallback.
  function injectBrowserLink() {
    if (!isStandalone) return;
    if (document.getElementById('pwa-browser-link')) return;
    const aside = document.createElement('aside');
    aside.id = 'pwa-browser-link';
    aside.className = 'pwa-browser-link';
    aside.setAttribute('role', 'note');
    const label = isIOS ? 'Share' : 'Open in browser';
    const ariaLabel = isIOS
      ? 'Share this page or open in Safari'
      : 'Open this page in your regular browser';
    aside.innerHTML = `
      <button type="button" onclick="openInBrowser(event)" aria-label="${ariaLabel}">
        ${label} <span aria-hidden="true">&#8599;</span>
      </button>
    `;
    document.body.appendChild(aside);
  }

  window.openInBrowser = async function (event) {
    if (event && event.preventDefault) event.preventDefault();
    const url = window.location.href;

    // iOS standalone PWA — share sheet is the only reliable path to Safari.
    // Apple deliberately blocks navigator.url-launch / window.open external
    // for same-origin URLs from standalone mode. Going straight to share
    // gives the user "Open in Safari" as a one-tap option in the sheet.
    if (isIOS && navigator.share) {
      try {
        await navigator.share({ title: document.title, url: url });
        return;
      } catch (err) {
        // User cancelled — bail silently
        return;
      }
    }

    // Android / desktop — window.open with _blank opens external browser
    let opened = null;
    try { opened = window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) {}
    if (opened && !opened.closed) return;

    // Fallback — copy URL to clipboard so user can paste in their browser
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied. Paste into Safari or Chrome to open in your browser.');
        return;
      } catch (err) {}
    }
    // Last resort — show URL in alert
    alert('Open this URL in your browser:\n' + url);
  };

  function showToast(message) {
    let toast = document.getElementById('pwa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwa-toast';
      toast.className = 'pwa-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toast._dismiss);
    toast._dismiss = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  }

  window.openInBrowser = async function (event) {
    if (event && event.preventDefault) event.preventDefault();
    const url = window.location.href;

    // Web Share API — on iOS this gives the user "Open in Safari" in the share sheet
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: url });
        return;
      } catch (err) {
        // User cancelled or share unavailable — fall through
      }
    }

    // window.open with _blank — usually launches external browser on Android / desktop
    let opened = null;
    try { opened = window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) {}
    if (opened && !opened.closed) return;

    // Final fallback — copy URL to clipboard so the user can paste in their browser
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied. Paste into Safari or Chrome to open in your browser.');
        return;
      } catch (err) {}
    }
    // Last resort — surface the URL in an alert
    alert('Open this URL in your browser:\n' + url);
  };

  // ---- Init on DOMContentLoaded so nav buttons exist
  function init() {
    hideIfInstalled();
    injectBrowserLink();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeInstallModal();
  });
})();

// =============================================================
// SCANSMART Library mega-menu — site-wide
// Turns the "Library" nav link into a hover/tap-to-open dropdown
// listing every decoder, evidence vault and reference tool.
// Available on every page that includes install.js.
// Built 10 May 2026.
// =============================================================
(function libraryNavMenu() {
  // ---- Inject styles (self-contained so we don't have to touch brand.css)
  var css = [
    '.lib-nav-wrap { position: relative; display: inline-block; }',
    '.nav-doors.open .lib-nav-wrap { display: block; width: 100%; }',
    '.lib-nav-trigger::after { content: " ▾"; font-size: 0.72em; opacity: 0.7; }',
    '.lib-nav-panel {',
    '  position: absolute; top: calc(100% + 6px); right: 0;',
    '  min-width: 720px; max-width: 92vw;',
    '  max-height: calc(100vh - 120px); overflow-y: auto;',
    '  overscroll-behavior: contain;',
    '  background: #060F1C; color: #F5F0E8;',
    '  border: 1px solid rgba(245,240,232,0.16);',
    '  border-radius: 10px;',
    '  box-shadow: 0 16px 48px rgba(0,0,0,0.55);',
    '  padding: 18px 20px 20px;',
    '  display: none; z-index: 200;',
    '}',
    '.lib-nav-panel.open { display: block; }',
    '.lib-nav-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));',
    '  gap: 18px 24px;',
    '}',
    '.lib-nav-group h4 {',
    '  font-family: Syne, system-ui, sans-serif;',
    '  font-size: 0.7rem; font-weight: 800;',
    '  letter-spacing: 0.14em; text-transform: uppercase;',
    '  color: #F5C518; margin: 0 0 8px 0;',
    '}',
    '.lib-nav-group ul { list-style: none; padding: 0; margin: 0; }',
    '.lib-nav-group li { margin: 4px 0; }',
    '.lib-nav-group a {',
    '  display: block; padding: 4px 6px; margin: 0 -6px;',
    '  color: #F5F0E8; text-decoration: none;',
    '  font-size: 0.88rem; line-height: 1.35;',
    '  border-radius: 4px; border: 0 !important;',
    '  transition: background 0.14s ease, color 0.14s ease;',
    '}',
    '.lib-nav-group a:hover, .lib-nav-group a:focus {',
    '  background: rgba(245,197,24,0.12); color: #F5C518; outline: 0;',
    '}',
    '.lib-nav-foot {',
    '  margin-top: 16px; padding-top: 14px;',
    '  border-top: 1px solid rgba(245,240,232,0.16);',
    '  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;',
    '}',
    '.lib-nav-foot a {',
    '  color: #F5C518; font-family: Syne, system-ui, sans-serif;',
    '  font-size: 0.78rem; font-weight: 700;',
    '  letter-spacing: 0.12em; text-transform: uppercase;',
    '  text-decoration: none; border: 0 !important;',
    '}',
    '.lib-nav-foot a:hover { opacity: 0.85; }',
    /* Mobile: panel becomes inline-flow inside the open hamburger nav */
    '@media (max-width: 880px) {',
    '  .lib-nav-panel {',
    '    position: static; min-width: 0; max-width: none;',
    '    margin: 6px 0 4px; padding: 14px 12px 16px;',
    '    box-shadow: none; border-radius: 8px;',
    '  }',
    '  .lib-nav-grid { grid-template-columns: 1fr; gap: 14px; }',
    '}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'lib-nav-menu-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Menu content (single source of truth — every label decoder + evidence vault + tool)
  var groups = [
    {
      title: 'Label decoders — fundamentals',
      items: [
        ['library-method.html', 'The SCANSMART Method'],
        ['library-ingredient-rules.html', 'Ingredient List Rules'],
        ['library-allergens.html', 'The 14 UK Allergens'],
        ['library-gluten-free.html', 'Gluten-Free'],
        ['library-date-labels.html', 'Date Labels'],
        ['library-barcodes.html', 'Barcodes']
      ]
    },
    {
      title: 'Front-of-pack & claims',
      items: [
        ['library-front-of-pack.html', 'Front-of-Pack Systems'],
        ['library-nutrition-claims.html', 'Nutrition Claims'],
        ['library-country-of-origin.html', 'Country of Origin'],
        ['library-calories.html', 'Calories & Energy'],
        ['library-symbols.html', 'Symbols & Trustmarks']
      ]
    },
    {
      title: 'Ingredients & nutrients',
      items: [
        ['library-salt.html', 'Hidden Names for Salt'],
        ['library-sugar.html', 'Hidden Names for Sugar'],
        ['library-sweeteners.html', 'Sweeteners (Non-Sugar)'],
        ['library-fats.html', 'Hidden Names for Fats'],
        ['library-e-numbers.html', 'E Numbers (Additives)'],
        ['library-upf.html', 'Ultra-Processed Foods (UPF)']
      ]
    },
    {
      title: 'Evidence vaults & reports',
      items: [
        ['library-upf-brain-cognitive.html', 'UPF, Brain & Cognitive'],
        ['library-behaviour-change-decision-point.html', 'Behaviour Change at the Decision Point'],
        ['library-children-oral-health.html', "Children's Oral Health"],
        ['library-caffeine-and-health.html', 'Caffeine & Health'],
        ['library-industry-funding-bias.html', 'Industry Funding Bias'],
        ['library-recipe-for-change-charter.html', 'Recipe for Change Charter'],
        ['library-frozen-food-uk.html', 'Frozen Food UK report'],
      ]
    },
    {
      title: 'Reference tools',
      items: [
        ['library-periodic-table.html', 'Interactive Periodic Table'],
        ['library.html#audio-companion', 'Audio companion']
      ]
    }
  ];

  function buildPanelHTML() {
    var html = '<div class="lib-nav-grid">';
    groups.forEach(function (g) {
      html += '<div class="lib-nav-group"><h4>' + g.title + '</h4><ul>';
      g.items.forEach(function (it) {
        html += '<li><a href="' + it[0] + '">' + it[1] + '</a></li>';
      });
      html += '</ul></div>';
    });
    html += '</div>';
    html += '<div class="lib-nav-foot">';
    html += '<a href="library.html">→ Open the full Library</a>';
    html += '<a href="library.html#toc-heading">See contents page</a>';
    html += '</div>';
    return html;
  }

  // ---- Wire it up
  function init() {
    var libLinks = document.querySelectorAll('.nav-doors a.lib, .nav-doors a[href$="library.html"]');
    if (!libLinks.length) return;

    libLinks.forEach(function (link) {
      // Don't double-wrap if already initialised
      if (link.parentNode && link.parentNode.classList && link.parentNode.classList.contains('lib-nav-wrap')) return;

      var wrap = document.createElement('div');
      wrap.className = 'lib-nav-wrap';
      link.parentNode.insertBefore(wrap, link);
      wrap.appendChild(link);
      link.classList.add('lib-nav-trigger');
      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', 'false');

      var panel = document.createElement('div');
      panel.className = 'lib-nav-panel';
      panel.setAttribute('role', 'menu');
      panel.innerHTML = buildPanelHTML();
      wrap.appendChild(panel);

      var open = false;
      var hideTimer = null;
      var isTouch = window.matchMedia('(hover: none)').matches;

      function show() {
        clearTimeout(hideTimer);
        panel.classList.add('open');
        link.setAttribute('aria-expanded', 'true');
        open = true;
      }
      function hide() {
        panel.classList.remove('open');
        link.setAttribute('aria-expanded', 'false');
        open = false;
      }
      function hideSoon() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hide, 220);
      }

      // Desktop: hover open / leave close
      wrap.addEventListener('mouseenter', show);
      wrap.addEventListener('mouseleave', hideSoon);

      // Touch / mobile: first tap opens, second tap (when already open) follows the link
      link.addEventListener('click', function (e) {
        if (isTouch || window.innerWidth <= 880) {
          if (!open) {
            e.preventDefault();
            show();
          }
        }
      });

      // Click outside the wrapper closes
      document.addEventListener('click', function (e) {
        if (open && !wrap.contains(e.target)) hide();
      });

      // Escape closes
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && open) hide();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// =============================================================
// SCANSMART Site-wide search — modal overlay
// Adds a magnifying-glass icon to the top nav on every page.
// Click (or Cmd/Ctrl+K) opens a modal with a search input that
// queries search-index.json (page titles, ledes, headings,
// decoder rows). Results link to pages and where relevant scroll
// to the matching row on the destination page.
// Built 10 May 2026.
// =============================================================
(function siteSearch() {
  var INDEX_URL = 'search-index.json';
  var indexCache = null;
  var indexLoading = null;

  // ---- Inject styles
  var css = [
    /* Trigger button injected into the nav */
    '.ss-search-trigger {',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  background: transparent; border: 1px solid rgba(245,240,232,0.16);',
    '  color: #F5F0E8; cursor: pointer; padding: 8px 10px;',
    '  border-radius: 8px; margin: 0 6px; transition: background 0.18s ease;',
    '}',
    '.ss-search-trigger:hover { background: rgba(245,240,232,0.16); }',
    '.ss-search-trigger svg { width: 16px; height: 16px; display: block; }',
    /* Modal overlay */
    /* Lock body scroll while modal is open */
    'body.ss-modal-open { overflow: hidden; }',
    '.ss-search-modal {',
    '  position: fixed; inset: 0; z-index: 9000;',
    '  background: rgba(6,15,28,0.78); backdrop-filter: blur(6px);',
    '  display: none; align-items: flex-start; justify-content: center;',
    '  padding: 8vh 16px 16px;',
    '  overflow-y: auto; overscroll-behavior: contain;',
    '}',
    '.ss-search-modal.open { display: flex; }',
    '.ss-search-panel {',
    '  width: 100%; max-width: 680px; background: #060F1C;',
    '  border: 1px solid rgba(245,240,232,0.16); border-radius: 12px;',
    '  box-shadow: 0 24px 64px rgba(0,0,0,0.6);',
    '  display: flex; flex-direction: column;',
    '  max-height: 84vh; min-height: 0; overflow: hidden;',
    '}',
    '.ss-search-input-wrap {',
    '  display: flex; align-items: center; gap: 10px;',
    '  padding: 14px 16px; border-bottom: 1px solid rgba(245,240,232,0.10);',
    '}',
    '.ss-search-input-wrap svg { width: 18px; height: 18px; color: #8899AA; flex-shrink: 0; }',
    '.ss-search-input {',
    '  flex: 1; background: transparent; border: 0; outline: none;',
    '  color: #F5F0E8; font-family: "DM Sans", system-ui, sans-serif;',
    '  font-size: 1.05rem; font-weight: 500; padding: 4px 0;',
    '}',
    '.ss-search-input::placeholder { color: #5C6B7C; }',
    '.ss-search-close {',
    '  background: transparent; border: 1px solid rgba(245,240,232,0.16);',
    '  color: #8899AA; cursor: pointer; padding: 3px 8px;',
    '  border-radius: 4px; font-family: "Syne", system-ui, sans-serif;',
    '  font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase;',
    '}',
    '.ss-search-close:hover { color: #F5F0E8; background: rgba(245,240,232,0.10); }',
    '.ss-search-results {',
    '  flex: 1 1 auto; min-height: 0;',
    '  overflow-y: auto; overscroll-behavior: contain;',
    '  padding: 6px 0;',
    '}',
    '.ss-search-empty {',
    '  padding: 24px 18px; color: #8899AA;',
    '  font-size: 0.92rem; line-height: 1.5;',
    '}',
    '.ss-search-group-label {',
    '  font-family: "Syne", system-ui, sans-serif; font-size: 0.66rem;',
    '  font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;',
    '  color: #F5C518; padding: 12px 18px 6px;',
    '}',
    '.ss-search-result {',
    '  display: block; padding: 10px 18px; color: #F5F0E8;',
    '  text-decoration: none; border-left: 3px solid transparent;',
    '  transition: background 0.12s ease, border-color 0.12s ease;',
    '}',
    '.ss-search-result:hover, .ss-search-result.active {',
    '  background: rgba(37,99,235,0.14); border-left-color: #2563EB;',
    '}',
    '.ss-search-result-title {',
    '  font-family: "DM Sans", system-ui, sans-serif;',
    '  font-size: 0.95rem; font-weight: 600; margin: 0 0 2px;',
    '}',
    '.ss-search-result-snippet {',
    '  font-size: 0.84rem; color: #8899AA; line-height: 1.4;',
    '  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;',
    '  overflow: hidden;',
    '}',
    '.ss-search-result-meta {',
    '  font-family: "Syne", system-ui, sans-serif; font-size: 0.66rem;',
    '  font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;',
    '  color: #5C6B7C; margin-top: 4px;',
    '}',
    '.ss-search-result-meta .row-page { color: #F5C518; }',
    '.ss-search-result-mark { color: #F5C518; font-weight: 700; }',
    '.ss-search-footer {',
    '  padding: 8px 18px; border-top: 1px solid rgba(245,240,232,0.10);',
    '  font-size: 0.72rem; color: #5C6B7C; display: flex; gap: 14px;',
    '  font-family: "Syne", system-ui, sans-serif; letter-spacing: 0.06em;',
    '}',
    '.ss-search-footer kbd {',
    '  background: rgba(245,240,232,0.10); padding: 1px 5px; border-radius: 3px;',
    '  font-family: inherit; font-size: 0.66rem; color: #F5F0E8;',
    '}',
    /* Mobile */
    '@media (max-width: 600px) {',
    '  .ss-search-modal { padding: 4vh 8px 8px; }',
    '  .ss-search-panel { max-height: 92vh; }',
    '}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'site-search-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Load the index lazily (only on first open)
  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (indexLoading) return indexLoading;
    indexLoading = fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        indexCache = data;
        return data;
      })
      .catch(function (err) {
        indexLoading = null;
        console.error('Search index load failed:', err);
        return null;
      });
    return indexLoading;
  }

  // ---- Search algorithm — substring match with simple ranking
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, query) {
    if (!text || !query) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var qEsc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('(' + qEsc + ')', 'ig');
    return escaped.replace(re, '<span class="ss-search-result-mark">$1</span>');
  }

  function scorePage(p, q) {
    var score = 0;
    var ql = q.toLowerCase();
    var titleL = (p.title || '').toLowerCase();
    if (titleL.indexOf(ql) !== -1) score += 12;
    if (titleL.indexOf(' ' + ql) !== -1 || titleL.indexOf(ql + ' ') !== -1 || titleL.startsWith(ql)) score += 6;
    if ((p.h1 || '').toLowerCase().indexOf(ql) !== -1) score += 6;
    if ((p.snippet || '').toLowerCase().indexOf(ql) !== -1) score += 4;
    if ((p.desc || '').toLowerCase().indexOf(ql) !== -1) score += 3;
    var h2hit = (p.h2 || []).some(function (h) { return h.toLowerCase().indexOf(ql) !== -1; });
    if (h2hit) score += 3;
    var h3hit = (p.h3 || []).some(function (h) { return h.toLowerCase().indexOf(ql) !== -1; });
    if (h3hit) score += 2;
    return score;
  }

  function scoreRow(r, q) {
    var score = 0;
    var ql = q.toLowerCase();
    var nameL = (r.name || '').toLowerCase();
    if (nameL.indexOf(ql) !== -1) score += 14;
    if (nameL.startsWith(ql)) score += 8;
    if ((r.category || '').toLowerCase().indexOf(ql) !== -1) score += 4;
    if ((r.what || '').toLowerCase().indexOf(ql) !== -1) score += 3;
    if ((r.kip || '').toLowerCase().indexOf(ql) !== -1) score += 2;
    return score;
  }

  function runSearch(index, q) {
    if (!q || q.length < 2) return { pages: [], rows: [] };
    var pages = (index.pages || [])
      .map(function (p) { return { item: p, score: scorePage(p, q) }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 8)
      .map(function (x) { return x.item; });
    var rows = (index.rows || [])
      .map(function (r) { return { item: r, score: scoreRow(r, q) }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 12)
      .map(function (x) { return x.item; });
    return { pages: pages, rows: rows };
  }

  // ---- Build the modal markup once, lazily
  var modal, input, results, activeIndex = -1, currentMatches = [];

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'ss-search-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Site search');
    modal.innerHTML = [
      '<div class="ss-search-panel">',
      '  <div class="ss-search-input-wrap">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
      '    <input type="text" class="ss-search-input" placeholder="Search SCANSMART — pages, decoders, sodium names, E-numbers…" aria-label="Search">',
      '    <button type="button" class="ss-search-close" aria-label="Close search">Esc</button>',
      '  </div>',
      '  <div class="ss-search-results" role="listbox" aria-label="Search results"></div>',
      '  <div class="ss-search-footer">',
      '    <span><kbd>↑↓</kbd> navigate</span>',
      '    <span><kbd>↵</kbd> open</span>',
      '    <span><kbd>esc</kbd> close</span>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    input   = modal.querySelector('.ss-search-input');
    results = modal.querySelector('.ss-search-results');

    modal.querySelector('.ss-search-close').addEventListener('click', closeSearch);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeSearch(); });
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);

    return modal;
  }

  function renderEmpty(q) {
    if (!q) {
      results.innerHTML = '<div class="ss-search-empty">Try a decoder name (<em>salt</em>, <em>sugar</em>, <em>e-numbers</em>), an ingredient (<em>MSG</em>, <em>calcium propionate</em>), or a topic (<em>UPF</em>, <em>HFSS</em>, <em>industry funding bias</em>).</div>';
    } else if (q.length < 2) {
      results.innerHTML = '<div class="ss-search-empty">Keep typing…</div>';
    } else {
      results.innerHTML = '<div class="ss-search-empty">No matches for <strong>' + escapeHtml(q) + '</strong>. Try a different word or check spelling.</div>';
    }
    currentMatches = [];
    activeIndex = -1;
  }

  function renderResults(matches, q) {
    var html = [];
    currentMatches = [];

    if (matches.pages.length) {
      html.push('<div class="ss-search-group-label">Pages</div>');
      matches.pages.forEach(function (p) {
        currentMatches.push({ url: p.url, type: 'page' });
        html.push(
          '<a class="ss-search-result" href="' + escapeHtml(p.url) + '">' +
            '<div class="ss-search-result-title">' + highlight(p.title, q) + '</div>' +
            (p.snippet ? '<div class="ss-search-result-snippet">' + highlight(p.snippet, q) + '</div>' : '') +
          '</a>'
        );
      });
    }

    if (matches.rows.length) {
      html.push('<div class="ss-search-group-label">Decoder entries</div>');
      matches.rows.forEach(function (r) {
        currentMatches.push({ url: r.url, type: 'row' });
        var detail = r.what || r.kip || '';
        html.push(
          '<a class="ss-search-result" href="' + escapeHtml(r.url) + '">' +
            '<div class="ss-search-result-title">' + highlight(r.name, q) + '</div>' +
            (detail ? '<div class="ss-search-result-snippet">' + highlight(detail, q) + '</div>' : '') +
            '<div class="ss-search-result-meta">' +
              escapeHtml(r.category || '') + ' &middot; <span class="row-page">' + escapeHtml(r.page_title || '') + '</span>' +
            '</div>' +
          '</a>'
        );
      });
    }

    if (!html.length) {
      renderEmpty(q);
      return;
    }

    results.innerHTML = html.join('');
    activeIndex = -1;
  }

  function onInput() {
    var q = input.value.trim();
    if (!indexCache) {
      results.innerHTML = '<div class="ss-search-empty">Loading search index…</div>';
      loadIndex().then(function () { onInput(); });
      return;
    }
    if (q.length < 2) {
      renderEmpty(q);
      return;
    }
    renderResults(runSearch(indexCache, q), q);
  }

  function setActive(i) {
    var nodes = results.querySelectorAll('.ss-search-result');
    if (!nodes.length) return;
    if (i < 0) i = nodes.length - 1;
    if (i >= nodes.length) i = 0;
    nodes.forEach(function (n) { n.classList.remove('active'); });
    nodes[i].classList.add('active');
    nodes[i].scrollIntoView({ block: 'nearest' });
    activeIndex = i;
  }

  function onKeydown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
    else if (e.key === 'Enter') {
      var nodes = results.querySelectorAll('.ss-search-result');
      if (activeIndex >= 0 && nodes[activeIndex]) {
        e.preventDefault();
        nodes[activeIndex].click();
      } else if (nodes[0]) {
        e.preventDefault();
        nodes[0].click();
      }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  }

  function openSearch() {
    buildModal();
    modal.classList.add('open');
    document.body.classList.add('ss-modal-open');
    setTimeout(function () { input.focus(); }, 30);
    loadIndex().then(function () {
      if (!input.value.trim()) renderEmpty('');
    });
  }

  function closeSearch() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('ss-modal-open');
    input.value = '';
    renderEmpty('');
  }

  // ---- Inject the trigger button into the nav on every page
  function injectTrigger() {
    document.querySelectorAll('.nav-doors').forEach(function (nav) {
      if (nav.querySelector('.ss-search-trigger')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ss-search-trigger';
      btn.setAttribute('aria-label', 'Search SCANSMART');
      btn.title = 'Search  (⌘K)';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
      btn.addEventListener('click', openSearch);
      // Insert before the Install button if present, else at the start
      var installBtn = nav.querySelector('.install-btn');
      if (installBtn) nav.insertBefore(btn, installBtn);
      else nav.insertBefore(btn, nav.firstChild);
    });
  }

  // ---- Global keyboard shortcut: Cmd/Ctrl+K
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  function init() {
    injectTrigger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// =============================================================
// SCANSMART Language picker — site-wide
// Globe icon in the nav opens a dropdown with the ten priority
// languages (per Brand Bible v6.x diaspora canon). Each language
// link opens the current page translated via Google Translate
// in a NEW TAB. No widget. No cookies on this site. No consent
// banner needed — the link is the user's deliberate action,
// no third-party assets load until the user clicks.
// Built 16 May 2026.
// =============================================================
(function languagePicker() {
  // ---- Canonical priority languages (Brand Bible v6.x — Family Plan diaspora)
  var langs = [
    { code: 'hi', native: 'हिन्दी',     english: 'Hindi' },
    { code: 'bn', native: 'বাংলা',      english: 'Bengali' },
    { code: 'ur', native: 'اردو',        english: 'Urdu' },
    { code: 'pa', native: 'ਪੰਜਾਬੀ',     english: 'Punjabi' },
    { code: 'yo', native: 'Yorùbá',     english: 'Yoruba' },
    { code: 'ak', native: 'Twi',        english: 'Twi (Akan)' },
    { code: 'pl', native: 'Polski',     english: 'Polish' },
    { code: 'fr', native: 'Français',   english: 'French' },
    { code: 'es', native: 'Español',    english: 'Spanish' },
    { code: 'pt', native: 'Português',  english: 'Portuguese' }
  ];

  // ---- Inject styles (self-contained)
  var css = [
    '.ss-lang-trigger {',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  background: transparent; border: 1px solid rgba(245,240,232,0.16);',
    '  color: #F5F0E8; cursor: pointer; padding: 8px 10px;',
    '  border-radius: 8px; margin: 0 6px; transition: background 0.18s ease;',
    '}',
    '.ss-lang-trigger:hover { background: rgba(245,240,232,0.16); }',
    '.ss-lang-trigger svg { width: 16px; height: 16px; display: block; }',
    /* Wrapper for trigger + panel positioning */
    '.ss-lang-wrap { position: relative; display: inline-block; }',
    '.nav-doors.open .ss-lang-wrap { display: block; width: 100%; }',
    /* Dropdown panel */
    '.ss-lang-panel {',
    '  position: absolute; top: calc(100% + 6px); right: 0;',
    '  min-width: 280px; max-width: 92vw;',
    '  max-height: calc(100vh - 100px);',
    '  overflow-y: auto; -webkit-overflow-scrolling: touch;',
    '  overscroll-behavior: contain;',
    '  background: #060F1C; color: #F5F0E8;',
    '  border: 1px solid rgba(245,240,232,0.16); border-radius: 10px;',
    '  box-shadow: 0 16px 48px rgba(0,0,0,0.55);',
    '  padding: 14px 8px 12px; display: none; z-index: 200;',
    '}',
    '.ss-lang-panel.open { display: block; }',
    '.ss-lang-heading {',
    '  font-family: "Syne", system-ui, sans-serif; font-size: 0.66rem;',
    '  font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;',
    '  color: #F5C518; padding: 0 12px 8px;',
    '}',
    '.ss-lang-list { list-style: none; padding: 0; margin: 0; }',
    '.ss-lang-list li { margin: 0; }',
    '.ss-lang-list a {',
    '  display: flex; align-items: baseline; justify-content: space-between;',
    '  padding: 7px 12px; color: #F5F0E8; text-decoration: none;',
    '  border-radius: 4px; border: 0 !important;',
    '  transition: background 0.14s ease, color 0.14s ease;',
    '}',
    '.ss-lang-list a:hover, .ss-lang-list a:focus {',
    '  background: rgba(245,197,24,0.12); color: #F5C518; outline: 0;',
    '}',
    '.ss-lang-native {',
    '  font-size: 0.95rem; font-weight: 600;',
    '}',
    '.ss-lang-english {',
    '  font-family: "Syne", system-ui, sans-serif; font-size: 0.7rem;',
    '  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;',
    '  color: #5C6B7C;',
    '}',
    '.ss-lang-list a:hover .ss-lang-english { color: #F5C518; opacity: 0.7; }',
    '.ss-lang-foot {',
    '  margin-top: 10px; padding: 10px 12px 0;',
    '  border-top: 1px solid rgba(245,240,232,0.10);',
    '  font-size: 0.78rem; color: #8899AA; line-height: 1.45;',
    '}',
    '.ss-lang-foot strong { color: #F5F0E8; font-weight: 600; }',
    '.ss-lang-foot p { margin: 0 0 6px; }',
    '.ss-lang-foot p:last-child { margin: 0; }',
    /* Mobile */
    '@media (max-width: 880px) {',
    '  .ss-lang-panel {',
    '    position: static; min-width: 0; max-width: none;',
    '    max-height: none; overflow-y: visible;',
    '    margin: 6px 0 4px; box-shadow: none; border-radius: 8px;',
    '  }',
    '}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'lang-picker-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Helpers
  function googleTranslateUrl(code) {
    return 'https://translate.google.com/translate?sl=en&tl=' + code + '&u=' + encodeURIComponent(window.location.href);
  }

  function buildPanelHTML() {
    var html = '<div class="ss-lang-heading">Read in another language</div>';
    html += '<ul class="ss-lang-list">';
    langs.forEach(function (l) {
      html += '<li><a href="' + googleTranslateUrl(l.code) + '" target="_blank" rel="noopener noreferrer">';
      html += '<span class="ss-lang-native">' + l.native + '</span>';
      html += '<span class="ss-lang-english">' + l.english + '</span>';
      html += '</a></li>';
    });
    html += '</ul>';
    html += '<div class="ss-lang-foot">';
    html += '<p><strong>Opens a new tab via Google Translate.</strong> Their privacy terms apply once you leave scansmart.uk.</p>';
    html += '<p>On <strong>Chrome</strong> or <strong>Edge</strong>: right-click any page → <em>Translate to…</em> for any other language with no third party.</p>';
    html += '</div>';
    return html;
  }

  // ---- Wire it up
  function init() {
    document.querySelectorAll('.nav-doors').forEach(function (nav) {
      if (nav.querySelector('.ss-lang-trigger')) return;

      // Wrap trigger + panel in a positioned container
      var wrap = document.createElement('div');
      wrap.className = 'ss-lang-wrap';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ss-lang-trigger';
      btn.setAttribute('aria-label', 'Read in another language');
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Languages';
      // Globe icon — simple meridian + equator pattern
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>';

      var panel = document.createElement('div');
      panel.className = 'ss-lang-panel';
      panel.setAttribute('role', 'menu');
      panel.innerHTML = buildPanelHTML();

      wrap.appendChild(btn);
      wrap.appendChild(panel);

      // Insert before the search trigger if present, else before Install
      var searchBtn  = nav.querySelector('.ss-search-trigger');
      var installBtn = nav.querySelector('.install-btn');
      if (searchBtn) nav.insertBefore(wrap, searchBtn);
      else if (installBtn) nav.insertBefore(wrap, installBtn);
      else nav.appendChild(wrap);

      var open = false;

      function show() {
        panel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        open = true;
      }
      function hide() {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        open = false;
      }
      function toggle() { open ? hide() : show(); }

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle();
      });

      // Click outside closes
      document.addEventListener('click', function (e) {
        if (open && !wrap.contains(e.target)) hide();
      });

      // Escape closes
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && open) hide();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// =============================================================
// SCANSMART CheckIT typography — italic "Check" portion
// Per Brand Bible v6.x ✏️ CheckIT canonical typeface (9 May 2026):
// the camelCase decomposition (Check + IT) is structurally honest;
// italicising the verb portion ("Check") in body display makes the
// verb-object split visible without changing the canonical wordmark.
//
// Walks visible text nodes only — never touches attributes, meta
// tags, structured data, scripts, page titles or aria labels.
// Built 16 May 2026.
// =============================================================
(function checkITTypography() {
  // ---- Inject style
  var styleEl = document.createElement('style');
  styleEl.id = 'brand-checkit-styles';
  styleEl.textContent = '.brand-checkit-verb { font-style: italic; }';
  document.head.appendChild(styleEl);

  function init() {
    if (!document.body) return;
    // TreeWalker over text nodes inside the body
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // Skip script/style/textarea/code content and anything inside
          // an existing brand-checkit-verb (idempotent against re-runs).
          var p = node.parentNode;
          while (p && p !== document.body) {
            if (p.nodeType === 1) {
              var tag = (p.tagName || '').toLowerCase();
              if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'code' || tag === 'pre') {
                return NodeFilter.FILTER_REJECT;
              }
              if (p.classList && p.classList.contains('brand-checkit-verb')) {
                return NodeFilter.FILTER_REJECT;
              }
            }
            p = p.parentNode;
          }
          return node.nodeValue.indexOf('CheckIT') === -1
            ? NodeFilter.FILTER_SKIP
            : NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      var parts = node.nodeValue.split('CheckIT');
      if (parts.length < 2) return;
      var frag = document.createDocumentFragment();
      parts.forEach(function (part, i) {
        if (i > 0) {
          var em = document.createElement('em');
          em.className = 'brand-checkit-verb';
          em.textContent = 'Check';
          frag.appendChild(em);
          frag.appendChild(document.createTextNode('IT'));
        }
        if (part) frag.appendChild(document.createTextNode(part));
      });
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// =============================================================
// SCANSMART Banner marque — site-wide
// Adds the canonical Marque v2 (SCANSMART barcode wordmark) next
// to the existing Hero v16 image inside the .brand-banner home link
// in the top nav. Available on every page that includes install.js.
// Built 10 May 2026.
// =============================================================
(function bannerMarqueInjection() {
  // ---- Inject styles
  var css = [
    'a.brand-banner {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 12px;',
    '  text-decoration: none;',
    '}',
    '.brand-banner-marque {',
    '  height: 48px;',
    '  width: auto;',
    '  display: block;',
    '  flex-shrink: 0;',
    '}',
    /* Hide the marque on narrow screens — the hamburger nav already crowds the bar there */
    '@media (max-width: 880px) {',
    '  .brand-banner-marque { display: none; }',
    '}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'banner-marque-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Inject the marque image
  function init() {
    var banners = document.querySelectorAll('a.brand-banner');
    if (!banners.length) return;

    banners.forEach(function (banner) {
      // Don't double-inject if marque already present
      if (banner.querySelector('.brand-banner-marque')) return;

      var marque = document.createElement('img');
      marque.className = 'brand-banner-marque';
      marque.src = 'assets/marque-v2.svg';
      marque.alt = ''; /* Decorative — the hero v16 img already provides the alt text for the link */
      marque.setAttribute('aria-hidden', 'true');
      marque.width = 144;
      marque.height = 48;

      banner.appendChild(marque);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
