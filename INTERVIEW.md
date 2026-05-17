# ReboundIQ — Interview Walkthrough

A study sheet for explaining the entire app: every tab, every architectural choice, every defensible answer to a probing question.

**Author:** Dr. Roni Gershonovitch
**Date:** 2026-05-17
**Repo:** [github.com/rongerso-wq/ReboundIQ](https://github.com/rongerso-wq/ReboundIQ)

---

## Table of contents

- [The 30-second pitch](#the-30-second-pitch)
- [The 3-minute story](#the-3-minute-story)
- [The walkthrough — tab by tab](#the-walkthrough--tab-by-tab)
  - [Tab 0 — Overview (Home)](#tab-0--overview-home)
  - [Tab 1 — Intake](#tab-1--intake)
  - [Tab 2 — Risk Score](#tab-2--risk-score)
  - [Tab 3 — Maintenance Rx (Plan)](#tab-3--maintenance-rx-plan)
  - [Tab 4 — AI Coach](#tab-4--ai-coach)
  - [Tab 5 — Trajectory](#tab-5--trajectory)
  - [Tab 6 — References](#tab-6--references)
  - [Tab 7 — Cohort (clinician mode only)](#tab-7--cohort-clinician-mode-only)
- [Cross-cutting features](#cross-cutting-features-the-stuff-between-the-tabs)
- [The architectural choices that show clinical-tech judgment](#the-architectural-choices-that-show-clinical-tech-judgment)
- [Anticipated probes — answers loaded](#anticipated-probes--answers-loaded)
- [The one-liner closer](#the-one-liner-closer)

---

## The 30-second pitch

> *"ReboundIQ is a clinical decision-support tool that predicts and prevents the weight rebound after GLP-1 therapy. Novo Nordisk's GLP-1 portfolio — Wegovy, Ozempic, Saxenda, the new pill, CagriSema — has reshaped obesity care. But the literature is now clear that patients regain about 75% of the weight they lost within a year of stopping. The tool stratifies each patient by 12-month rebound risk, generates a portfolio-aware maintenance plan, and gives them an AI coach that knows their actual risk drivers. It's the missing predictive layer Novo doesn't own yet."*

---

## The 3-minute story

**The problem.** GLP-1 receptor agonists work brilliantly for weight loss during therapy. The hard truth is what happens after. The STEP 1 extension (Wilding, 2022, PMID 35441470) showed that within one year of stopping semaglutide, patients regained **11.6 percentage points** of lost weight. The Lancet eClinicalMedicine 2026 meta-regression locked the rate constant at 0.0302/wk with a plateau at **75.3% regained**. And 40–60% of the weight lost on therapy is **lean mass** — which fat returns faster than, creating a real sarcopenic-obesity risk after cessation.

**Why this matters to Novo.** Wegovy alone is a $20B+ category. CagriSema is filed. The Wegovy pill just launched. **The commercial story depends on durability of clinical outcomes** — not just acute weight loss. Every patient who rebounds becomes an argument against the entire category, every payer who sees rebound data tightens reimbursement. Novo's current digital infrastructure (WeGoTogether, the subscription program with Ro/WW/LifeMD) is **reactive** — it's check-in apps and reminders. There's no predictive layer.

**What's in the white space.** A tool that:
1. **Predicts** each patient's rebound risk before cessation, from real clinical inputs.
2. **Personalizes** a maintenance plan tied to Novo's actual lineup (not generic lifestyle coaching).
3. **Coaches** the patient through the maintenance window with an LLM that knows their risk drivers.
4. **Stratifies** populations for the clinician — who can stop talking and start triaging.

**What we built.** ReboundIQ. Eight-tab clinical-decision-support tool. Editorial-Novo brand. Full EN/HE bilingual. Print-ready referral letter + signed maintenance contract. Claude Sonnet 4.6 powering the coach via a server-side Vercel Edge function (the API key never reaches the browser). Every clinical threshold cites a PMID/DOI in code. Single-file HTML artifact — runs offline, deploys to Vercel with one click.

---

## The walkthrough — tab by tab

For each: **what it is → the problem it solves → how you demo it → the 1–2 insights to drop**.

### Tab 0 — Overview (Home)

**What it is.** The landing page. Editorial hero, three pull-quote statistics, the "opportunity" section, six feature cards (one per following tab), a closing CTA. It's the pitch deck rendered as the front of the app.

**The problem it solves.** You can drop someone into this URL and they'll grasp the entire premise in 30 seconds without you saying anything. The pitch has to live on the page, not in your speech.

**How you demo it.**
- Read the hero out loud: *"Predict the rebound before it happens. Personalize the maintenance to prevent it."*
- Point at the three stat tiles. **The trick:** each source label ("STEP 1 extension · Wilding 2022", "Lancet eClinicalMedicine 2026", "MedCentral 2025 review") **is a clickable link** — click it and the app jumps to the References tab and scrolls to that bibliography entry. Massive trust signal for a clinical audience.
- Scroll to the "opportunity" split. Two paragraphs you don't need to read — they capture: *(a) Novo's portfolio works; (b) the missing predictive layer is what we built.*
- The six feature cards (01–06) are the tour map. Each is one tab.

**Insights to drop.**
1. *"Every number you see on this page cites a published source. Medical-affairs reviewers test the citation system; we wired it in from day one."*
2. *"The home page itself does the work of an exec summary slide — by the time we're on the second tab, the audience already understands why this exists."*

---

### Tab 1 — Intake

**What it is.** A 7-section clinical form: Patient · Current therapy · Treatment response · Comorbidities & labs · Body composition · Lifestyle · Preferences. Plus **three demo profile cards** at the top that load realistic patient data in one click.

**The problem it solves.** A clinician's time is the rate-limiter. You can't ask them to type 25 fields to see your tool. The demo profiles let you go from "blank screen" to "fully populated patient" in one click — which is what makes the rest of the demo possible.

**How you demo it.**
- "**Profile A** is a 38-year-old woman on Wegovy pill — strong early response, regular resistance training, high protein, low rebound risk. **Profile B** is a 52-year-old man on Wegovy SC — CVD, T2D, planning to stop. **Profile C** is a 45-year-old woman on Saxenda — cost-constrained, low protein, smokes, wants to stop. Three distinct stories."
- Click Profile A. **Watch the toast** in the bottom-center: *"Profile A loaded · 19 fields populated."*
- Scroll the form briefly. Show the depth: BMI auto-computes, % loss at week 20 auto-computes, lean mass % auto-computes from DXA inputs.

**Insights to drop.**
1. *"Notice the form labels themselves: 'Week-20 weight anchors early response, citing STEP 1 Wilding 2022.' We embed clinical reasoning into the form — not just data collection but data justification."*
2. *"Three profiles intentionally span the risk spectrum — A is low, B is moderate, C is high. They're load-bearing test fixtures for the engines downstream."*
3. *"There's a **Share assessment** button at the bottom. The URL encodes the full state. A clinician can email a colleague a link that restores the exact case — no server, no database, no PHI leakage."*

---

### Tab 2 — Risk Score

**What it is.** The headline tab. Takes the intake data and returns the **probability of holding ≥5% loss at 12 months post-cessation**. Plus a transparent breakdown of every contribution to the score.

**The problem it solves.** Clinicians distrust black-box AI. Novo medical affairs even more so. We needed a predictive layer that's *defensibly* derived — every weight in the formula traced to a published source.

**How you demo it.**
- Load Profile A (already loaded from Intake). The hero shows **95% · Low rebound risk**. Read the interpretation paragraph: *"Strong odds of holding this patient's loss with maintenance support."*
- Point at the **"Formula anchors" box** on the right: Baseline 48.2% · Plateau 75.3% · Rate 0.030/wk. *"Three constants. Every one cites STEP 1 extension or Lancet 2026 meta-regression."*
- Scroll to **"All contributions"**. Show the bar chart — each row is one input from intake that moved the score. Green bars = pushed up, red bars = pushed down. Each carries the citation key in code.
- Go back to Intake, load Profile C. Return to Risk Score → now **2% · High rebound risk**, with three modifiable drivers called out: low adherence, insufficient protein, no resistance training. *"This is the 'what would you fix first' answer the clinician needs."*

**Insights to drop.**
1. *"This is **not** machine learning. It's an evidence-anchored deterministic formula. Every weight is cited. I made that choice because a real Novo medical-affairs reviewer would catch fake ML in one minute. We over-promise nothing."*
2. *"Inputs you leave blank don't penalize the score — they just don't appear in the breakdown. This is the **honest-scope contract**. We never penalize for missing data."*
3. *"The sarcopenic-obesity warning at the top fires when measured lean mass is <55% OR a lifestyle heuristic triggers (>10% loss + protein <0.8 + no resistance training). That's the MedCentral 2025 review made visible."*

---

### Tab 3 — Maintenance Rx (Plan)

**What it is.** The portfolio-aware prescription layer. Takes the risk score + patient preferences + comorbidities and outputs: **strategy** (continue / bridge / slow taper / quick taper / maintain), a **week-by-week taper schedule** for the specific agent, three **lifestyle floors** (protein, resistance, sleep), a **follow-up cadence**, **red flags** that should escalate, and contextual **alerts**.

**The problem it solves.** Generic lifestyle advice helps no one. The clinician needs a *specific* plan she can write into a chart note. We generate one.

**How you demo it.**
- With Profile B loaded: the strategy banner shows **"Continue indefinitely"** — because Profile B has CVD, which is a cardiometabolic indication that overrides the patient's intent to stop. *"This is clinically correct. SELECT-era evidence: continued GLP-1 use reduces CV risk independent of weight outcome."*
- The **AgentLineup** below — six chip-cards for Novo's full lineup, current agent (Wegovy SC) underlined navy. *"This is the visual asset that makes 'portfolio-aware' true. The whole pitch hinges on this widget."*
- Now show Profile A → **"Maintain at lowest effective dose"** (low risk, not planning to stop). Profile C → **"Continue indefinitely"** because MASH triggers it.
- To show the **bridge** path: in Intake, load Profile C, uncheck MASH → return to Plan. Now strategy is **"Bridge to oral Wegovy"**. The lineup shows current Saxenda *and* dashed-blue Wegovy pill as the bridge target. The taper table renders the OASIS 4 protocol: 1.5 → 4 → 9 → 25 mg/day over 16 weeks.
- Scroll to the **lifestyle floors**. Three stat tiles: **Protein 1.6 g/kg/day** (~157g for this patient), **Resistance 3 sessions/wk**, **Sleep 7+ hr**. *"The protein floor automatically lifts to 1.6 if the sarcopenic guard triggers, OR age ≥65, OR class II+ BMI with ≥10% loss. Conditional logic, not generic numbers."*
- **Print referral & contract** button — opens the print preview with two clean pages: the clinician handover (with auto-derived ICD-10 codes) and the patient maintenance contract (with empty checkboxes and signature lines).

**Insights to drop.**
1. *"Strategy precedence is hard-coded: cardiometabolic indication overrides everything. You don't taper a Wegovy patient with CVD just because they ask — and the tool refuses to recommend it. It tells the clinician what the evidence actually supports."*
2. *"The bridge protocol — Wegovy injectable → oral Wegovy via OASIS 4's titration — is the most clinically useful feature for the cost-of-injection conversation. Patients who can't afford the shot but won't tolerate cessation get a 12-month protection window on the pill."*
3. *"The two printed pages aren't placeholders. They're the artifact the clinician hands to the patient at the end of the visit. Designed for actual workflow."*

---

### Tab 4 — AI Coach

**What it is.** A conversational coach powered by **Claude Sonnet 4.6**. Personalized to the patient's actual risk drivers + plan + lifestyle targets. Hosted via a **Vercel Edge function** — the Anthropic API key lives on the server and never reaches the browser.

**The problem it solves.** The clinician sees the patient for 15 minutes every 8 weeks. The maintenance program lives in the other 1,400 hours per visit cycle. Patients need someone to talk to between visits — and a generic chatbot is a liability.

**How you demo it.**
- With a profile loaded, click the Coach tab. The welcome message references the patient's actual bucket and strategy: *"Your risk score puts you in the High rebound risk bracket, and the strategy is 'Continue indefinitely.'"*
- Show the disclosure card: *"Your messages go to Anthropic via the server. The coach won't recommend dose changes. If you mention thoughts of self-harm, the coach hands off to a hotline."* — say *"these aren't suggestions to the model, they're hard server-side guardrails."*
- Click a quickstart: *"I'm tempted to stop my injections."* Watch the typing dots, wait for Claude's response. *"Notice the coach references the patient's actual drivers — high MASH risk, current dose — not generic advice."*

**Insights to drop.**
1. *"The patient context is whitelisted and sanitized server-side before it ever reaches Claude. Drug names, lab acronyms, ICD-10 codes — all preserved. Zero-width Unicode injection attacks — all stripped. This is defense-in-depth that costs nothing and closes real attack surfaces."*
2. *"The red-flag detection — for self-harm and disordered-eating language — runs **on the server, before forwarding to Anthropic**. The model never sees those messages. The hotline canned response goes back directly. This is the load-bearing safety contract."*
3. *"Dosing-change requests are refused at the system-prompt level AND the response is sanitized. Belt and suspenders. The coach is a maintenance coach, not a primary care provider. That boundary is the entire reason the FDA wouldn't have a heart attack about this."*

---

### Tab 5 — Trajectory

**What it is.** An interactive SVG chart that plots two futures: **the rebound curve if the patient does nothing**, and **the attenuated curve if they follow the plan**. The patient drags an adherence slider and watches the second curve bend.

**The problem it solves.** Numbers don't move patients. **Pictures move patients.** A 75% rebound plateau is abstract; a curve climbing from 78kg to 91kg over 12 months is visceral.

**How you demo it.**
- With Profile B loaded. The chart shows two curves: dashed red (do-nothing — rebounds to ~115 kg over 52 weeks) and solid navy (follow-plan at 70% adherence — stays around 100 kg).
- **Drag the adherence slider.** Watch both curves morph smoothly (animated `d` attribute transitions). At 0% adherence, the navy curve overlaps the dashed red. At 100%, it stays nearly flat.
- Three outcome stat tiles update in lockstep: weight at 52 weeks for do-nothing, weight at 52 weeks for follow-plan, total weight lost on therapy.

**Insights to drop.**
1. *"The math is the actual Lancet 2026 nonlinear meta-regression. Rate constant 0.0302 per week, plateau at 75.3%. The plan attenuation tops out at 85% — anchored to STEP 1 extension's 48% maintenance baseline. **We never claim 100% prevention.** That's the discipline."*
2. *"This is the slide the clinician uses to motivate the patient. 'Look — at 70% adherence, you keep most of what you earned. At 30%, you lose it all.' It's a conversation starter, not a black-box prediction."*

---

### Tab 6 — References

**What it is.** Editorial bibliography. Nine cited sources spanning the rebound literature, the lean-mass science, OASIS 4 (Wegovy pill), Novo's existing digital programs (WeGoTogether, Smartpatient), and the Claude model card.

**The problem it solves.** Every Novo medical-affairs reviewer needs to verify the science. Every clinician wants to know where you got the numbers. We make the citations a first-class part of the product, not a footnote.

**How you demo it.**
- Show how each entry has the standard apparatus: authors · year · journal · title · 1-line anchor · PMID/PMCID/DOI/PII · live external link.
- Click "Open source" on the STEP 1 entry — opens PubMed in a new tab.
- The Lancet 2026 entry has a "forthcoming" tag — *"because the meta-regression DOI was a placeholder; we used the published PII instead. Honesty matters more than completeness."*

**Insights to drop.**
1. *"Every threshold, every weight, every cited constant in the code carries the PMID/DOI key matching one of these entries. The auditor I ran caught a placeholder DOI in the meta-regression entry; we flagged it 'forthcoming' rather than fake a real one."*
2. *"This is where you defend the science. The home stats link here. The risk score weights cite here. The plan rationales cite here. It's the connective tissue."*

---

### Tab 7 — Cohort *(clinician mode only)*

**What it is.** A sortable table of **10 synthetic patients** spanning the entire risk spectrum. Each row shows ID, age, sex, current agent, weeks on therapy, % loss, **P(hold)**, and **strategy**. Distribution band on top: how many Low / Moderate / High in the panel.

**The problem it solves.** The clinician-side pitch isn't just "help one patient." It's "stratify a panel of 200 GLP-1 patients and tell me which 30 need the most attention." This is the population-management story that integrated health systems and payers actually buy.

**How you demo it.**
- Switch the audience toggle to Clinician (if not already). Cohort tab appears.
- Show the distribution band: *"4 low risk, 3 moderate, 3 high. That's a typical clinic panel."*
- Click the column headers — sort by risk, by age, by agent, by % loss. *"This is how a clinic intake nurse triages a Monday morning panel."*
- Click any high-risk row (PT-003 or PT-009) — the patient loads, app jumps to Risk Score, toast confirms.

**Insights to drop.**
1. *"This is the story Novo would pitch to **payers, not just clinicians**. 'You're paying for 200 patients on Wegovy. Here's the predictive layer that tells you which 50 need maintenance program enrollment.' Population economics."*
2. *"The patients are synthetic — labeled clearly — but the agent mix, comorbidity distribution, and outcome variability are clinically realistic. Don't show this to anyone without the 'synthetic' caveat."*

---

## Cross-cutting features (the stuff between the tabs)

These are the design choices that make ReboundIQ feel like a *product*, not a demo.

### The audience toggle (Clinician ↔ Patient)

Top-right of the navy utility strip. Flips the framing across every tab. **Cohort tab is hidden in patient mode.** The closing-CTA on home swaps between "Stratify your panel" (HCP) and "Hold what you earned" (patient).

**What to say:** *"One state model, two audiences. The clinician and the patient see the same data but with different framing. Switching modes doesn't reset state — it just re-frames the existing assessment."*

### The language toggle (EN ↔ עברית)

Same row. Full RTL with proper Hebrew typography. Numbers force LTR inside Hebrew prose (the `.num` class). Clinical terms stay English in both languages — Wegovy, Ozempic, HbA1c, ICD-10, MASH — matching how Hebrew-speaking clinicians actually write notes.

**What to say:** *"This isn't just 'translate the strings.' It's full RTL with editorial Hebrew typography. The Heebo font, proper bidi handling, the engines themselves return localized rationales. Novo Israel is one of their five biggest markets — the cost of building bilingual from day one is far smaller than retrofitting."*

### The Print pipeline

From the Plan tab → Print referral & contract → two-page output:
- **Page 1**: clinician handover letter. Patient summary, assessment with citation, strategy + rationale, taper table, lifestyle prescription, follow-up cadence + visits + labs, escalation triggers, **auto-derived ICD-10 codes** (E66.x by BMI band, E11.9 for T2D, K76.81 for MASH, etc.), signature blocks for signing + receiving clinician.
- **Page 2**: patient maintenance contract. "My non-negotiables" checklist (protein, RT, sleep, follow-up, honesty clause), patient signature, clinician witness signature.

**What to say:** *"This is the artifact the clinician hands the patient at end of visit. The CSS uses `.screen-only` / `.print-only` / `.no-print` classes to swap UI seamlessly. Inline styles on the print components — print engines drop the global stylesheet, so we make print output deterministic across Chrome, Firefox, Safari."*

### The Share assessment URL

In Intake footer. Encodes the patient state to a base64 URL hash, copies to clipboard. Anyone clicking the link gets the assessment restored, lands on Risk Score, sees a confirmation toast.

**What to say:** *"Zero server persistence. The URL itself carries the state. A clinician can email a colleague the full assessment for a consult. No backend, no PHI in a database, no compliance footprint. Pure client-side share."*

### The AI Coach safety architecture

Three layers:
1. **Server-side red-flag refusal.** Phrases like 'suicide,' 'binge,' 'purge,' 'starve myself' — even obfuscated with zero-width Unicode — are detected before forwarding to Anthropic. Hotline canned response goes back. Patient never gets coached into the topic.
2. **System-prompt boundaries.** The model is instructed to refuse all dosing-change requests, identify itself as a Claude-powered AI coach if asked, never fabricate trial names or citations.
3. **Response sanitization.** Output is stripped of bidi/control/zero-width chars + role-marker injection patterns (`system:` / `user:` / `assistant:`).

**What to say:** *"The coach is the riskiest feature in any pharma AI deployment. We treated it like a regulated surface from day one. Three independent gates: pre-detection, model-side, post-sanitization. Defense in depth."*

---

## The architectural choices that show clinical-tech judgment

These are the **probing questions** an interview would test. Have crisp answers.

### Q: "Why a deterministic formula instead of ML?"
**A:** Three reasons.
1. **Honest scope** — there's no labeled GLP-1 cessation dataset large enough to train a credible predictor. Anyone claiming ML for this would be over-promising.
2. **Defensibility** — every weight in our formula cites a published study. Medical-affairs reviewers can audit the math. ML black boxes can't survive that audit.
3. **Patient trust** — a clinician explaining "the model said 78%" loses; "the literature says adherence below 60% reduces maintenance probability by 20 percentage points" wins. Transparency *is* the trust.

### Q: "Why zero persistence?"
**A:** Two reasons. Privacy posture matches the concept-demo positioning — no PHI infrastructure to defend. And it forces honesty about what the tool actually is: a decision-support overlay, not an EMR. Persistence would change the entire compliance footprint. The URL-hash share lets clinicians collaborate without a backend.

### Q: "Why single-file HTML React?"
**A:** Three reasons.
1. **Offline-capable** — opens in any browser via `file://`. No deploy needed for the dev path. Critical for clinician trust on day one.
2. **Auditability** — one file to read. A pharma security review can read the entire app in a sitting.
3. **Deploy simplicity** — one static file + one Edge function. Vercel handles it without a container, a build server, or a database.

For production we **pre-compile the JSX via esbuild** (drops Babel from the bundle, tightens CSP to remove `'unsafe-eval'`). Dev path stays single-file; production gets the tightened CSP.

### Q: "Why a Vercel Edge function for the coach?"
**A:** The Anthropic API key can never reach the browser. The Edge function is the proxy — it holds the key server-side, gates the request with origin check + rate limit + size cap + content-type check, sanitizes inputs, runs the red-flag detector, calls Anthropic, sanitizes the response, never echoes upstream errors. Ten gates total. If the model misbehaves, the server is the airlock.

### Q: "How accurate is the risk score?"
**A:** *"It's not predictive in the ML sense — it's a transparent translation of published findings into a per-patient summary. The baseline is STEP 1 extension's 48.2% maintenance rate. The deltas come from adherence, early response, protein, resistance training, sleep — every weight cited. If new literature changes a weight, we change the code AND update the References tab. The formula is **falsifiable** in a way ML predictors aren't."*

### Q: "Why CagriSema marked 'filed' instead of full taper?"
**A:** It's not FDA-approved yet. The chip shows up because the portfolio is the portfolio, but the taper schedule is a one-row placeholder pending the approved label. Better to display a known-incomplete entry honestly than fabricate a taper that turns out wrong on approval.

### Q: "What if the AI coach gives bad advice?"
**A:** Three defenses. The system prompt forbids dosing changes and fabrication. The server sanitizes output for prompt-injection markers. Red-flag phrases hand off to a hotline before reaching Anthropic. **The coach is in-scope for: motivation, adherence, side-effect tolerance, plan explanation. It's out-of-scope for: anything a clinician should answer.** Boundaries are the entire reason this is shippable.

### Q: "Why Hebrew?"
**A:** Novo Israel is one of Novo Nordisk's most successful affiliates. The cost of bilingual-from-day-one is small if you architect for it; the cost of retrofit is enormous. We did it right: keyed dictionary for static UI, inline `T(en, he)` for engine output, proper RTL CSS, Heebo display font.

---

## Anticipated probes — answers loaded

**"Did you write the code yourself?"**
> *"I designed every clinical engine — the risk score weights, the strategy decision tree, the lifestyle floor logic — and worked through the implementation with Claude Code, a coding assistant. The clinical logic is mine. The code patterns are reviewed by me and audited by both a security and design auditor (Agent Smith and Agent Gourges) before each phase landed. Every threshold cites a study I personally read."*

**"How long did this take?"**
> *"Eight phases across about three weeks. Each phase ended with a working, verifiable artifact. The latest is the post-audit polish — Tier 2 through 5 — and a production build pipeline that tightens the CSP."*

**"What's the next step?"**
> *"Deploy to Vercel with the Anthropic key, run the live coach end-to-end, then decide whether to take it from concept demo to a real partnership pitch. The architecture is production-ready: hardened Edge function, audited CSP, real bilingual, real print. What's left is content — more demo profiles, deeper integration with the actual Novo subscription program, real cohort data from a partner clinic."*

**"How does this differ from Noom or Calibrate or WeightWatchers?"**
> *"Those are lifestyle programs. ReboundIQ is **portfolio-aware predictive maintenance**. It assumes the patient is already on a Novo agent and asks the harder question: how do we keep what they earned. We don't compete with Noom — we sit one layer above it, telling clinicians who needs the program and why."*

**"What's the IP story?"**
> *"It's a concept demonstration of a workflow. The clinical engines are publicly cited science. The brand identity is Novo's. The architecture is mine. If Novo wanted to license or acquire the workflow design, that's a conversation about IP. If they wanted to build their own version using this as a brief, that's another conversation. Either is a win for the patient."*

**"What would you change?"**
> *"Three things. First, a partnership with a real clinic to get cohort data — synthetic patients only carry so far. Second, integrate the Novo subscription program checkout flow into the AI Coach. Third, FHIR push so the maintenance plan lands in the EMR. Each is a 2-month project."*

---

## The one-liner closer

If they ask you to summarize at the end:

> *"ReboundIQ takes Novo's biggest commercial risk — patients regaining the weight they lost — and turns it into a tool that predicts who will rebound, prescribes how to prevent it, and coaches them through the year. Every number cites a published study. The AI never makes dosing decisions. And it ships as a single HTML file that runs offline. That combination — clinically defensible, brand-aligned, technically minimal — is what Novo's medical affairs team has been quietly asking for."*

---

## Quick-reference cheat sheet

### The three constants you should be able to recite cold

| Constant | Value | Source |
|---|---|---|
| Baseline P(hold ≥5% loss) at 12 mo | **48.2%** | STEP 1 extension · Wilding 2022 · PMID 35441470 |
| Plateau of regained weight | **75.3%** | Lancet eClinicalMedicine 2026 meta-regression |
| Regain rate constant | **0.0302 / week** (half-life 23 wks) | same source |

### The three demo profiles

| Profile | Age / Sex | Agent | Outcome | What it shows |
|---|---|---|---|---|
| **A** | 38 F | Wegovy pill | 95% hold · Low risk | Maintain at lowest effective dose |
| **B** | 52 M | Wegovy SC | ~60% hold · Moderate | Continue (CVD overrides cessation intent) |
| **C** | 45 F | Saxenda | 2% hold · High risk | Continue (MASH) — uncheck MASH to demo Bridge |

### The five strategies the Plan generates

1. **Continue indefinitely** — cardiometabolic indication (CVD / MASH / poorly controlled T2D) overrides everything
2. **Bridge to oral Wegovy** — high risk + planning to stop + (oral preference OR cost-constrained), uses OASIS 4 titration
3. **Strongly recommend continuation** — high risk + planning to stop + no oral/cost reason
4. **Slow taper (16–24 weeks)** — moderate risk + planning to stop
5. **Quick taper (12 weeks)** — low risk + planning to stop
6. **Maintain at lowest effective dose** — default for anyone not planning to stop

### The four lifestyle prescription triggers

The protein floor lifts from 1.4 g/kg/day to **1.6 g/kg/day** if **any** of:
- Sarcopenic flag triggered (measured lean mass <55%, OR lifestyle heuristic: >10% loss + protein <0.8 + RT <1)
- Age ≥65 (anabolic resistance)
- Baseline BMI ≥35 + ≥10% loss (class II+ obesity with rapid loss)

Resistance training: 3 sessions/week default, **4 if sarcopenic**.
Sleep: 7+ hours/night, always.

### The eight tabs in order

1. **Overview** — pitch deck rendered as front page
2. **Intake** — 7-section form + 3 demo profiles
3. **Risk Score** — P(hold) + driver chart + sarcopenic warning
4. **Maintenance Rx** — strategy + AgentLineup + taper + lifestyle + follow-up + red flags + print
5. **AI Coach** — Claude Sonnet 4.6 via Vercel Edge, personalized to risk drivers
6. **Trajectory** — dual-curve SVG + adherence slider + outcome stats
7. **References** — editorial bibliography with anchor IDs
8. **Cohort** *(clinician-only)* — 10 synthetic patients, sortable, click-to-load

### The honest-scope contract (the most important slide)

- Risk score is an **evidence-anchored deterministic formula**, NOT machine learning
- Every weight cites a PMID/DOI in code
- Inputs left blank don't penalize the score
- Max plan attenuation is **85%** (never claim 100% prevention)
- AI coach refuses all dosing changes
- Server-side red-flag detection intercepts self-harm / ED language before Anthropic ever sees it
- Zero server persistence — state lives in URL hash or browser memory only

---

*Created with Claude Code · Read your CLAUDE.md and DEMO.md for the technical architecture. This file is the human-readable interview prep version.*
