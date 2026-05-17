# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project — ReboundIQ (Novo Nordisk Concept)

**ReboundIQ** — concept artifact pitching how Novo Nordisk could use AI + DTx to tackle the weight-rebound effect after GLP-1 cessation. Dual-mode (Clinician + Patient) single-file HTML React app. Targets the white-space Novo doesn't own yet: prediction + portfolio-aware maintenance choreography.

**The honest-scope contract:** the risk score is an **evidence-anchored deterministic formula**, not real ML. The UI must label it that way. Every weight, threshold and trajectory carries a PMID/DOI in code and a matching entry in `REFERENCES`. Do not introduce fake ML, fake confidence intervals, or numbers that aren't derived from a cited source.

## Run

Open `index.html` directly in Chrome (`file://` works — CSP and vendor assets are designed for offline operation). Vercel deploy mirrors Octo-perio: `vercel.json` carries the headers + CSP. The Vercel Edge function for the AI coach (`api/coach.js`) lands in Phase 5.

## Architecture — Single-file Standalone Artifact

Same pattern as Octo-perio:

- `index.html` — one file, React 18 + Babel + Tailwind Play, all inline (`<script type="text/babel">` compiled in-browser → CSP needs `'unsafe-eval'`).
- `vendor/` — locally vendored React 18.3.1, ReactDOM 18.3.1, Babel Standalone 7.25.6, Tailwind Play 3.4.5, plus `vendor/fonts/` (Inter + Heebo + Caveat woff2 — Heebo unused for now but kept so a bilingual EN/HE pass is cheap later).
- `api/coach.js` — Vercel Edge function (shipped Phase 5). Proxies to Anthropic API; server holds `ANTHROPIC_API_KEY`. Same hardening pattern as Octo-perio's `api/vision.js`. See "AI Coach (Phase 5)" section below for the full gate order and the regex-charclass gotcha.

### Tabs (in order)

`Overview/Home (0) | Intake (1) | Risk Score (2) | Maintenance Rx (3) | AI Coach (4) | Trajectory (5) | References (6) | Cohort (7 — HCP only)`. Cohort is hidden in patient mode. Initial active tab is `home`. If you reorder, update the `TABS` array and any tab-specific `setActive(...)` calls. The `FEATURES` array (which backs the 6-card grid on the Overview tab and the `StubTab` fallback for unwired sections) is keyed by tab key; keep the two in sync.

### Mode switch (Clinician / Patient)

Same underlying state, different framing. Stored in `App` as `mode`. The TABS array carries a `modes: ['hcp','patient']` whitelist per tab; the tab bar filters from it. When the active tab is hidden by a mode switch (Cohort → patient mode), fall back to `home`.

### Visual system — Novo editorial (matches novonordisk.com)

The visual language is **white-background editorial Novo**. We tried liquid glass and dark gradients — user rejected both as "doesn't feel like Novo, feels gimmicky" (2026-05-15). Don't reintroduce them.

**Reference:** novonordisk.com. White page, deep navy editorial type, hairline rules, generous vertical rhythm, almost no accent color, no shadows, no gradients, no glass, no orbs, no animation beyond simple hover.

**Palette:**
- Background: pure `#FFFFFF` and warm off-white `#F7F7F2` for alternating bands.
- Type: navy `#001965` for headings and emphasis; ink `#0E1631` for body; soft `#4A526C` and dim `#6F778F` for secondary text.
- Hairlines: `#DCDCD4` (primary), `#ECEBE3` (lighter).
- Accent: `#0066B3` Novo blue, used sparingly — links, eyebrow labels, focus rings. Never as a fill.
- Status dots only (not fills): `#2E7D55` good, `#B57814` warn, `#B43A2A` bad.

**Typography:**
- Inter throughout (vendored). Display headlines: weight 400, tight tracking (`-0.022em`), 1.04 line-height, navy. The `.display em` selector renders italic-feeling soft-navy emphasis without actually italicizing — same trick novonordisk.com uses for "lyrical" supporting clauses.
- `.eyebrow` — 11px uppercase blue, letter-spacing 0.18em. Sits above every section heading.
- `.num` — tabular-nums for clinical numbers.
- `.stat-figure` — Inter 300 at 56–72px for editorial pull-quote statistics.
- `.signature` — Caveat only used in the footer as a tiny "Created by" credit.

**Layout system:**
- Max width `1240px`, padded to `1.25–2rem` on mobile.
- Sections separated by hairline rules (`.hair-top` / `.hair-bottom`) and large vertical padding (`py-14`/`py-16`/`py-24`).
- Bands alternate white ↔ `--nn-bg-2` (`#F7F7F2`) to break long pages without color saturation.
- 12-column grid for editorial split layouts (heading left col-span-4, body right col-span-7).

**Buttons:**
- `.btn-primary` — navy fill, white text, square corners (not rounded). Used for the single primary action per screen.
- `.btn-ghost` — outlined navy on white, inverts on hover.
- `.arrow-link` — Novo's signature inline link: 1px underline + trailing arrow. Used for everything secondary. Goes on links, not buttons, but renders as a button when interactive.

**Navigation:**
- **Utility strip** (navy band, 11.5px text) at the very top — credit line, version, audience toggle (Clinician / Patient as minimal underline tabs).
- **Header** (white, sticky, hairline bottom) — logo left, primary nav middle, contextual right. Active tab gets a 2px navy underline + bold weight. Tab numbers (`01`, `02`, …) render in dim grey before the label.
- No floating elements. No glass. No animation beyond underline transitions.

**Status pills:** `.risk-pill` is white with a hairline border, 6px dot + label. The dot carries the semantic color (`.dot-good` / `.dot-warn` / `.dot-bad`). Never tint the pill background.

**Author signature:** lives only in the footer credit line — small Caveat next to "Created by". No floating watermark anywhere on screen (the user found that distracting).

**Print:** `@media print` hides `.no-print`, white background. Clinical printouts stay clean.

## Security posture

