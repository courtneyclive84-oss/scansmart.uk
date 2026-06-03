// SCANSMART runtime check — Playwright headless test of the three scroll behaviours
// Run with:  node _internal/runtime-check.js
//
// Tests:
//   1. Search modal — body scroll lock, results scroll
//   2. Language dropdown — page scroll preserved, panel scrolls when capped
//   3. Library mega-menu — scrolls when capped
//
// Built 16 May 2026

const { chromium } = require('playwright');
const path = require('path');

const PAGE = 'file://' + path.resolve(__dirname, '..', 'library.html');

function pass(msg) { console.log('  \x1b[32m✓\x1b[0m ' + msg); }
function fail(msg) { console.log('  \x1b[31m✗\x1b[0m ' + msg); failures++; }
function info(msg) { console.log('  · ' + msg); }
function section(msg) { console.log('\n── ' + msg + ' ' + '─'.repeat(Math.max(0, 64 - msg.length))); }

let failures = 0;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await ctx.newPage();

  page.on('pageerror', err => fail('JS error in page: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') fail('Console error: ' + msg.text());
  });

  console.log('Loading: ' + PAGE);
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(400); // let install.js IIFEs run

  // ─────────────────────────────────────────────────────────────
  section('1. Trigger buttons injected into nav');
  const navTriggers = await page.evaluate(() => ({
    search: !!document.querySelector('.ss-search-trigger'),
    lang:   !!document.querySelector('.ss-lang-trigger'),
    libNav: !!document.querySelector('.lib-nav-wrap'),
    marque: !!document.querySelector('.brand-banner-marque')
  }));
  navTriggers.search ? pass('Search magnifying-glass injected')   : fail('Search trigger MISSING');
  navTriggers.lang   ? pass('Language globe injected')            : fail('Language trigger MISSING');
  navTriggers.libNav ? pass('Library mega-menu wrap injected')    : fail('Library mega-menu MISSING');
  navTriggers.marque ? pass('Banner marque injected')             : fail('Banner marque MISSING');

  // ─────────────────────────────────────────────────────────────
  section('2. Search modal — body scroll lock + results scroll');
  await page.click('.ss-search-trigger');
  await page.waitForTimeout(150);

  const modalOpen = await page.evaluate(() => ({
    visible: document.querySelector('.ss-search-modal').classList.contains('open'),
    bodyLocked: document.body.classList.contains('ss-modal-open'),
    bodyOverflow: getComputedStyle(document.body).overflow,
    panelMaxH: getComputedStyle(document.querySelector('.ss-search-panel')).maxHeight,
    resultsOverflow: getComputedStyle(document.querySelector('.ss-search-results')).overflowY,
    resultsMinH: getComputedStyle(document.querySelector('.ss-search-results')).minHeight
  }));
  modalOpen.visible      ? pass('Modal opens on click')                            : fail('Modal not visible');
  modalOpen.bodyLocked   ? pass('body has class ss-modal-open')                    : fail('body class not applied — page WILL scroll behind modal');
  modalOpen.bodyOverflow === 'hidden' ? pass('body overflow:hidden computed (page scroll locked)')
                                       : fail('body overflow is "' + modalOpen.bodyOverflow + '" not "hidden"');
  modalOpen.panelMaxH !== 'none' ? pass('Panel max-height set: ' + modalOpen.panelMaxH)
                                 : fail('Panel has no max-height — it can grow past viewport');
  modalOpen.resultsOverflow === 'auto' ? pass('Results overflow-y:auto')           : fail('Results overflow is "' + modalOpen.resultsOverflow + '" not "auto"');
  modalOpen.resultsMinH === '0px'      ? pass('Results min-height:0 (flex scroll works)')
                                       : fail('Results min-height is "' + modalOpen.resultsMinH + '" — flex will prevent scroll');

  // Type something to populate results, then verify they scroll
  await page.fill('.ss-search-input', 'salt');
  await page.waitForTimeout(400);
  const resultsState = await page.evaluate(() => {
    const r = document.querySelector('.ss-search-results');
    return {
      scrollHeight: r.scrollHeight,
      clientHeight: r.clientHeight,
      isScrollable: r.scrollHeight > r.clientHeight,
      resultCount: r.querySelectorAll('.ss-search-result').length
    };
  });
  info('Results returned: ' + resultsState.resultCount + ', scrollHeight ' + resultsState.scrollHeight + 'px, clientHeight ' + resultsState.clientHeight + 'px');
  if (resultsState.resultCount > 0) {
    pass('Search returns results for "salt" (' + resultsState.resultCount + ' items)');
    if (resultsState.isScrollable) pass('Results pane IS scrollable (content > viewport)');
    else info('Results fit without scrolling (not enough results to overflow at this viewport)');
  } else {
    fail('Zero results returned for "salt" — search index or query broken');
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const closedState = await page.evaluate(() => ({
    closed: !document.querySelector('.ss-search-modal').classList.contains('open'),
    bodyUnlocked: !document.body.classList.contains('ss-modal-open')
  }));
  closedState.closed       ? pass('Esc closes modal')                              : fail('Esc did not close modal');
  closedState.bodyUnlocked ? pass('body class removed on close (page scroll restored)') : fail('body class still present after close — scroll stuck locked');

  // ─────────────────────────────────────────────────────────────
  section('3. Language dropdown — opens, panel scrollable, page NOT locked');
  await page.click('.ss-lang-trigger');
  await page.waitForTimeout(150);

  const langOpen = await page.evaluate(() => {
    const panel = document.querySelector('.ss-lang-panel');
    return {
      open:           panel.classList.contains('open'),
      maxH:           getComputedStyle(panel).maxHeight,
      overflow:       getComputedStyle(panel).overflowY,
      bodyOverflow:   getComputedStyle(document.body).overflow,
      langCount:      panel.querySelectorAll('.ss-lang-list a').length,
      panelHeight:    panel.clientHeight,
      panelScrollH:   panel.scrollHeight
    };
  });
  langOpen.open                       ? pass('Language panel opens')               : fail('Panel did not open');
  langOpen.langCount === 10           ? pass('All 10 priority languages listed')   : fail('Expected 10 langs, found ' + langOpen.langCount);
  langOpen.maxH !== 'none'            ? pass('Panel max-height set: ' + langOpen.maxH) : fail('Panel has no max-height');
  langOpen.overflow === 'auto'        ? pass('Panel overflow-y:auto')              : fail('Overflow-y is "' + langOpen.overflow + '" not "auto"');
  langOpen.bodyOverflow !== 'hidden'  ? pass('body NOT locked (page scroll preserved underneath dropdown)')
                                      : fail('body overflow:hidden — page IS locked behind dropdown (BUG)');
  info('Panel: clientHeight ' + langOpen.panelHeight + 'px, scrollHeight ' + langOpen.panelScrollH + 'px (would scroll if scroll > client)');

  // Verify the first language link is a Google Translate URL
  const firstLink = await page.$eval('.ss-lang-list a', a => a.href);
  firstLink.includes('translate.google.com')
    ? pass('First language link goes to Google Translate')
    : fail('First link is not Google Translate: ' + firstLink);

  await page.keyboard.press('Escape');

  // ─────────────────────────────────────────────────────────────
  section('4. Library mega-menu — opens, scrolls when capped, page NOT locked');
  await page.hover('.lib-nav-wrap');
  await page.waitForTimeout(300);

  const libOpen = await page.evaluate(() => {
    const panel = document.querySelector('.lib-nav-panel');
    return {
      open:         panel.classList.contains('open'),
      maxH:         getComputedStyle(panel).maxHeight,
      overflow:     getComputedStyle(panel).overflowY,
      bodyOverflow: getComputedStyle(document.body).overflow,
      groupCount:   panel.querySelectorAll('.lib-nav-group').length,
      itemCount:    panel.querySelectorAll('.lib-nav-group a').length
    };
  });
  libOpen.open                        ? pass('Mega-menu opens on hover')            : fail('Mega-menu did not open');
  libOpen.groupCount > 0              ? pass(libOpen.groupCount + ' groups, ' + libOpen.itemCount + ' decoder links') : fail('No groups in mega-menu');
  libOpen.maxH !== 'none'             ? pass('Panel max-height set: ' + libOpen.maxH) : fail('Mega-menu has no max-height');
  libOpen.overflow === 'auto'         ? pass('Mega-menu overflow-y:auto')           : fail('Mega-menu overflow-y is "' + libOpen.overflow + '"');
  libOpen.bodyOverflow !== 'hidden'   ? pass('body NOT locked under mega-menu')     : fail('body locked behind mega-menu (BUG)');

  // ─────────────────────────────────────────────────────────────
  section('5. Library page sticky-bar dropdown still works');
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForTimeout(100);
  const stickyBar = await page.$('.lib-jump select');
  if (stickyBar) {
    pass('Library Jump-to dropdown present');
  } else {
    fail('Library Jump-to dropdown missing on library.html');
  }

  // ─────────────────────────────────────────────────────────────
  console.log('\n═════════════════════════════════════════════════════════════════');
  if (failures === 0) {
    console.log('  \x1b[32mAll runtime checks passed.\x1b[0m');
  } else {
    console.log('  \x1b[31m' + failures + ' check(s) failed.\x1b[0m');
  }
  console.log('═════════════════════════════════════════════════════════════════');

  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
