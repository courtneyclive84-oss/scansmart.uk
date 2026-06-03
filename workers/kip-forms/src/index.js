// ─────────────────────────────────────────────────────────────────────────────
// kip-forms Worker — SCANSMART website form-submission endpoint
// ─────────────────────────────────────────────────────────────────────────────
//
// Built 28 May 2026.
//
// Purpose: receive form submissions from scansmart.uk (8 forms across partner,
// subscribe, contact, story, shops, i500, checkout, press pages), validate +
// Turnstile-verify the payload, write to D1, email Admin@scansmart.uk via
// Resend, return a clean JSON success/error to the browser.
//
// Architecture rationale: per Notion canon-scan 28 May 2026, zero banked
// Formspree decision; existing infra is Cloudflare-native (Workers + D1).
// Building this in-house keeps institutional inquiries (NHS, ICB, academic,
// retail buyers, press) under SCANSMART control end-to-end. No third-party
// processor. Audit trail in D1 queryable. Email via Resend (CLAUDE.md notes
// Resend as the email-delivery provider).
//
// Separation from kip-data: kip-data writes the v4.10 Choice-Stage scan
// corpus (PWA tester data, GDPR-K framing, consent-version pinning). This
// Worker writes B2B/marketing form inquiries — different threat model,
// different retention, different access pattern. Keep them separate.
//
// Secrets required (set via `wrangler secret put` from Ras's machine):
//   TURNSTILE_SECRET  — Cloudflare Turnstile site secret
//   RESEND_API_KEY    — Resend API key for delivery to Admin@scansmart.uk
//
// Bindings required (in wrangler.toml):
//   DB                — D1 database (kip-inquiries OR kip-tester-data)
//
// Route binding (set in Cloudflare Dashboard after deploy):
//   api.scansmart.uk/forms/*
//
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = "https://scansmart.uk";
const MAX_BODY_BYTES = 32 * 1024;          // 32KB — text-form submissions only
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_FROM = "SCANSMART forms <noreply@scansmart.uk>";
const RESEND_TO = "Admin@scansmart.uk";

// Enum of permitted form ids — must match the formId value the website sends
// from each form. Adding a new form on the site requires adding it here.
const ALLOWED_FORM_IDS = new Set([
  "partner",    // partner.html Partner Programme inquiry
  "subscribe",  // subscribe.html Subscription tier inquiry
  "contact",    // contact.html general contact
  "story",      // stories.html user-story submission
  "shops",      // shops.html I500 shop/distributor enquiry
  "i500",       // i500.html access request
  "checkout",   // checkout.html publication/cadence enquiry
  "press"       // press.html press / interview / asset request
]);

// Per-field character caps — defensive bound on what we write to D1.
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_ORG = 200;
const MAX_MESSAGE = 8000;
const MAX_SUBJECT = 200;
const MAX_DEADLINE = 100;
const MAX_UA = 300;

// Basic email-shape regex. Not RFC 5322 complete — a deliberately conservative
// "looks like an email" check. Final delivery validates at the SMTP layer.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────────────────────────────────────
// CORS helpers
// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  // Reflect the allowed origin only — never echo arbitrary origin.
  const allow = (origin === ALLOWED_ORIGIN) ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Field sanitisation helper — coerce + truncate, never trust client input.
// ─────────────────────────────────────────────────────────────────────────────