- **CSP** (meta + `vercel.json`): `connect-src 'self'`, `frame-ancestors 'none'`, `form-action 'none'`, `font-src 'self'`, `script-src 'self' 'unsafe-eval' 'unsafe-inline'`, `img-src 'self' data: blob:`. **No third-party network at runtime.** Phase 5 will keep `connect-src 'self'` — the AI coach goes same-origin to `/api/coach`, the Edge function proxies to Anthropic with the server-side key.
- **No persistence.** No `localStorage`, `sessionStorage`, `cookie`, `XMLHttpRequest`, `sendBeacon`. State lives in React memory and dies on tab close. Same posture as Octo-perio — all demo data is ephemeral.
- **XSS.** Patient input rendered via JSX text interpolation. No `dangerouslySetInnerHTML`, no `innerHTML`. Don't introduce them.

## State model & form primitives (Phase 2)

The whole app shares one piece of state — `data`, held in `App` and initialised from `INITIAL_STATE`. Threaded down to `IntakeTab` (and, from Phase 3 onward, to all clinical tabs) via three helpers:

- `set(key, val)` — single-field update. Use everywhere.
- `loadDemo(demoData)` — spreads `{ ...INITIAL_STATE, ...demoData }`, so loading Profile C after Profile A correctly clears whatever C doesn't specify. **Do not** shallow-merge into the current state — you'll leak earlier values.
- `resetState()` — back to `INITIAL_STATE`.

**Field convention.** Numeric inputs use `''` for "not entered" (not `0`, not `null`). `NumberInput` already handles the coercion; the `num()` helper turns `''` → `null` for math. Booleans default to `false`.

**Derived helpers — never duplicate.** `fmtBMI`, `fmtPctLoss`, `fmtLeanPct`, `filledFieldCount` compute display strings from state. If you need the same number in a different tab, call the helper; don't recompute inline.

**Demo patients.** `DEMO_PATIENTS` carries three profiles (A low / B moderate / C high rebound risk). They are the canonical end-to-end test fixtures — Phase 3's risk score should return roughly low/mod/high when fed A/B/C respectively. When changing the risk formula, verify the three still bucket correctly before merging.

**Form primitives (in `index.html`, above `IntakeTab`).** Reuse these — don't roll new inputs:

- `<Field label helper>` — wraps every form input with the uppercase-eyebrow label and optional helper text.
- `<NumberInput value onChange suffix step>` — borderless hairline-bottom number input + suffix label.
- `<TextInput value onChange>` — same shape for free text (dose strings, etc.).
- `<ChipGroup options value onChange withSub>` — segmented chips. Options carry `{v,l,sub?}`; pass `withSub` to render the sublabel on agents.
- `<Toggle label checked onChange>` — boolean toggle with checkmark. Used for comorbidities and preferences. Role=switch.
- `<ReadonlyValue value>` — for auto-computed fields (BMI, % loss, lean %). Greys out when value is null/undefined/''.
- `<FormSection number title subtitle>` — 12-col split: numbered left column + content right. Use for every new section.

**Option lists.** `AGENT_OPTIONS` (6 entries — Wegovy SC / pill / Ozempic / Rybelsus / Saxenda / CagriSema), `SEX_OPTIONS`, `BODY_COMP_OPTIONS`. Keep CagriSema marked "Filed" until FDA approval lands.

## Clinical engines (Phase 3)

Two pure functions in `index.html` produce every clinical number the app displays. Both live above the `RiskTab` / `TrajectoryTab` components and accept the shared `state` object — no class instances, no hidden internal state.

### `computeRRS(state)` — Rebound Risk Score

Returns `{ pHold12m, rebound12m, contributions, sorted, topDrivers, sarcopenicFlag }`.

`pHold12m` is the probability of *holding* ≥5% weight loss at 12 months post-cessation. It starts at `RRS_BASELINE = 0.482` (STEP 1 extension, Wilding 2022, PMID 35441470 — 48.2% of patients maintained ≥5% loss at 12 mo) and is shifted by each contribution. Clamped to `[0.02, 0.95]` at the end.

**The three cited constants** at the top of the engine:

- `RRS_BASELINE = 0.482` — STEP 1 ext (PMID 35441470)
- `RRS_PLATEAU  = 0.753` — Lancet eClinicalMedicine 2026 meta-regression (DOI 10.1016/j.eclinm.2026.103xxx)
- `RRS_RATE_K   = 0.0302` per week — same source, half-life ~23 wks

**Never change these numbers without updating the matching `REFERENCES` entry.** They are the load-bearing anchors for everything downstream.

**Honest scope rule (load-bearing).** Each contribution checks `if (value !== null)` before pushing — **inputs the user left blank contribute nothing**, neither positive nor negative. The visible driver list and the score itself only reflect the data the user actually entered. Don't add penalties for missing values; it breaks the contract the UI promises ("Inputs you left blank don't appear — no penalty for missing data").

**Contribution object shape:** `{ label, delta, citation, modifiable, hint }`. `citation` is a `REFERENCES` key (e.g. `'eclinm-2026'`); the UI uses it for the hover/citation badge. `modifiable: true` means the patient or clinician can change this input (lifestyle, adherence). Things like age, agent class, comorbidities, planning-to-stop are `modifiable: false`.

**`topDrivers`** filters to `modifiable === true && delta < 0`, sorted by `|delta|` desc, top 3. This is the "things to fix" list. The heading in `RiskTab` pluralizes correctly when 1 or 2 drivers — don't hardcode "Three things".

**Sarcopenic flag** triggers two ways: (a) body comp measured AND lean mass <55% of (lean+fat); (b) fallback heuristic when no body comp — >10% loss AND protein <0.8 g/kg AND <1 RT session/wk. When flagged, `RiskTab` renders a red-tinted warning band citing MedCentral 2025.

### `rrsBucket(pHold)` — three-band classifier

- ≥ `0.65` → Low rebound risk (green dot)
- ≥ `0.35` → Moderate (amber)
- < `0.35` → High (red)

**Bucket thresholds are tuned so demo patients A/B/C land in distinct buckets** (A→~95% Low, B→~60% Moderate, C→~2% High). If you change weights in `computeRRS`, re-trace all three demo profiles and confirm they still split correctly. This is the canonical end-to-end test.

### `canComputeRRS(state)` — minimum-data gate

True iff `age`, `baselineWeightKg`, `currentWeightKg`, and `agent` are all present. Below this bar, `RiskTab` and `TrajectoryTab` render the shared `<EmptyClinical>` component pointing the user back to Intake.

### `trajectory({ baselineKg, currentKg, weeks, adherencePct })` — 52-wk forecast

