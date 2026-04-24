# ClearSight — One Pager

A 10-minute at-home vision screening that turns any smartphone into a calibrated
acuity, contrast, and colour-vision tester, then talks the results back in
plain English.

---

## Problem Statement

**Eye tests have a top-of-funnel problem.** People only get their vision
checked when they already know something is wrong — a blurry road sign, a
headache from a laptop, a child squinting at the board. By the time they
walk into an optical store, the prescription has already drifted.

- Baseline: only ~30% of Indian adults have had a formal refraction in the
  last two years; for the 60+ cohort the gap is bigger.
- The "should I bother going to a store?" decision is made on gut feel, with
  no objective signal in between "everything's fine" and "I need an
  appointment."
- Existing apps either need a printed chart, a partner reading letters
  aloud, or a Snellen chart that fails for non-literate users.

ClearSight gives that intermediate signal — a quantified screening you can
run on your sofa, with a result that is concrete enough to act on.

---

## Your Solution

ClearSight runs a 5-test screening in roughly ten minutes:

- **Calibrate** the screen to physical millimetres using an on-screen
  reference (credit-card slider). Every subsequent stimulus is rendered in
  true mm, not pixels.
- **Distance + near acuity** using a Landolt-C adaptive staircase. We chose
  Landolt rings over Snellen letters because they are language- and
  literacy-independent — the user just taps where the gap is.
- **Pelli–Robson-style contrast sensitivity** in 0.15 log-unit steps with
  on-the-fly gamma correction so the rendered luminance contrast actually
  matches the nominal value.
- **Ishihara-style colour vision** check using randomised plates from a
  validated set.
- **GPT-4o report generation** turns the raw measurements into a per-eye
  finding card, an inter-eye asymmetry warning, an estimated quarter-dioptre
  prescription range, an urgency tier, and a one-line plain-English summary.

**AI / LLM technique:** structured **tool-use** with the OpenAI Chat
Completions API in `response_format: 'json_object'` mode. The prompt locks
the model into a strict JSON schema, the app then sanitises the response
against allowlists (urgency, flags, eye) and falls back to a deterministic
"raw measurements only" report on any error. The model never invents
numbers — diopter ranges and contrast log-CS are passed in pre-formatted and
the prompt forbids re-paraphrasing them.

---

## Tech Stack

- **Mobile:** Expo + React Native + TypeScript, Zustand for session state,
  React Navigation native stack.
- **Stimulus rendering:** `react-native-svg` for Landolt rings and the
  8-segment response ring; gamma-corrected sRGB pixel mapping for accurate
  Weber contrast.
- **Adaptive psychophysics:** transformed up-down staircase with a 2-of-3
  confirmation rule per level, reversal-based threshold averaging, and
  no-repeat gap positions. 10 scored trials per eye plus a 3-trial guided
  warm-up shown only to first-time users.
- **Diopter inference:** clinically-tuned MAR → diopter lookup tables (one
  for distance at 60 cm, one for near at 30 cm), all values snapped to
  quarter-dioptre steps to match how prescriptions are actually written.
- **AI layer:** OpenAI GPT-4o via `openai` SDK, JSON-mode structured output,
  Zod-style runtime sanitisation, deterministic fallback report. The
  abstraction is model-agnostic — the same payload contract can be served
  from AWS Bedrock (Claude / Llama) or an in-house SageMaker endpoint with
  a one-file swap.
- **Configuration:** Expo public env for API keys, `.env` git-ignored, no
  PII leaves the device beyond the screening payload (age + raw scores).

---

## Business Impact

ClearSight is positioned as a **top-of-funnel acquisition tool for the
optical retail business**, not a replacement for in-store refraction.

- **Store footfall:** a user who sees "your right eye reads 6/12, estimated
  range −1.00 to −2.00 D" is materially more likely to book an in-store
  test than one who is just told "you might want to get checked." 
- **Home try-on assist:** the same screening can be tie into driving at-home test visit + frames consult. This unlocks the elderly and mobility-restricted segment, who are otherwise underserved.
- **Cohort intelligence:** the (anonymous) screening data closes the loop
  on our diopter-to-acuity mapping. Every store-confirmed prescription
  paired with a prior ClearSight score makes the next user's estimate
  better — a moat that compounds with footfall.

---

## Assumptions & Limitations

**Assumptions**

- Screen calibration is approximately accurate. We use a physical reference
  (credit card edge) for the slider and clamp render size to physical mm,
  but a user holding the device closer than the prompted distance will
  still get a softer estimate.
- Ambient lighting is "indoor normal." Brightness is set to maximum at the
  contrast-test step; we do not currently sense actual lux.
- The user is honest with the eye-cover prompt for monocular distance
  tests. There is no enforcement.

**Limitations**

- Diopter ranges are estimates derived from a 60 cm test, not a 6 m test.
  We surface the range, not a single number, and every report ends in
  "consult an optometrist for an exact prescription."
- The MAR → diopter mapping is calibrated against published norms but has
  not yet been validated against a paired in-store refraction dataset
  (this is the planned post-launch work).
- No astigmatism axis, no binocular fusion, no peripheral field — this is
  a screening tool, not a clinical refraction.

**To go to production tomorrow:** ship as-is to the Lenskart app behind a
"Quick eye check" entry point. Run a 4-week paired study where every user
who does both the screening and a store refraction within 30 days
contributes a (predicted_range, true_prescription) data point. After
~5,000 paired points, retrain the lookup tables and tighten the ranges.
Beyond that, the AI report layer is already model-swappable — if the
strategic call is to host on AWS Bedrock or a fine-tuned SageMaker model
for cost or sovereignty reasons, the change is a single adapter file.
