# ReboundIQ — demo walkthrough

A ~5 minute golden-path script for showing ReboundIQ to a clinician, a Novo affiliate stakeholder, or a recording. Time stamps are rough; the goal is rhythm, not a stopwatch.

---

## 0:00 — open

Open `index.html` in Chrome (`file://` works) or hit the Vercel preview URL. You land on the **Overview** page.

Say what it is: *"Novo Nordisk's GLP-1 portfolio has reshaped obesity care, but the rebound after cessation threatens to undo the wins. ReboundIQ is a concept tool that predicts each patient's 12-month rebound probability and prescribes a portfolio-aware maintenance plan — clinician-facing or patient-facing."*

Point out the three pull-quote stats: **11.6 pp regained · 75.3% rebound plateau · 40–60% lean mass**. Every number is cited on the References tab.

## 0:30 — switch audience

Hit the **Clinician / Patient** toggle in the top utility strip. The Cohort tab in the main nav appears and disappears. Pop back to Clinician.

## 0:50 — intake

Click **Compute risk** in the hero, or click **Intake** in the main nav.

*"The risk score needs about 25 numbers — but you can load a demo patient in one click."*

Click **Profile A · Low rebound risk**. Watch the entire form populate — sex chip, agent chip (Wegovy pill), all the labs, lifestyle, comorbidities. Scroll through it briefly so the audience sees the depth: 7 numbered sections, auto-derived BMI, auto-derived % loss at week 20, auto-derived lean mass percentage.

Hit **Compute risk** at the bottom.

## 1:30 — risk score (Profile A)

Lands on **Risk Score**. *"95% probability of holding ≥5% loss at 12 months. Low rebound risk. The strong early response, high adherence, high protein, regular resistance training all stack."*

Scroll down to the **All contributions** chart. Each contribution carries a citation. Hover the bar widths.

*"This is not a black-box ML model. It's a transparent, evidence-anchored formula. Every weight is tied to STEP 1 extension, the Lancet 2026 meta-regression, or the MedCentral sarcopenic-obesity review."*

## 2:00 — trajectory

Click **View trajectory**. The dual-curve chart loads. Two curves: the dashed red "do nothing" curve plateauing at the regain ceiling, and the solid navy "follow plan" curve.

*"This is the actual published rebound trajectory from the Lancet meta-regression — half-life 23 weeks, plateau at 75% of lost weight regained. The plan curve attenuates the regain proportional to adherence."*

**Drag the adherence slider** from 0% → 100%. Watch the navy curve bend down toward the "Today" line. Lock at 70% for the demo.

## 2:40 — maintenance plan

Click **Generate maintenance plan**. Lands on **Maintenance Rx**.

For Profile A: strategy is **Maintain at lowest effective dose**, single ongoing step, quarterly follow-up, no alerts.

*"For a low-risk patient who isn't planning to stop, the plan is durability — keep the agent, reinforce the lifestyle floors, re-evaluate annually."*

Now go back to Intake (top nav) and load **Profile C · High rebound risk** instead. Walk back through the same path: Risk Score now shows ~2% hold, three modifiable drivers (low adherence, insufficient protein, no resistance training). Plan tab now shows **Continue indefinitely** because MASH is a continuation indication that overrides cessation intent. Two alerts fire — MASH continuation favored, patient is cost-constrained.

## 3:40 — AI coach

Click **Open AI coach**. The coach welcomes the patient by name-of-bracket: *"Your risk score puts you in the high rebound risk bracket, and the strategy is continue indefinitely…"*

*"The coach is Claude Sonnet 4.6, hosted via a Vercel Edge function. The patient's plan and risk drivers are passed as structured context, so the answers are personal, not generic. The Anthropic API key never touches the browser."*

Click a quickstart pill: **"I'm tempted to stop my injections."** Wait for the typing dots, see the personalized response.

Show the safety guardrails verbally: *"If a patient mentions self-harm or disordered eating, the server intercepts before forwarding to Claude and returns a hotline message. The coach also refuses any dosing-change request — that goes back to the clinician."*

## 4:20 — print

From the Plan tab, click **Print referral & contract**. The browser print dialog opens with **two clean pages**:

1. Page 1 — clinician handover letter: patient summary, assessment with citation, strategy + rationale, weekly taper table, lifestyle prescription, follow-up cadence, escalation triggers, ICD-10 codes, signature blocks
2. Page 2 — patient maintenance contract: "My non-negotiables" with empty checkboxes, an honesty clause, signature blocks for patient and clinician witness

*"This is the artifact that closes the loop with the primary care provider, the dietitian, the PT — and the patient signs the contract before they leave the visit."*

## 4:50 — cohort view

Cancel the print dialog. Click **Cohort** in the main nav. Synthetic 10-patient panel.

*"This is the population-management story Novo would pitch to payers and integrated health systems. Ten patients, stratified by 12-month rebound risk."*

Click any column header to sort — risk, age, agent, weeks on therapy, % loss. Click a high-risk patient row (PT-003 or PT-009) to load them into the assessment in one click.

## 5:00 — close

*"Single-file artifact, runs offline, full audit trail of cited evidence, server-side AI coach with strict hardening — ready to harden into a real product if Novo wanted to take it forward."*

---

## Things to mention if asked

- **Privacy.** Zero persistence. No localStorage, no cookies, no database. Everything dies on tab close. The coach's conversation history is in React memory only.
- **CSP.** Strict — `connect-src 'self'` only. The browser never talks to Anthropic directly; the Vercel Edge function (`api/coach.js`) holds the key and proxies.
- **Honest scope.** The risk score is an *evidence-anchored deterministic formula*, not ML. Every weight cites a PMID/DOI. The UI labels it that way — we don't claim "AI predicted" because we'd be overclaiming.
- **Sarcopenic-obesity guard.** The plan auto-lifts the protein floor to 1.6 g/kg/day under three conditions: measured low lean mass, age ≥65, or class II BMI with ≥10% loss. RT target lifts to 4 sessions/week if measured lean mass is low.
- **OASIS 4 bridge.** When a high-risk patient on Wegovy SC wants off the injectable but has no cardio indication, the plan generates a bridge titration to oral Wegovy 25 mg/d (1.5 → 4 → 9 → 25 over 16 weeks) — buys a year of protection.
- **Why no CagriSema taper?** It's filed with FDA but not yet approved. The agent shows up in the chip list marked "Filed" but the taper schedule is a one-row placeholder pending the approved label.

## Setup notes for the live coach

To make the coach actually respond:

1. Deploy to Vercel — the `vercel.json` and `api/coach.js` are ready.
2. Set `ANTHROPIC_API_KEY` in Vercel project env (Production + Preview).
3. Optional: `ALLOWED_ORIGINS` if demoing from a different domain.

Without the key, the coach UI loads correctly but every send returns `NOT_CONFIGURED` with a friendly explanation banner. That's the expected local-dev state.

## Known scope cuts (mention if asked)

- No real ML training. Intentional — the formula is honest about its sources.
- No bilingual (EN/HE) yet. Door left open via the `STRINGS = {}` pattern from Octo-perio if a Novo Israel pass becomes worthwhile.
- No wearable / EHR integration. The intake form takes pasted numbers — clean separation from the data-collection problem.
- No real cohort. The 10 patients are synthetic, clearly labeled.