Returns an array of `{ t, weightDoNothing, weightWithPlan }` sampled every 2 weeks. The natural rebound:

```
regained_kg(t) = (baseline − current) × 0.753 × (1 − exp(−0.0302·t))
```

The "follow plan" curve attenuates regain by `(adherence/100) × 0.85`. **Max attenuation is 0.85 — anchored to STEP 1 ext's 48% maintenance baseline; we never claim 100% prevention.** Don't bump this above 0.85 without a new citation; it would over-promise.

### Chart components

- `<DriverBar c scale>` — proportional horizontal bar around a center zero-line. Green right for positive deltas, red left for negative. Width scales to `Math.abs(delta) / scale * 100%` where `scale = max(0.10, max(|delta|))`.
- `<TrajectoryChart points baselineKg currentKg>` — 800×320 viewBox SVG. Baseline + Today reference lines, dashed red "do-nothing" curve, solid navy "with-plan" curve, terminal markers, y-axis kg ticks at `[yMin, current, mid, baseline, yMax]`. Pure SVG, no chart library.
- `<EmptyClinical eyebrow title message setActive>` — shared empty-state shell for any clinical tab when `canComputeRRS` is false.

## Maintenance Rx engine (Phase 4)

`computeMaintenanceRx(state, rrs)` in `index.html` produces the full Plan tab. Pure function, returns `{ strategy, lifestyle, followUp, redFlags, alerts, bucket }`.

### Decision tree (strict precedence — order matters)

The strategy is picked by `strategyForPatient(state, bucket)` with this hard priority:

