# Website-side diff plan (Phase C)

**Applied:** AFTER you finish the Cloudflare-side steps in DEPLOY_RUNBOOK.md
**Why staged:** the form Turnstile widget renders as broken if the site-key
isn't valid yet. Leaving the live site on the current (silently failing) URL
is no worse than swapping to the new (Turnstile-broken) URL pre-deploy.

When you finish Phase B and paste me the Turnstile site-key, I apply this
diff in a single pass, bump `CACHE_VERSION` to `v5.0.123-kip-forms-live`,
verify with curl from sandbox against `api.scansmart.uk/forms/submit`, and
hand you a drag-drop-ready folder.

---

## File touch list

8 form-bearing pages + sw.js + a Turnstile loader injection. The 8 pages are:

```
partner.html      Partner Programme inquiry
subscribe.html    Subscription tier inquiry
contact.html      general contact
stories.html      story submission
shops.html        I500 shop/distributor enquiry
i500.html         I500 access request
checkout.html     publication/cadence enquiry
press.html        press / interview / asset request
```

## Per-page change shape

### A. Add Turnstile script in `<head>` (once per file)

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>
```

### B. Add Turnstile widget inside each `<form>` (once per file)

```html
<div class="cf-turnstile" data-sitekey="REPLACE_WITH_TURNSTILE_SITEKEY"></div>
```

Placed immediately before the submit button. Cloudflare renders the
challenge inline; in most cases the user sees nothing (managed mode).

### C. Update the form-submit JS handler

Old (broken):
```js
const res = await fetch('https://kip-forms.courtneyclive84.workers.dev/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* form fields */ })
});
```

New:
```js
const turnstileToken = form.querySelector('[name="cf-turnstile-response"]').value;
const res = await fetch('https://api.scansmart.uk/forms/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formId: 'partner',        // changes per page: partner|subscribe|contact|story|shops|i500|checkout|press
    name: form.name.value,
    email: form.email.value,
    organisation: form.organisation?.value || '',
    message: form.message.value,
    subject: form.subject?.value || '',
    deadline: form.deadline?.value || '',
    turnstile_token: turnstileToken
  })
});
const data = await res.json();
if (data.ok) {
  // show success state
} else {
  // show data.error message — Worker returns clear errors:
  // 'Origin not allowed' | 'Body too large' | 'Invalid JSON' |
  // 'Unknown form' | 'Missing name' | 'Invalid email' |
  // 'Missing message' | 'Challenge failed' | 'Submission failed'
}
```

### D. The stats fetch on `index.html` + `checkit.html`

The existing `kip-data` calls hit `kip-data.courtneyclive84.workers.dev/stats`.
If you also custom-domain kip-data (per Step 8 of DEPLOY_RUNBOOK.md), these
two `fetch()` calls also update:

Old:
```js
const r = await fetch('https://kip-data.courtneyclive84.workers.dev/stats', { ... });
```

New (if you go with `data.scansmart.uk`):
```js
const r = await fetch('https://data.scansmart.uk/stats', { ... });
```

OR (if you go with `api.scansmart.uk/data/*`):
```js
const r = await fetch('https://api.scansmart.uk/data/stats', { ... });
```

I'll match whichever path you pick.

### E. sw.js CACHE_VERSION

Bump to `scansmart-v5.0.123-kip-forms-live` with the standard changelog block
naming every file touched + the verification I ran.

---

## What I'll verify before declaring shipped

1. `node --check` on each modified HTML's `<script>` block (parse clean)
2. Curl from sandbox against the LIVE `api.scansmart.uk/forms/submit` with a
   valid Turnstile token mock (proves the route + CORS + origin pin work)
3. Curl from sandbox with `Origin: https://example.com` (proves 403 origin rejection)
4. Curl from sandbox with malformed JSON (proves 400 reject)
5. Curl from sandbox with missing fields (proves 400 reject per field)
6. Manual end-to-end test on the deployed site: submit each of the 8 forms,
   watch DevTools Network for 200, confirm D1 row via `wrangler d1 execute`,
   confirm email lands at Admin@scansmart.uk
7. Confirm the legacy `kip-forms.courtneyclive84.workers.dev/submit` URL
   appears nowhere in the deployed site

## What you'll have to verify after deploy

- Click through each form on a real page, fill it, submit, see the success
  state. This is the only thing the sandbox can't simulate end-to-end
  because the Turnstile widget needs a real browser to render the challenge.
