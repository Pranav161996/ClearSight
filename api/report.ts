import OpenAI from 'openai';
import { useSessionStore, formatRange } from '../store/session';

export type Urgency = 'urgent' | 'soon' | 'routine' | 'optional';
export type FindingFlag = 'pass' | 'amber' | 'red';
export type Eye = 'right' | 'left' | 'both' | null;

export interface Finding {
  test: string;
  result: string;
  plain: string;
  flag: FindingFlag;
  eye: Eye;
}

export interface Report {
  summary: string;
  findings: Finding[];
  recommendation: string;
  urgency: Urgency;
  patternNote: string;
}

const SYSTEM_PROMPT = `You are a vision screening assistant. Translate mobile eye 
test results into a clear report for a lay user.

Rules:
- Never state a diagnosis. Use "suggests", "may indicate", "consistent with"
- Always recommend professional follow-up
- Urgent referral if: inter-eye acuity gap > 2 Snellen lines,
  contrast significantly reduced, colour errors >= 4
- The payload already contains pre-formatted diopter range strings
  like '-1.5 to -2.5 D'. Use these exact strings verbatim when
  writing findings and summary. Do NOT recompute, reformat, or
  paraphrase the diopter values. Copy them exactly as given.
- If a payload eye has a non-null cappedNote, the test reached its
  measurement limit. Add the cappedNote text to that eye's finding
  plain text and set that finding's flag to 'red' regardless of
  other values.
- Combine distance AND near vision results to identify patterns:
    poor distance + good near = myopia
    good distance + poor near = hyperopia or age-related reading-focus loss
    poor both = significant refractive error
- patient.age (in years, may be null) provides context. Reading-focus loss
  is normal and expected from the early 40s onward. If age >= 40 and near
  vision is reduced while distance is fine, frame this as the typical
  age-related shift rather than a problem. Do not output any clinical
  labels (no "presbyopia", "hyperopia", etc.) — describe behaviour only.
- Timeframe: urgent=1 week, soon=1 month, routine=6 months, optional=when convenient

findings array must have one entry PER EYE PER TEST where relevant.
So distance vision = 2 entries (right eye, left eye).
Near vision = 1 entry (both eyes tested together).
Contrast and colour = 1 entry each (combined).

For the contrast finding, use the payload's contrast.logCS as the result
string (e.g. "log CS 1.65"). Interpret the flag:
  'normal'      -> typical contrast sensitivity
  'mild'        -> slight reduction, may notice in low light
  'significant' -> meaningful loss; mention possible causes (cataract,
                   refractive error, optic nerve issues) without diagnosing.
If contrast.atLimit is true, add a sentence noting the patient saw every
level we could render and the true threshold may be even lower.

Each finding object shape:
{
  test: string,        // e.g. "Distance Vision — Right Eye"
  result: string,      // e.g. "6/12"
  plain: string,       // one plain English sentence
  flag: 'pass'|'amber'|'red',
  eye: 'right'|'left'|'both'|null
}

For the two distance vision entries, explicitly compare them:
if the two eyes differ by 2 or more Snellen lines,
set the worse eye flag to 'red' and note the asymmetry in plain text.
This is clinically significant and should be highlighted.

Output valid JSON only:
{
  "summary": "2 sentence plain English summary",
  "findings": [
    { "test": "Distance Vision — Right Eye", "result": "6/12", "plain": "...", "flag": "amber", "eye": "right" }
  ],
  "recommendation": "string",
  "urgency": "urgent|soon|routine|optional",
  "patternNote": "one sentence on distance vs near pattern in plain English (no clinical labels)"
}`;

const VALID_URGENCY: Urgency[] = ['urgent', 'soon', 'routine', 'optional'];
const VALID_FLAGS: FindingFlag[] = ['pass', 'amber', 'red'];

