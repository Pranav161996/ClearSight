import type { DiopterRange } from '../store/session';

export type { DiopterRange };

interface DiopterEntry {
  estimate: number;
  min: number;
  max: number;
}

const DISTANCE_DIOPTER_MAP: Record<number, DiopterEntry> = {
  0.8: { estimate: 0.0, min: 0.0, max: 0.0 },
  1.0: { estimate: -0.25, min: -0.5, max: 0.0 },
  1.25: { estimate: -0.5, min: -1.0, max: -0.5 },
  1.5: { estimate: -0.75, min: -2.0, max: -1.0 },
  2.0: { estimate: -1.0, min: -2.5, max: -1.5 },
  3.0: { estimate: -2.0, min: -3.0, max: -2.5 },
  4.0: { estimate: -3.0, min: -4.0, max: -2.5 },
  6.0: { estimate: -4.0, min: -5.0, max: -2.5 },
  10.0: { estimate: -5.5, min: -7.0, max: -3.0 },
};

const NEAR_DIOPTER_MAP: Record<number, DiopterEntry> = {
  0.8: { estimate: 0.0, min: 0.0, max: 0.0 },
  1.0: { estimate: 0.0, min: 0.0, max: 0.0 },
  1.25: { estimate: 0.25, min: 0.0, max: 0.25 },
  1.5: { estimate: 0.5, min: 0.25, max: 0.5 },
  2.0: { estimate: 0.5, min: 0.25, max: 0.75 },
  3.0: { estimate: 1.0, min: 0.75, max: 1.5 },
  4.0: { estimate: 1.5, min: 1.25, max: 2.0 },
  6.0: { estimate: 2.0, min: 1.5, max: 2.5 },
  10.0: { estimate: 2.5, min: 2.0, max: 3.0 },
};

const NEAR_THRESHOLD_CM = 35;
const CAP_MAR = 10;

// AcuityTest only ever calls estimateDiopters with a MAR taken from
// LEVELS_BASE, and every LEVELS_BASE entry is a key in both maps. So a
// direct lookup is always sufficient — no interpolation, which guarantees
// we only ever return the quarter-dioptre values defined in the maps.
// The nearest-key fallback below is purely defensive in case a future
// caller passes an off-table MAR.
export function estimateDiopters(
  mar: number,
  distanceCm: number,
): DiopterRange {
  const map =
    distanceCm <= NEAR_THRESHOLD_CM ? NEAR_DIOPTER_MAP : DISTANCE_DIOPTER_MAP;

  const entry = map[mar] ?? nearestEntry(map, mar);
  const capped = mar >= CAP_MAR;

  return {
    estimate: entry.estimate,
    min: entry.min,
    max: entry.max,
    capped,
  };
}

function nearestEntry(
  map: Record<number, DiopterEntry>,
  mar: number,
): DiopterEntry {
  const keys = Object.keys(map).map(Number);
  let nearest = keys[0];
  let bestDelta = Math.abs(mar - nearest);
  for (const k of keys) {
    const d = Math.abs(mar - k);
    if (d < bestDelta) {
      nearest = k;
      bestDelta = d;
    }
  }
  return map[nearest];
}
