// Vercel Edge function -- clinical AI coach for ReboundIQ maintenance.
// Server-side proxy to Anthropic API. The ANTHROPIC_API_KEY never leaves the server.
// Hardening pattern mirrors Octo-perio's api/vision.js (origin gate -> rate limit
// -> API-key gate -> content-type/size -> JSON parse -> input validation ->
// server-side red-flag refusal -> upstream call -> response sanitization).

export const config = { runtime: 'edge' };

// ----- env / config -----
const RATE_LIMIT      = Number(globalThis.process?.env?.RATE_LIMIT      || 10);
const RATE_WINDOW_MS  = Number(globalThis.process?.env?.RATE_WINDOW_MS  || 60_000);
const MAX_BODY_BYTES  = 50_000;
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY     = 12;
const MODEL           = 'claude-sonnet-4-6';
const MAX_TOKENS      = 600;

// ----- system prompt (locked) -----
const SYSTEM_PROMPT = `You are ReboundIQ Coach -- a clinical maintenance coach for patients on or transitioning off GLP-1 therapy (Novo Nordisk portfolio: Wegovy SC, Wegovy pill, Ozempic, Rybelsus, Saxenda, and CagriSema-filed).

Your job:
- Personalized, warm, concise. 2-4 short paragraphs per turn unless asked to elaborate.
- Anchor recommendations to the patient's actual risk drivers and maintenance plan (provided in <patient_context>).
- Reinforce the lifestyle floors (protein floor in g/kg, resistance training cadence, sleep target) when relevant.
- Acknowledge feelings before advising.

You MUST:
- Decline any dosing-change request. Refer the patient to their clinician for any taper, dose, switch, or medication question.
- Stay in scope: maintenance, lifestyle, motivation, adherence, side-effect tolerance, plan rationale.
- If the patient mentions binge/purge eating behaviors, severe restrictive eating, or thoughts of self-harm, do not engage with the topic further. Say briefly that you are not equipped for this and they need to speak with a real clinician now. (The server runs separate hotline guidance for these patterns, but you must still refuse to coach into them.)
- Identify yourself as a Claude-powered AI coach if asked. You are not a human and not a substitute for a clinician.

You MUST NOT:
- Recommend dose changes, switching agents, or stopping therapy.
- Diagnose new conditions or interpret labs.
- Make up numbers, citations, or trial names. If you do not know, say so.
- Use headings or bullet lists unless explicitly requested. Plain prose only.`;

// ----- red-flag detection (server-side, before forwarding upstream) -----
const RED_FLAG_PATTERNS = [
  /\b(?:suicid|kill myself|killing myself|end (?:my|this) life|harm myself|self[\s-]?harm|cut myself|want to die|don'?t want to (?:live|be alive)|not worth living)\b/i,
  /\b(?:binge[\s-]?(?:eat|ing)|purge|vomit(?:ing)? after eating|throw up after (?:eating|meals)|laxative abuse|starve myself|won'?t eat|stop eating completely)\b/i
];

const HOTLINE_RESPONSE = `I'm a maintenance coach -- I'm not equipped to help with what you're describing, and I want to make sure you get to someone who is.

If you're in immediate danger, please reach one of these now:
- United States: 988 (Suicide & Crisis Lifeline), or text HOME to 741741
- United Kingdom & Ireland: 116 123 (Samaritans)
- ANAD eating-disorder helpline: 1-888-375-7767

A real clinician needs to be in the loop on this. Please contact your provider or an emergency line right now. I'll be here when you're ready to talk about the maintenance plan again.`;

function detectRedFlag(text) {
  return RED_FLAG_PATTERNS.some(re => re.test(text));
}

// ----- rate limiter (per-IP, lives in warm-instance memory) -----
const buckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, windowStart: now };
  if (now - b.windowStart > RATE_WINDOW_MS) { b.count = 0; b.windowStart = now; }
  b.count++;
  buckets.set(ip, b);
  return b.count <= RATE_LIMIT;
}