1. **Cardiometabolic indication overrides everything.** If `cvDisease || mash || (t2d && hba1c≥7)`, the strategy is **CONTINUE indefinitely** regardless of risk bucket or planning-to-stop. This is clinically correct — these conditions are continuation indications independent of weight outcomes.
2. **High risk + planning to stop:** branches on preferences. `oralPreference || costConstrained` → **BRIDGE to oral Wegovy** (OASIS 4 protocol, 1.5 → 4 → 9 → 25 mg/d titration). Otherwise → **strongly recommend continuation** with re-discussion at 6 months.
3. **Moderate risk + planning to stop:** **slow taper** over 16–24 weeks via the agent's `TAPERS` schedule.
4. **Low risk + planning to stop:** **quick taper** over 12 weeks (first 2 steps of the agent's taper).
5. **Default (anyone not planning to stop):** **maintain at lowest effective dose**, annual re-assessment.

If you change the priority order, retest all three demo profiles — A/B/C end up in three different branches.

### `TAPERS` — per-agent reverse-titration schedules

`{ wegovy_sc, wegovy_oral, ozempic, rybelsus, saxenda, cagrisema }`. Each is an array of `{ weeks, dose, note }` objects. **Schedules mirror each agent's approved titration in reverse** (Wegovy SC: 2.4 → 1.7 → 1.0 → 0.5 → off, q4w each; Saxenda: 3.0 → 2.4 → 1.8 → 1.2 → 0.6 → off, q2w each). CagriSema stays a one-row placeholder until FDA approval — don't fill in a fake schedule.

`BRIDGE_ORAL` is the OASIS 4 titration up to oral semaglutide 25 mg/d, used only by the bridge strategy.

### Lifestyle floors

`lifestyleForPatient(state, rrs)` returns `{ proteinFloor, proteinGrams, proteinReasons[], rtTarget, rtReason, sleepTarget, sleepReason }`. Protein default is **1.4 g/kg/d** for post-loss maintenance (MedCentral 2025 review). Lifted to **1.6 g/kg/d** if any of: sarcopenic flag triggered / age ≥65 / baseline BMI ≥35 with ≥10% loss. The `proteinReasons` array carries human-readable reasons in display order — the Plan tab renders them as bullets under the figure. RT target is 3 sess/wk default, 4 if sarcopenic.

### Follow-up cadence + red flags

`followUpForBucket(bucket)` returns `{ cadence, visits[], labs[] }` keyed to risk bucket (high → q4w × 6 mo; mod → q8w × 6 mo; low → quarterly). `redFlagsForPatient(state)` returns a base list of escalation triggers (regain > 3 kg / 4 wks, lean mass loss > 2 kg / 8 wks, BP rise > 10 mmHg) plus conditional flags for T2D (HbA1c rise > 0.5% / 3 mo) and MASH (ALT rise > 1.5× baseline).

### Alerts

`computeMaintenanceRx` appends tone-coded alerts (`bad` / `warn` / `good` / `info`) when relevant — sarcopenic guard active, CV continuation favored, MASH continuation favored, cost-constrained patient on premium agent. The Plan tab renders them as colored-bar callouts with semantic tinting.

### Plan tab conventions

`PlanTab` is the only tab that consumes both `computeRRS` AND `computeMaintenanceRx`. It memoizes both via `useMemo(...)` on state. The strategy banner shows two pills side-by-side: the strategy tone and the underlying risk bucket. The taper schedule renders as an editorial table with zebra-free hairline-divided rows (Period · Dose · Note); don't replace with bullet lists.

## AI Coach (Phase 5)

Same-origin chat coach powered by Claude Sonnet 4.6. Browser only ever talks to `/api/coach`; the Edge function holds the API key. **CSP unchanged** — `connect-src 'self'` is sufficient because Anthropic's domain is never called from the browser.

### `api/coach.js` — gate order (matches Octo-perio's `api/vision.js` pattern)

Every request runs the gates in this order. Each returns early on failure with a typed error code:

1. **Method** — POST only → `METHOD_NOT_ALLOWED` (405)
2. **Origin** — must be in `ALLOWED_ORIGINS` env, or be a Vercel-injected URL (`VERCEL_URL` / `VERCEL_BRANCH_URL` / `VERCEL_PROJECT_PRODUCTION_URL`), or be localhost, or be `null` (for `file://`) → `FORBIDDEN_ORIGIN` (403)
3. **Rate limit** — per-IP token bucket, lives in warm-instance memory. Defaults: `RATE_LIMIT=10` per `RATE_WINDOW_MS=60_000` → `RATE_LIMITED` (429)
4. **API key** — `ANTHROPIC_API_KEY` must exist → `NOT_CONFIGURED` (503)
5. **Content-type** — `application/json` → `UNSUPPORTED_MEDIA_TYPE` (415)
6. **Body size** — `MAX_BODY_BYTES = 50_000` → `TOO_LARGE` (413)
7. **JSON parse** → `BAD_REQUEST` (400)
8. **Input validation** — `messages: [{role: 'user'|'assistant', content: string}]`, length ≤ 12 history, content ≤ 4000 chars; `patientContext` is whitelisted to fields in `CTX_STRING_FIELDS` / `CTX_NUMBER_FIELDS` / `CTX_BOOL_FIELDS` / `CTX_ARRAY_FIELDS`
9. **Red-flag refusal** — `RED_FLAG_PATTERNS` matched against the latest user message → return `HOTLINE_RESPONSE` **without forwarding to Anthropic**. Patient never gets coached *into* self-harm or ED behaviors.
10. **Upstream call** — Anthropic `messages` API with `model: 'claude-sonnet-4-6'`, `max_tokens: 600`, system prompt + injected `<patient_context>` block, then sanitized response (`sanitizeReply` strips bidi/control/zero-width chars + role markers, caps at 2400 chars).

Errors are mapped to typed codes; the function **never echoes the upstream response body** when Anthropic returns a non-OK status.

### Locked system prompt

`SYSTEM_PROMPT` (top of `coach.js`) is load-bearing. It enforces: warm/concise prose (2–4 paragraphs), use the `<patient_context>` for personalization, decline all dosing-change requests (refer to clinician), refuse to engage with self-harm/ED topics (server-side red-flag is the primary defense, this is belt-and-suspenders), no fabricated numbers/citations/trial names, plain prose only (no markdown headings or bullets). Don't relax these without discussing first — they're what makes the coach safe to ship.

### Regex character-class gotcha (BUG FIXED, DO NOT REINTRODUCE)

`STRIP_INVISIBLES` and `STRIP_CONTROLS` regexes are built via `new RegExp('[' + String.fromCharCode(0x...) + ... + ']', 'g')`, **not** via regex literals with `\uXXXX` escapes. Reason: the file-write pipeline collapses `​` style escapes into literal codepoints, which silently produce broken character ranges (e.g. `[space-to-zero-width-space]` strips *every printable ASCII character*). The `fromCharCode` form is pure ASCII at rest and survives any tooling. If you "clean up" these regexes back into literals, you will break the sanitizer and not notice — it just mangles all output.

### `CoachTab` (in `index.html`) — patient-context flow

The component is the only piece of UI that calls the Edge function. It:

1. Bails to `<EmptyClinical>` if `canComputeRRS(state)` is false.
2. Memoizes `computeRRS(state)` and `computeMaintenanceRx(state, rrs)` — same pattern as `PlanTab`.
3. Builds the context via `buildPatientContext(state, rrs, rx)` which projects the shared state into the whitelisted shape the Edge function expects. **Don't pass raw `state` to the API** — it contains unwhitelisted fields the sanitizer would drop anyway, and is wasteful.
4. Renders an editorial chat thread (sender labels + hairlines between turns, no bubbles). `messages` is local component state; conversations don't persist anywhere and reset when the tab unmounts. This matches the project-wide no-persistence rule.
5. `COACH_QUICKSTARTS` (4 starter prompts) is visible only when the thread has just the welcome message. Click sends directly.
6. Errors from `postToCoachAPI` are mapped through `COACH_ERROR_MESSAGES` for user-friendly display. `NOT_CONFIGURED` is the dev-mode default — don't try to "fix" it locally without `vercel dev` + env var set.

### Env vars (Vercel project settings)

- `ANTHROPIC_API_KEY` — **required for the coach to work**. Production + Preview.
- `ALLOWED_ORIGINS` — comma-separated additional allowed origins beyond auto-injected Vercel URLs.
- `RATE_LIMIT` / `RATE_WINDOW_MS` — optional overrides for the token bucket.

## Cohort + Print pipeline (Phase 6)

### `CohortTab` — synthetic 10-patient panel (HCP-only)

`COHORT_PATIENTS` is a frozen array of 10 patient records, each with `{ id, initials, data }` where `data` is the same shape as `INITIAL_STATE`. Deliberately spans the risk spectrum so the population-view story holds together (4 low / 3 moderate / 3 high — re-verify with `computeRRS` after any formula change).

The component:

1. Maps `COHORT_PATIENTS` → `enriched` via `useMemo` (computes `rrs`, `rx`, `bucket`, `pHoldPct`, `lossPct` per row exactly once per render).
2. Sorts via `sortKey` + `sortDir` state; default `risk` ascending = highest risk first.
3. Renders a distribution band (Low / Moderate / High counts), then a `cohort-table` with sortable column headers (Risk, Age, Agent, Wks on tx, % loss).
4. Each `<tr>` carries `role="button"`, `tabIndex={0}`, descriptive `aria-label`, and an `onKeyDown` handler so Space/Enter activate without scrolling.
5. Row click → `loadDemo(p.data)` then `setActive('risk')` — patient ends up loaded into the shared `data` state and the user lands on the Risk Score tab. **Don't change this flow** — the click-to-load behavior is the headline pitch for the HCP-mode population story.

The Cohort tab is hidden from Patient mode by the `modes: ['hcp']` filter in `TABS`. Don't add it to Patient mode without rethinking the framing.

### Printable referral letter + maintenance contract

Two pure components rendered as siblings inside a single `<div className="print-only">` at the bottom of `PlanTab`:

- **`PrintableReferralLetter(state, rrs, rx)`** — clinician handover. Includes a derived ICD-10 list (E66.x by BMI band; E11.9 / K76.81 / I25.10 / N18.9 / I10 / E78.5 conditional on comorbidity booleans). Renders the strategy + rationale + the full taper table inline, lifestyle prescription as a single dense paragraph, follow-up cadence + visits + labs, escalation triggers, signing-clinician + receiving-clinician signature blocks.
- **`PrintableMaintenanceContract(state, rrs, rx)`** — patient-facing signed commitment. "My non-negotiables" with empty checkboxes (HTML divs with `border-bottom`) for protein / RT / sleep / follow-up / honesty clause, plus patient + clinician-witness signature lines.

**Inline styles** (not Tailwind / CSS classes) on the print components. Reason: print engines occasionally drop the global stylesheet or fight the cascade. Inlining keeps the printed output deterministic across Chrome / Firefox / Safari print previews. Don't refactor these into class-based styling.

### `.screen-only` / `.print-only` / `.no-print` — the print seam

Three CSS visibility classes work together:

- `.no-print` — visible on screen, hidden on print. Apply to nav, headers, footers, CTAs that don't belong on paper.
- `.print-only` — `display: none` on screen, `display: block` under `@media print`. Wraps the two printable components in `PlanTab`.
- `.screen-only` — `display: none` only under `@media print`. **Wraps the entire on-screen body of `PlanTab` from the eyebrow through the CTA row.** Reason: without this wrapper, hitting "Print referral & contract" prints both the screen UI *and* the print pages, producing a 4-page mess. The wrapper makes print output two clean pages exactly.

When adding new content to `PlanTab`, decide which side of the seam it lives on. New screen-only sections go inside the `.screen-only` div; new print-only artifacts go inside the `.print-only` div alongside the two existing components.

### `@page` / print CSS

Beyond the seam classes, the `@media print` block:

- Hides `header, footer, .nav-link` outright (defense in depth — they already carry `.no-print`).
- Forces white background, navy headlines, drops link arrows (`a[href]::after { content: "" }`).
- Disables the `nnFadeUp` entrance animation on `main > *` (no jank on first paint).
- `.print-page { page-break-after: always }` ensures the contract starts on a fresh sheet; `.print-page:last-child` resets so we don't end with a blank trailing page.
- `.print-block { page-break-inside: avoid }` keeps a table or section together when possible.

## A11y + polish (Phase 7)

### Landmarks + skip link

- `<a href="#main" className="skip-link no-print">Skip to main content</a>` lives just inside `<App>` before the utility strip. CSS positions it at `top: -100px` (sr-only-ish) and slides to `top: 12px` on `:focus`. First Tab keypress on page load reveals it.
- `<main id="main" tabIndex={-1} aria-label="{tab} content">` — programmatically focusable so the skip link can target it. `aria-label` updates per tab.

### Live region

`<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">Showing {tabLabel} · {modeLabel} view</div>` sits between the header and `<main>`. AT announces tab + mode changes; visually invisible via the `.sr-only` clip-rect pattern. Don't replace `aria-live="polite"` with `assertive` — it would interrupt other announcements.

### Motion

- `@keyframes nnFadeUp` + `main > * { animation: nnFadeUp 240ms cubic-bezier(0.16, 1, 0.3, 1); }` — every tab change rides in with an 8px translateY + opacity. Subtle, fast, not fancy.
- `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; } }` — full kill switch for any user who has reduced motion enabled. Honors macOS / Windows accessibility prefs.

### Trajectory chart text size

SVG `fontSize` on axis ticks and reference labels is `13` (not `10–11`). At the 800×320 viewBox, this scales down to readable text on a 375px-wide phone display. Don't drop below 12 — text becomes illegible on the smallest phones.

### Cohort row keyboard

Each `<tr>` is keyboard-activatable via Space/Enter. The handler calls `e.preventDefault()` on those keys to stop the page from scrolling when a row is focused.

### DEMO.md

Top-level [`DEMO.md`](DEMO.md) is the 5-minute golden-path script — recorded walkthrough order, what to say, what to point at. Update it whenever a phase changes the demo flow.

## Bilingual (Phase 8 — EN/HE with full RTL)

The app runs in English by default with a one-click switch to Hebrew (right-to-left). Two-layer pattern — keyed dictionary for static UI chrome, inline `T(en, he)` helper for engine-generated dynamic content.

### Static UI chrome — `STRINGS` + `useT()`

`STRINGS = { en: {...}, he: {...} }` near the top of the Babel script holds every literal UI string keyed dot-style (`'home.title1'`, `'intake.f.age'`, etc.). Resolved at render time via the `useT()` hook:

```jsx
const t = useT();
<h1>{t('home.title1')}</h1>
```

`useT()` returns a function that does fall-through: `STRINGS[lang][key] ?? STRINGS.en[key] ?? key`. Supports `{var}` interpolation when called as `t('plan.life.protein.aside', { g: 156 })`.

**Adding a new visible string:** add the key to **both** `STRINGS.en` AND `STRINGS.he`. If you forget HE, the EN fallback shows in Hebrew mode — not broken, but obvious. Don't leave fallbacks in place; they're a regression.

### Engine-generated content — inline `T(en, he)` via `makeT(lang)`

`computeRRS`, `computeMaintenanceRx`, `strategyForPatient`, `lifestyleForPatient`, `followUpForBucket`, `redFlagsForPatient`, `rrsBucket`, `tapersFor`, `bridgeOralFor` all accept a `lang` parameter (default `'en'`). Each builds a local `const T = makeT(lang)` helper and calls `T(en, he)` inline for every dynamic label, hint, rationale, alert body, taper step note, etc.

Why two patterns? The engines generate **conditional** content (bucket → strategy headline → rationale → cited steps) where only a handful of variants ever appear at once. Keying every possible string into `STRINGS` would balloon the dict. The inline `T()` form keeps the en/he pair next to the logic that picks it. **Don't replace the inline form with keys** — you lose the locality that makes the engines auditable.

### Wiring lang through the components

`App` holds `const [lang, setLang] = useState('en')` and provides it via `<LangContext.Provider value={lang}>` wrapping the entire app. The `useLang()` hook returns the current lang anywhere; components that consume engine output use it to thread lang into engine calls:

```jsx
const lang = useLang();
const rrs = useMemo(() => computeRRS(state, lang), [state, lang]);
const rx  = useMemo(() => computeMaintenanceRx(state, rrs, lang), [state, rrs, lang]);
const b   = rrsBucket(rrs.pHold12m, lang);
```

**Don't forget the `lang` dependency in `useMemo`.** Without it, switching to HE on the Risk tab would keep showing English contribution labels until state changed.

### `<html lang dir>` flip

A `useEffect` in `App` watches `lang` and sets `document.documentElement.lang = lang` and `document.documentElement.dir = (lang === 'he' ? 'rtl' : 'ltr')`. These attributes drive the CSS RTL overrides.

### RTL CSS

- `:root[lang="he"] body` swaps Inter → Heebo (already vendored in `vendor/fonts/`).
- `:root[lang="he"] .display` adjusts letter-spacing to `-0.005em` and line-height to `1.16` — Latin tight tracking doesn't fit Hebrew typography.
- `:root[lang="he"] .num`, `.stat-figure`, `.risk-pill`, `input[type="number"]` force `direction: ltr; unicode-bidi: isolate` so numbers, percentages and `12 mo · 95%`-style pills render correctly inside Hebrew prose. **Always wrap numeric output in `.num`** — without it, surrounding bidi context will reverse the digits.
- The `.border-l-2` shorthand used by alert callouts has an RTL flip rule that swaps to right-border when `dir="rtl"`.

### Clinical terms that stay English in both languages

Drug names (Wegovy, Ozempic, Saxenda, Rybelsus, CagriSema), lab acronyms (HbA1c, LDL, ALT, BMI, MASH, MASLD, CVD, CKD, T2D), and ICD-10 codes (E66.x, K76.81, etc.) are intentionally left in English in HE prose. This matches Octo-perio's convention and how Hebrew-speaking clinicians actually write notes. Don't transliterate.

### Demo profiles + option groups

`DEMO_PATIENTS[]` carries `nameKey / riskKey / summaryKey` instead of literal strings — resolved via `t()` at render. Same pattern for `SEX_OPTIONS` and `BODY_COMP_OPTIONS` (`labelKey` field, resolved in `IntakeTab` via `.map(o => ({...o, l: t(o.labelKey)}))` before passing to `ChipGroup`). `AGENT_OPTIONS` stays literal because every label is a drug name.

### Language toggle UI

Lives in the navy `UtilityStrip` at the top of the page, next to the Clinician/Patient audience toggle. Two buttons: `EN` and `עברית`. Marked with `aria-pressed`. The Hebrew button has `lang="he"` so AT pronounces "עברית" correctly.

## Phase status — all 8 phases shipped

All approved phases have shipped, plus the GitHub push for deploy.

- **Phase 1 — skeleton.** Shipped. Vendor copy, CSP, editorial Novo brand system, utility strip + Clinician/Patient toggle, sticky header with 8 tabs, Overview page (hero + 3-stat band + opportunity split + 6-feature grid + closing CTA + footer), References tab fully populated. **Note:** Phase 1 went through two visual rewrites — liquid-glass (rejected as "gimmicky") and dark navy gradient (rejected as "doesn't feel like Novo"). Current editorial-white look is the approved one. Don't reintroduce glass, gradients, or dark hero backgrounds.
- **Phase 2 — Intake.** Shipped. Single shared state model in `App`, ~25-field intake form across 7 numbered sections, three demo patients (A/B/C), form primitives (`<Field>`, `<NumberInput>`, `<ChipGroup>`, `<Toggle>`, `<FormSection>`), auto-derived BMI / % loss / lean %, completion counter, "Compute risk" CTA that jumps to Risk Score tab.
- **Phase 3 — Risk Score + Trajectory.** Shipped. `computeRRS` + `trajectory` engines with cited constants, `RiskTab` (hero result + sarcopenic warning + top-N modifiable drivers + full contribution bar chart + CTA row), `TrajectoryTab` (dual-curve SVG + adherence slider 0–100% + outcome stats), shared `<EmptyClinical>` empty state for under-filled intakes.
- **Phase 4 — Maintenance Rx.** Shipped. `computeMaintenanceRx` decision tree with hard-priority order, per-agent `TAPERS` reverse-titration schedules, `BRIDGE_ORAL` (OASIS 4) protocol, lifestyle floors that lift protein to 1.6 g/kg under three conditions, risk-tiered follow-up cadence, conditional red-flag list, tone-coded alerts. PlanTab renders strategy banner + taper table + lifestyle stats + follow-up + red flags.
- **Phase 5 — AI Coach.** Shipped. `api/coach.js` Edge function (10-gate hardening pattern with server-side red-flag refusal), `CoachTab` editorial chat UI, quickstart pills, typed error map, locked system prompt. CSP unchanged — same-origin via `/api/coach`.
- **Phase 6 — Cohort + print pipeline.** Shipped. `CohortTab` (HCP-only, synthetic 10-patient panel, sortable, click-to-load), `PrintableReferralLetter` (with auto ICD-10 mapping), `PrintableMaintenanceContract`, `.screen-only` / `.print-only` / `.no-print` seam tested across both pages.
- **Phase 7 — Polish + a11y + demo script.** Shipped. Skip link, sr-only `role="status"` live region for tab/mode announcements, `<main id tabIndex>` landmark, `nnFadeUp` entrance animation, `prefers-reduced-motion` kill switch, trajectory chart text sized for mobile, cohort row keyboard activation. `DEMO.md` golden-path script.
- **Phase 8 — Bilingual EN/HE.** Shipped (2026-05-16). `STRINGS = { en, he }` dictionary + `useT()` hook for static UI chrome; inline `makeT(lang)` helper threaded through every engine for dynamic content (contribution labels, strategy rationales, alert bodies, taper notes, red flags, lifestyle reasons, follow-up cadence labels). Language toggle in utility strip flips `<html lang dir>`; RTL CSS swaps to Heebo display font, forces LTR numbers, mirrors logical borders. Clinical terms (drug names, lab acronyms, ICD-10) stay English in both languages.

**Repo lives at `https://github.com/rongerso-wq/ReboundIQ.git`** as of 2026-05-16. To deploy: import to Vercel, set `ANTHROPIC_API_KEY` env (Production + Preview), deploy. Vercel auto-detects the static site + Edge function from `vercel.json`. Roadmap lives at `C:\Users\litbe\.claude\plans\i-want-to-built-reactive-umbrella.md`.

## Post-launch audit pass (Tiers 2–5, 2026-05-16/17)

After Phase 8 shipped, Agent Smith (security) and Agent Gourges (design) ran a thorough audit. Gourges baseline score: 8.2 / 10; post-audit projected 9.5+. Six commits closed the findings.

### Critical fix (caught by Gourges)

`useRef` was missing from the React destructure at the top of the Babel script. The Coach tab crashed at runtime the moment a user clicked it. Fixed in `11437a0`. **Future-me: always destructure the React hooks you actually use** (`useState, useMemo, useEffect, useRef`) at the top of the Babel script; the lazy-runtime "React is global" assumption hides this category of bug.

### Tier 2 — editorial discipline (`f8e484b`)

- **`AgentLineup` component** in PlanTab — six hairline chip-cards (Wegovy SC · Wegovy pill · Ozempic · Rybelsus · Saxenda · CagriSema-filed), current agent gets a navy bottom-underline + "CURRENT" mark, bridge target gets dashed-blue + "BRIDGE TARGET" mark when `strategy.key === 'bridge-oral'`. A caption underneath fires only when bridging. **This is the visual asset that makes the "portfolio-aware" claim true** — previously the demo had to narrate portfolio-awareness; now the screen shows it. Don't strip it for "cleanliness" — it's load-bearing for the pitch.
- **Tinted alert backgrounds were stripped** in four places (sarcopenic warning, PlanTab alerts row, Coach disclosure, Coach error). Alerts now use a single semantic device: colored left bar (`.border-l-2` with inline `borderColor`) + colored eyebrow. **Don't re-add tinted backgrounds** (`#FDF6F4` / `#FBF7EE` etc.) — that combination reads as "Notion / Linear" and undermines the editorial-Novo discipline.
- **`.demo-card:hover` no longer has a box-shadow.** It used to be the only place in the entire app that broke the "no shadows" rule. Hairline border-color transition + 2px translateY lift still convey interactivity.
- **`:lang(he) .mode-btn`** resets `letter-spacing: 0` and `text-transform: none`. The 0.10em tracking inherited from `.mode-btn` was smashing Hebrew letters apart on the "עברית" / "רופא/ה" / "מטופל/ת" buttons. Same fix protects any future button using `.mode-btn` in Hebrew mode.
- **The Opportunity-section CTA** on the home page is now a real `<button type="button">` instead of `<span role="link">`. Keyboard reachable.

### Tier 3 — server hardening (`0510f55`)

All Smith moderate findings (M1–M6) closed inside `api/coach.js`. **Future-me: don't undo these — they're defense-in-depth that costs nothing and closes real bypasses.**

- **Pre-sanitize every `messages[].content`** with `STRIP_INVISIBLES` *before* the red-flag detector and before forwarding upstream to Anthropic. Without this, `sui​cide` slips past `detectRedFlag` because the regex `\b` word boundaries fail across a zero-width glyph. The patient gets coached *into* self-harm content instead of getting hotline routing. The fix is one `for` loop; the bug would have been silent until it wasn't.
- **`STRIP_INVISIBLES` covers** C0 controls + DEL + U+180E (Mongolian vowel separator) + U+200B–U+200F (zero-width + bidi marks) + U+202A–U+202E (bidi embedding/override) + U+2060–U+2064 (word joiner + invisible operators) + U+2066–U+2069 (isolate controls) + U+FEFF (BOM). Constructed via `String.fromCharCode` chain — **the literal regex form gets silently mangled by some toolchains** (verified twice). Don't "clean up" back to literals.
- **`ALLOW_DEV_ORIGINS=1` env gate** wraps the `Origin: null` (`file://`) and `localhost` allowances. **Set it only on Vercel Preview, never on Production.** Without this, any sandboxed iframe (which sends `Origin: null`) could call `/api/coach` from a malicious page.
- **Early body-size reject via `content-length` header** before `await req.text()` buffers anything.
- **The `'unknown'` IP attribution fallback is gone.** Unattributed requests now return 400 instead of sharing one bucket (which would let a single misbehaving caller poison every honest one).
- **`patient_context` array fields use `STRIP_INVISIBLES`** (was `STRIP_CONTROLS`). Closes the inconsistency where `topDrivers` strings could carry zero-width chars into the `<patient_context>` JSON block.

### Tier 4 — editorial polish layer (`bf82928`)

Compounding small fixes. None individually critical; together they move the typography hierarchy and mobile experience from "good" to "polished."

- **`.stat-figure--small`** (36/44px) applied to `LifestyleStat`, `Outcome`, the `Lost-on-therapy` panel, and `DistStat`. **Reserve the full 72px `.stat-figure` for the single hero metric per tab** (the 95% on RiskTab, the 11.6pp on home). Anything else at 72px competes with the hero and flattens hierarchy.
- **`Row` component** (PlanTab "At a glance" card) is grid-based (`gridTemplateColumns: '1fr auto'`) so long Hebrew labels can wrap without breaking right-edge alignment of the value.
- **`.mobile-tab-strip`** has a `mask-image: linear-gradient` fade on the right edge (left in RTL) so users on `<768px` know the tab nav scrolls.
- **`.traj-chart-scroller` + `.traj-chart-wrap` with `min-width: 480px`** lets the SVG chart horizontally scroll on phones <480px instead of cramming labels into illegible 5px text.
- **`.coach-input` mobile min-height** drops to 64px under 640px so the Send button stays above the iPhone-SE fold.
- **`coachWelcome` no longer `.toLowerCase()`s bucket + strategy labels.** Drug names ("Wegovy SC") and capitalized labels mid-sentence read intentional.
- **`.border-l-2` RTL flip uses `!important`** to override Tailwind preflight defaults. Without `!important` the alert callouts can render with hairlines on all four sides in RTL mode.
- **Utility strip drops the personal credit** (was `t('app.tag')`). The Caveat footer signature is the only place the credit appears now — matches the CLAUDE.md "signature lives only in footer" rule.
- **PlanTab strategy eyebrow stays `--nn-blue`** regardless of strategy tone (the dynamic color was triple-coding the same semantic that two pills already carry).
- **Coach footer's "Claude Sonnet 4.6"** is no longer bold + navy. The model name was pulling eye away from the product name in a 12px caption.

### Tier 5 — strategic polish (`4ecefb6`)

Six of eight items shipped. Skipped: (1) pre-compile JSX → that's the next task documented below, and (2) live coach smoke test → requires Vercel deploy + the user's API key.

- **References anchor system.** Every `<article>` in `RefsTab` carries `id="ref-{key}"` with `scrollMarginTop: 80px`. Stat sources on the home page are now clickable links that call `setActive('refs')`, then `setTimeout(80ms)` → `scrollIntoView({behavior:'smooth'})`. **Don't skip the timeout** — without it the scroll fires before the References tab has mounted its DOM and silently no-ops.
- **`<Stat>` component now takes optional `sourceKey` + `setActive` props.** When both are present, the source caption renders as an `<a href="#ref-{key}">` with a quiet underline that hovers to navy. When absent, falls back to a plain `<div>`. Same component, two modes — keeps the visual unchanged on screens that don't link.
- **Animated trajectory chart.** `<polyline>` → `<path>` with `d="M... L... L..."`. CSS `.traj-path { transition: d 240ms }` morphs the curve smoothly when the adherence slider moves. Markers use `transition: cx, cy` so they slide in lockstep. **Modern browsers transition `d` natively** for paths with matching point counts — both curves use the same sample timesteps, so the morph is well-defined. Don't go back to `polyline` (the `points` attribute doesn't transition).
- **`.cohort-table` sticky-first-column under 900px viewport.** The Risk pill column sticks left (right in RTL) so users can scroll horizontally without losing the patient-identifier anchor. Hover background applied to the sticky cell too.
- **Toast pattern.** Single global `<Toast>` element at the bottom of `<App>`'s JSX, bottom-center, 1.8s auto-dismiss via a `useRef` timer in `App`. `showToast(message, meta?)` is the only API — threaded down to `IntakeTab` and `CohortTab` as a prop. Fires on demo-profile load, cohort-row click, share-link copy, share-link restore. Bilingual (`STRINGS.toast.*`). Don't introduce a separate toast lib — the editorial style is hairline + dot + navy fill, intentionally minimal.
- **URL hash share / restore (`#a=...`).** `encodeAssessment(state)` drops empty-string + `false` fields, JSON.stringifies, then `btoa(unescape(encodeURIComponent(json)))` so non-ASCII (Hebrew dose strings) round-trips. `decodeAssessment(hash)` whitelists keys against `INITIAL_STATE` to prevent prototype pollution. On `App` mount, if the URL hash matches `[#&]a=([A-Za-z0-9+/=_-]+)`, the assessment is restored, the user is sent to the Risk tab, a confirmation toast fires, and the hash is cleared via `history.replaceState` so refresh doesn't silently re-restore stale state. **No server persistence** — this is opt-in client-side share for KOL workflows. The "Share assessment" arrow-link in `IntakeTab`'s footer is the entry point; clipboard with `prompt()` fallback.

