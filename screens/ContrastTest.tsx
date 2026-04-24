import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSessionStore } from '../store/session';
import LandoltRing from '../components/LandoltRing';
import ResponseRing from '../components/ResponseRing';
import CalibrationRequired from '../components/CalibrationRequired';

// Pelli–Robson uses a 0.15 log-unit step between successive contrast levels.
// We stop the staircase at 0.044 (logCS 1.36) because anything fainter is
// at or below the perceptual floor for most people on a phone screen and
// produced a "ring is invisible" UX even with normal vision. Cutoffs are
// scaled to this measurement range:
//   logCS >= 1.20  (contrast <= 0.063)  -> normal
//   logCS >= 0.85  (contrast <= 0.141)  -> mild loss
//   logCS <  0.85                        -> significant loss
export type ContrastFlag = 'normal' | 'mild' | 'significant';

export interface ContrastTestProps {
  /**
   * Receives the clinical flag, the achieved log CS, and a flag indicating
   * whether the patient saw every level (i.e. true threshold may be lower
   * than what we could measure).
   */
  onComplete: (
    contrastFlag: ContrastFlag,
    logCS: number,
    atLimit: boolean,
  ) => void;
  /** Viewing distance in cm. Used to compute angular size of the target. */
  distanceCm?: number;
}

// 10 levels in 0.15 log-unit steps from 1.0 down to 0.044. The final level
// (logCS 1.36) is the practical floor for a hand-held phone screen.
const CONTRASTS = [
  1.0, 0.71, 0.5, 0.35, 0.25, 0.18, 0.125, 0.088, 0.062, 0.044,
];

// 2 c/deg target; Pelli–Robson uses larger letters but a Landolt C at this
// angular size keeps acuity confounds out of a contrast measurement.
const TARGET_ANGULAR_DEG = 2.0;
const FEEDBACK_MS = 300;

const FEEDBACK_COLORS = {
  correct: '#dff5e0',
  wrong: '#fde0e0',
} as const;

const logCS = (contrast: number): number =>
  +(-Math.log10(contrast)).toFixed(2);

const randomGap = (prev?: number): number => {
  let next: number;
  do {
    next = Math.floor(Math.random() * 8);
  } while (next === prev);
  return next;
};

function contrastToFlag(contrast: number | null): ContrastFlag {
  if (contrast === null) return 'significant';
  const cs = -Math.log10(contrast);
  if (cs >= 1.2) return 'normal';
  if (cs >= 0.85) return 'mild';
  return 'significant';
}

export default function ContrastTest({
  onComplete,
  distanceCm = 60,
}: ContrastTestProps) {
  const pxPerMm = useSessionStore((s) => s.pxPerMm);

  const [contrastIndex, setContrastIndex] = useState(0);
  // Two trials at the current level decide it: 2 correct -> advance,
  // 2 wrong -> finalise. Counters are independent and only reset on advance.
  const [correctAtLevel, setCorrectAtLevel] = useState(0);
  const [wrongAtLevel, setWrongAtLevel] = useState(0);
  const [lowestPassed, setLowestPassed] = useState<number | null>(null);
  const [gapPosition, setGapPosition] = useState(() => randomGap());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const responseSize = useMemo(() => {
    const { width } = Dimensions.get('window');
    return Math.min(width - 48, 320);
  }, []);

  // Constant angular subtense → physical size scales with viewing distance.
  const targetDiamMm = useMemo(() => {
    const distanceMm = distanceCm * 10;
    return Math.tan((TARGET_ANGULAR_DEG * Math.PI) / 180) * distanceMm;
  }, [distanceCm]);

  const finalize = (passedContrast: number | null, atLimit: boolean) => {
    const cs = passedContrast === null ? 0 : logCS(passedContrast);
    onComplete(contrastToFlag(passedContrast), cs, atLimit);
  };

  const advanceLevel = (passedContrast: number) => {
    const nextIndex = contrastIndex + 1;
    if (nextIndex >= CONTRASTS.length) {
      // Saw every level we can render; report best-measurable threshold
      // with the at-limit flag so downstream UI can disclose this.
      finalize(passedContrast, true);
      return;
    }
    setLowestPassed(passedContrast);
    setContrastIndex(nextIndex);
    setCorrectAtLevel(0);
    setWrongAtLevel(0);
  };

  const handleSelect = (selected: number) => {
    if (feedback !== null) return;

    const isCorrect = selected === gapPosition;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    timeoutRef.current = setTimeout(() => {
      if (isCorrect) {
        const nextCorrect = correctAtLevel + 1;
        if (nextCorrect >= 2) {
          advanceLevel(CONTRASTS[contrastIndex]);
        } else {
          setCorrectAtLevel(nextCorrect);
        }
      } else {
        const nextWrong = wrongAtLevel + 1;
        if (nextWrong >= 2) {
          finalize(lowestPassed, false);
          return;
        }
        setWrongAtLevel(nextWrong);
      }

      setGapPosition(randomGap(gapPosition));
      setFeedback(null);
    }, FEEDBACK_MS);
  };

  if (!pxPerMm || pxPerMm <= 0) {
    return <CalibrationRequired />;
  }

  const stimulusBackground =
    feedback === 'correct'
      ? FEEDBACK_COLORS.correct
      : feedback === 'wrong'
      ? FEEDBACK_COLORS.wrong
      : 'transparent';

  const currentContrast = CONTRASTS[contrastIndex];
  const stepsTotal = CONTRASTS.length;
  const stepNumber = contrastIndex + 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eye}>Both eyes open</Text>
        <Text style={styles.instruction}>Can you see the gap? Tap it.</Text>
        <Text style={styles.progress}>
          Contrast step {stepNumber} of {stepsTotal} · log CS{' '}
          {logCS(currentContrast).toFixed(2)}
        </Text>
      </View>

      <View
        style={[styles.stimulusArea, { backgroundColor: stimulusBackground }]}
      >
        <LandoltRing
          diameterMm={targetDiamMm}
          gapPosition={gapPosition}
          contrast={currentContrast}
          pxPerMm={pxPerMm}
        />
      </View>

      <View style={styles.responseArea}>
        <ResponseRing size={responseSize} onSelect={handleSelect} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  eye: {
    fontSize: 13,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 6,
  },
  progress: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
  },
  stimulusArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
});