const FALLBACK_REPORT: Report = {
  summary:
    'We were unable to generate a personalised report from your test results. Your raw measurements are saved on this device.',
  findings: [],
  recommendation:
    'Please share your raw test results with a qualified optometrist for a proper assessment.',
  urgency: 'routine',
  patternNote: 'Pattern analysis unavailable — please consult a professional.',
};

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

function normaliseEye(value: unknown): Eye {
  if (value === 'right' || value === 'left' || value === 'both') return value;
  return null;
}

function sanitise(parsed: Partial<Report> | null): Report {
  if (!parsed) return FALLBACK_REPORT;
  const urgency =
    parsed.urgency && VALID_URGENCY.includes(parsed.urgency)
      ? parsed.urgency
      : 'routine';
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map((f) => ({
        test: typeof f?.test === 'string' ? f.test : '',
        result: typeof f?.result === 'string' ? f.result : '',
        plain: typeof f?.plain === 'string' ? f.plain : '',
        flag:
          f?.flag && VALID_FLAGS.includes(f.flag as FindingFlag)
            ? (f.flag as FindingFlag)
            : 'amber',
        eye: normaliseEye((f as { eye?: unknown })?.eye),
      }))
    : [];
  return {
    summary:
      typeof parsed.summary === 'string' ? parsed.summary : FALLBACK_REPORT.summary,
    findings,
    recommendation:
      typeof parsed.recommendation === 'string'
        ? parsed.recommendation
        : FALLBACK_REPORT.recommendation,
    urgency,
    patternNote:
      typeof parsed.patternNote === 'string'
        ? parsed.patternNote
        : FALLBACK_REPORT.patternNote,
  };
}

const CAPPED_NOTE =
  'Measurement limit reached. The actual prescription may be stronger than indicated; an in-person clinical refraction is needed for an accurate value.';

export async function generateReport(): Promise<Report> {
  try {
    if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      console.warn('EXPO_PUBLIC_OPENAI_API_KEY missing; returning fallback');
      return FALLBACK_REPORT;
    }

    const { testResults, age } = useSessionStore.getState();

    console.log(
      '[ClearSight] raw testResults from store:\n' +
        JSON.stringify(testResults, null, 2),
    );

    const payload = {
      patient: { age },
      rightEye: {
        distanceSnellen: testResults.rightEyeSnellen,
        distanceDiopterRange: formatRange(testResults.rightEyeRange),
        cappedNote: testResults.rightEyeRange.capped ? CAPPED_NOTE : null,
      },
      leftEye: {
        distanceSnellen: testResults.leftEyeSnellen,
        distanceDiopterRange: formatRange(testResults.leftEyeRange),
        cappedNote: testResults.leftEyeRange.capped ? CAPPED_NOTE : null,
      },
      nearVision: {
        snellen: testResults.nearSnellen,
        diopterRange: formatRange(testResults.nearRange),
        cappedNote: testResults.nearRange.capped ? CAPPED_NOTE : null,
        note: 'tested both eyes together at 30cm',
      },
      contrast: {
        flag: testResults.contrastFlag,
        logCS: testResults.contrastLogCS,
        atLimit: testResults.contrastAtLimit,
      },
      colourErrors: testResults.colourErrors,
    };

    console.log(
      '[ClearSight] payload to OpenAI:\n' + JSON.stringify(payload, null, 2),
    );

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      console.warn('OpenAI returned empty content');
      return FALLBACK_REPORT;
    }

    console.log('[ClearSight] raw OpenAI response:\n' + raw);

    let parsed: Partial<Report> | null = null;
    try {
      parsed = JSON.parse(raw) as Partial<Report>;
    } catch (parseErr) {
      console.warn('Failed to parse OpenAI JSON', parseErr);
      return FALLBACK_REPORT;
    }

    const report = sanitise(parsed);
    console.log(
      '[ClearSight] sanitised report:\n' + JSON.stringify(report, null, 2),
    );
    return report;
  } catch (err) {
    console.warn('generateReport failed', err);
    return FALLBACK_REPORT;
  }
}