function str(v, maxLen) {
  if (v == null) return "";
  return String(v).slice(0, maxLen).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Turnstile server-side verification
// Returns true if the token is valid, false otherwise. Never throws — failures
// are treated as verification failures.
// ─────────────────────────────────────────────────────────────────────────────

async function verifyTurnstile(token, secret, remoteIp) {
  if (!token || !secret) return false;
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);
    const r = await fetch(TURNSTILE_VERIFY, { method: "POST", body });
    if (!r.ok) return false;
    const j = await r.json();
    return j && j.success === true;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resend delivery — POST to api.resend.com/emails. Returns true on success.
// Never throws — delivery failures don't bounce back to the user; the D1 row
// is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(env, payload) {
  try {
    const subject = `[SCANSMART forms] ${payload.form_id} — ${payload.name || "(no name)"}`;
    const lines = [
      `Form: ${payload.form_id}`,
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      payload.organisation ? `Organisation: ${payload.organisation}` : null,
      payload.subject ? `Subject: ${payload.subject}` : null,
      payload.deadline ? `Deadline: ${payload.deadline}` : null,
      "",
      "Message:",
      payload.message || "(no message)",
      "",
      `Submitted at: ${payload.submitted_at}`,
      `Inquiry ID: ${payload.inquiry_id}`,
      `User-Agent: ${payload.user_agent}`
    ].filter(Boolean).join("\n");
    const r = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [RESEND_TO],
        reply_to: payload.email,
        subject,
        text: lines
      })
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main fetch handler
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health probe (GET / returns service info — no PII, no rate limit)
    if (request.method === "GET" && url.pathname === "/") {
      return json({ service: "kip-forms", ok: true }, origin);
    }

    // Only POST /forms/submit is real
    if (!(request.method === "POST" && url.pathname === "/forms/submit")) {
      return json({ error: "Not found" }, origin, 404);
    }

    // Origin pin — reject anything other than scansmart.uk
    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed" }, origin, 403);
    }

    // Body size cap — read Content-Length, reject if too big
    const contentLen = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLen > MAX_BODY_BYTES) {
      return json({ error: "Body too large" }, origin, 413);
    }

    // Parse JSON; reject malformed payloads
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid JSON" }, origin, 400);
    }

    // Validate form_id
    const formId = str(body.formId, 40);
    if (!ALLOWED_FORM_IDS.has(formId)) {
      return json({ error: "Unknown form" }, origin, 400);
    }

    // Validate required fields
    const name = str(body.name, MAX_NAME);
    const email = str(body.email, MAX_EMAIL);
    const message = str(body.message, MAX_MESSAGE);
    if (!name) return json({ error: "Missing name" }, origin, 400);
    if (!email || !EMAIL_RE.test(email)) return json({ error: "Invalid email" }, origin, 400);
    if (!message) return json({ error: "Missing message" }, origin, 400);

    // Optional fields
    const organisation = str(body.organisation, MAX_ORG);
    const subject = str(body.subject, MAX_SUBJECT);
    const deadline = str(body.deadline, MAX_DEADLINE);

    // Turnstile verification — required
    const remoteIp = request.headers.get("cf-connecting-ip") || "";
    const turnstileOk = await verifyTurnstile(
      str(body.turnstile_token, 4096),
      env.TURNSTILE_SECRET,
      remoteIp
    );
    if (!turnstileOk) return json({ error: "Challenge failed" }, origin, 403);

    // Compose record
    const inquiry_id = crypto.randomUUID();
    const submitted_at = new Date().toISOString();
    const user_agent = str(request.headers.get("user-agent") || "", MAX_UA);

    // Write to D1 — parameterised, no SQL injection risk
    try {
      await env.DB.prepare(
        `INSERT INTO inquiries
         (id, form_id, name, email, organisation, message, subject, deadline,
          submitted_at, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        inquiry_id, formId, name, email, organisation || null,
        message, subject || null, deadline || null,
        submitted_at, user_agent
      ).run();
    } catch (e) {
      // D1 write failed — log nothing externally; return generic error.
      return json({ error: "Submission failed" }, origin, 500);
    }

    // Fire-and-forget email — if Resend errors, the D1 row is the source of
    // truth; founder can find it via wrangler d1 execute. Don't fail the
    // user's submission on email delivery.
    ctx.waitUntil(sendEmail(env, {
      inquiry_id,
      form_id: formId,
      name,
      email,
      organisation,
      message,
      subject,
      deadline,
      submitted_at,
      user_agent
    }));

    return json({ ok: true, inquiry_id, submitted_at }, origin);
  }
};