## Production build pipeline (Tier 5.1 — pre-compile)

The single-file Babel-in-browser pattern is great for dev (`open index.html` in Chrome and it works) but ships with two CSP relaxations that production-grade pharma deployments will flag:

- `script-src 'unsafe-eval'` (Babel Standalone needs `eval` to compile JSX at runtime)
- `script-src 'unsafe-inline'` (the `<script type="text/babel">` block is inline)

The fix is to pre-compile the JSX → static JS at build time, ship that compiled bundle to Vercel, and tighten the production CSP accordingly. The source `index.html` stays the dev artifact; a new `dist/index.html` is the deploy target.

### `build.sh` — what it does

1. **Extracts** the `<script type="text/babel">` block from `index.html` into a temp `.jsx` file.
2. **Compiles** it with esbuild via `npx --yes esbuild` (no install needed): `--loader=jsx --bundle=false --minify` → produces a static JS string.
3. **Re-injects** the compiled JS into `index.html` as `<script defer>` (no type="text/babel"), drops the `vendor/babel.min.js` `<script>` reference, and writes `dist/index.html`.
4. **Copies** `vendor/` (sans `babel.min.js`) and `api/` to `dist/`.
5. **Writes** a tightened `dist/vercel.json` with the production CSP (no `'unsafe-eval'`, no `script-src 'unsafe-inline'`).