// ----- origin gate -----
// Production: only Vercel-injected URLs + ALLOWED_ORIGINS env are accepted.
// Dev convenience (localhost + file://-style `null`) is gated behind
// ALLOW_DEV_ORIGINS=1 — set that env on Preview, never on Production.
function isAllowedOrigin(originHeader) {
  if (!originHeader) return false;
  const env = globalThis.process?.env || {};
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (env.VERCEL_URL)                     allowed.push('https://' + env.VERCEL_URL);
  if (env.VERCEL_BRANCH_URL)              allowed.push('https://' + env.VERCEL_BRANCH_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL)  allowed.push('https://' + env.VERCEL_PROJECT_PRODUCTION_URL);
  if (allowed.includes(originHeader)) return true;
  if (env.ALLOW_DEV_ORIGINS === '1') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHeader)) return true;
    if (originHeader === 'null') return true; // file:// origins (Chrome sends `null`)
  }
  return false;
}

// ----- input validation -----
function validateInput(body) {
  if (!body || typeof body !== 'object') return 'BAD_REQUEST';
  if (!Array.isArray(body.messages))     return 'BAD_REQUEST';
  if (body.messages.length === 0 || body.messages.length > MAX_HISTORY) return 'BAD_REQUEST';
  for (const m of body.messages) {
    if (!m || typeof m !== 'object')                          return 'BAD_REQUEST';
    if (m.role !== 'user' && m.role !== 'assistant')          return 'BAD_REQUEST';
    if (typeof m.content !== 'string')                        return 'BAD_REQUEST';
    if (m.content.length === 0 || m.content.length > MAX_MESSAGE_CHARS) return 'BAD_REQUEST';
  }
  if (body.patientContext != null && typeof body.patientContext !== 'object') return 'BAD_REQUEST';
  return null;
}

// Strips bidi / control / zero-width chars that could be used to smuggle role
// markers or sneak prompt injection past the system-prompt boundary.
// Built via String.fromCharCode so the escape sequences survive tooling that
// might collapse unicode literals into raw code points.
//
// Coverage:
//   C0 controls (0x00–0x1F) + DEL (0x7F)
//   Mongolian vowel separator (0x180E — historically zero-width)
//   Zero-width chars + bidi marks (0x200B–0x200F)
//   Bidi embedding/override (0x202A–0x202E)
//   Word joiner + invisible operators (0x2060–0x2064)
//   Isolate controls (0x2066–0x2069)
//   Byte order mark / zero-width no-break space (0xFEFF)
const STRIP_INVISIBLES = new RegExp(
  '[' +
  String.fromCharCode(0x00) + '-' + String.fromCharCode(0x1F) +
  String.fromCharCode(0x7F) +
  String.fromCharCode(0x180E) +
  String.fromCharCode(0x200B) + '-' + String.fromCharCode(0x200F) +
  String.fromCharCode(0x202A) + '-' + String.fromCharCode(0x202E) +
  String.fromCharCode(0x2060) + '-' + String.fromCharCode(0x2064) +
  String.fromCharCode(0x2066) + '-' + String.fromCharCode(0x2069) +
  String.fromCharCode(0xFEFF) +
  ']',
  'g'
);
const STRIP_CONTROLS = new RegExp(
  '[' +
  String.fromCharCode(0x00) + '-' + String.fromCharCode(0x1F) +
  String.fromCharCode(0x7F) +
  ']',
  'g'
);

// ----- patient-context sanitization (whitelisted fields only) -----
const CTX_STRING_FIELDS = ['bucket', 'strategy', 'agent'];
const CTX_NUMBER_FIELDS = ['pHoldPct', 'rebPct', 'proteinFloor', 'rtTarget'];
const CTX_BOOL_FIELDS   = ['planningToStop', 'sarcopenicFlag'];
const CTX_ARRAY_FIELDS  = ['topDrivers'];

function sanitizeContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  const out = {};
  for (const k of CTX_STRING_FIELDS) {
    if (typeof ctx[k] === 'string') {
      out[k] = ctx[k].replace(STRIP_INVISIBLES, '').slice(0, 200);
    }
  }
  for (const k of CTX_NUMBER_FIELDS) {
    if (typeof ctx[k] === 'number' && Number.isFinite(ctx[k])) out[k] = ctx[k];
  }
  for (const k of CTX_BOOL_FIELDS) {
    if (typeof ctx[k] === 'boolean') out[k] = ctx[k];
  }
  for (const k of CTX_ARRAY_FIELDS) {
    if (Array.isArray(ctx[k])) {
      // STRIP_INVISIBLES (not STRIP_CONTROLS) so zero-width chars can't smuggle
      // role markers into the patient_context block.
      out[k] = ctx[k].slice(0, 5).map(x => String(x).replace(STRIP_INVISIBLES, '').slice(0, 160));
    }
  }
  return Object.keys(out).length ? out : null;
}

// ----- response sanitization -----
function sanitizeReply(s) {
  if (typeof s !== 'string') return '';
  let out = s
    .replace(STRIP_INVISIBLES, '')
    .replace(/(?:^|\n)\s*(?:system|user|assistant)\s*:/gi, '');
  return out.slice(0, 2400).trim();
}

function err(code, status) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return err('METHOD_NOT_ALLOWED', 405);

  const origin = req.headers.get('origin') || '';
  if (!isAllowedOrigin(origin)) return err('FORBIDDEN_ORIGIN', 403);

  // IP attribution. If we can't attribute, reject — don't let unattributed
  // requests share a single bucket (would poison every honest caller).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('cf-connecting-ip')
          || '';
  if (!ip) return err('BAD_REQUEST', 400);
  if (!rateLimit(ip)) return err('RATE_LIMITED', 429);

  const env = globalThis.process?.env || {};
  if (!env.ANTHROPIC_API_KEY) return err('NOT_CONFIGURED', 503);

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return err('UNSUPPORTED_MEDIA_TYPE', 415);

  // Early reject before buffering the body.
  const declaredLen = Number(req.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) return err('TOO_LARGE', 413);

  let raw;
  try { raw = await req.text(); } catch { return err('BAD_REQUEST', 400); }
  if (raw.length > MAX_BODY_BYTES) return err('TOO_LARGE', 413);

  let body;
  try { body = JSON.parse(raw); } catch { return err('BAD_REQUEST', 400); }

  const v = validateInput(body);
  if (v) return err(v, 400);

  // Sanitize EVERY user message before the red-flag check + before
  // forwarding upstream. Zero-width chars (e.g. `sui​cide`) would
  // otherwise bypass detection because the regex \b anchors fail across
  // an invisible glyph.
  for (const m of body.messages) {
    if (typeof m.content === 'string') {
      m.content = m.content.replace(STRIP_INVISIBLES, '');
    }
  }

  // Red-flag refusal happens BEFORE forwarding to Anthropic.
  const lastMsg = body.messages[body.messages.length - 1];
  if (lastMsg.role === 'user' && detectRedFlag(lastMsg.content)) {
    return new Response(JSON.stringify({ reply: HOTLINE_RESPONSE, redFlag: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  }

  const ctx = sanitizeContext(body.patientContext);
  const contextBlock = ctx
    ? `\n\n<patient_context>\n${JSON.stringify(ctx, null, 2)}\n</patient_context>\n\nUse this context to make your reply personal. Refer to specific drivers when relevant.`
    : '';

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT + contextBlock,
        messages: body.messages.map(m => ({ role: m.role, content: m.content }))
      })
    });
  } catch {
    return err('UPSTREAM_UNREACHABLE', 502);
  }

  if (!upstream.ok) return err('UPSTREAM_ERROR', 502);

  let data;
  try { data = await upstream.json(); } catch { return err('UNPARSEABLE', 502); }

  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') return err('UNPARSEABLE', 502);

  const reply = sanitizeReply(text);
  if (!reply) return err('UNPARSEABLE', 502);

  return new Response(JSON.stringify({ reply }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