Run via `bash build.sh` from the project root. The script is idempotent — re-running overwrites `dist/`.

### `dist/` is the deploy target

`vercel.json` at the repo root deploys `dist/` (not the project root). Source files stay in place for dev. Future Claude instances: **don't edit `dist/` directly — always re-run `build.sh`.** The `dist/` directory is committed to the repo (it's tiny without Babel) so Vercel's build step is just a static file serve.

### Tightened production CSP

`dist/vercel.json` carries:
- `script-src 'self'` — no `'unsafe-eval'`, no `'unsafe-inline'`
- `style-src 'self' 'unsafe-inline'` — Tailwind Play still needs inline style injection at runtime; left in. Migrating to a pre-built Tailwind CSS file is a future iteration.
- Everything else (`connect-src 'self'`, `frame-ancestors 'none'`, `form-action 'none'`, `object-src 'none'`) unchanged.

If a future iteration also drops Tailwind Play (replaces with a pre-built `dist/styles.css` via `npx tailwindcss`), you can remove `style-src 'unsafe-inline'` too and reach a fully tightened CSP.

## Conventions

- All clinical thresholds anchored to a citation comment (PMID/DOI). Match this style for any new logic. Add the citation to `REFERENCES` too.
- **Adding a new visible string:** keyed UI strings go in `STRINGS.en` AND `STRINGS.he` (don't add only one — EN fallback hides the bug). Engine-generated dynamic content uses inline `T(en, he)` via the local `makeT(lang)` helper, paired right where the logic that picks it lives. See the "Bilingual" architecture section for the rationale on the two-layer split.
- **Adding a new clinical engine helper** (anything that returns localized labels): accept `lang = 'en'` as the last argument, build `const T = makeT(lang)` at the top, branch every dynamic string via `T(en, he)`. Thread `lang` through from any component that calls it. Don't forget to add `lang` to the `useMemo` dependency array — without it, switching language won't trigger a re-render.
- Vendoring more libraries: drop the file into `vendor/`, reference with relative path, never use `unpkg`/`cdn` URLs.
- AI honesty: the risk score is evidence-anchored, not ML. Don't reintroduce fake "confidence intervals" or "model predictions" without discussing first.
- **Numeric output inside Hebrew prose must be wrapped in `.num`** — without it, bidirectional context will reverse digits. The CSS already forces `direction: ltr; unicode-bidi: isolate` on `.num` under `:root[lang="he"]`.
- **Don't commit secrets.** `ANTHROPIC_API_KEY` lives only in Vercel project env; no `.env` files in the repo. The coach returns `NOT_CONFIGURED` if the key is missing — that's the expected local-dev state.
