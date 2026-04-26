import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useSessionStore } from '../store/session';
import LandoltRing from '../components/LandoltRing';
import ResponseRing from '../components/ResponseRing';
import CalibrationRequired from '../components/CalibrationRequired';
import { estimateDiopters } from '../lib/acuity';
import type { DiopterRange } from '../store/session';

export interface AcuityTestProps {
  eye: 'left' | 'right' | 'both';
  distanceCm?: number;
  label?: string;
  onComplete: (snellen: string, range: DiopterRange) => void;
}

const LEVELS_BASE = [
  { denom: 60, mar: 10 },
  { denom: 36, mar: 6 },
  { denom: 24, mar: 4 },
  { denom: 18, mar: 3 },
  { denom: 12, mar: 2 },
  { denom: 9, mar: 1.5 },
  { denom: 7.5, mar: 1.25 },
  { denom: 6, mar: 1.0 },
  { denom: 4.8, mar: 0.8 },
];

const TOTAL_TRIALS = 10;
const MAX_LEVEL = LEVELS_BASE.length - 1;
const FEEDBACK_MS = 300;
const REVERSALS_TO_AVERAGE = 6;
const PRACTICE_TRIALS = 3;
const PRACTICE_LEVEL = 0;

const startLevelFor = (distanceCm: number) =>
  distanceCm <= 35 ? 0 : 2;

const FEEDBACK_COLORS = {
  correct: '#dff5e0',
  wrong: '#fde0e0',
} as const;

const randomGap = (prev?: number) => {
  let next: number;
  do {
    next = Math.floor(Math.random() * 8);
  } while (next === prev);
  return next;
};

function findReversals(history: number[]): number[] {
  const changes: number[] = [];
  let prev: number | undefined;
  for (const lvl of history) {
    if (lvl !== prev) {
      changes.push(lvl);
      prev = lvl;
    }
  }
  const reversals: number[] = [];
  for (let i = 1; i < changes.length - 1; i++) {
    const dir1 = changes[i] - changes[i - 1];
    const dir2 = changes[i + 1] - changes[i];
    if (dir1 * dir2 < 0) {
      reversals.push(changes[i]);
    }
  }
  return reversals;
}

const computeDiamMm = (mar: number, distanceCm: number) => {
  const testDistanceM = distanceCm / 100;
  const angleRad = (mar / 60) * (Math.PI / 180);
  const gapMm = testDistanceM * Math.tan(angleRad) * 1000;
  return gapMm * 5;
};

const distanceInstruction = (distanceCm: number) => {
  if (distanceCm <= 35) {
    return 'Hold phone at comfortable reading distance (~30cm)';
  }
  return "Hold phone at arm's length (~60cm)";
};

export default function AcuityTest({
  eye,
  distanceCm = 60,
  label,
  onComplete,
}: AcuityTestProps) {
  const pxPerMm = useSessionStore((s) => s.pxPerMm);
  const hasCompletedAcuityPractice = useSessionStore(
    (s) => s.hasCompletedAcuityPractice,
  );
  const setHasCompletedAcuityPractice = useSessionStore(
    (s) => s.setHasCompletedAcuityPractice,
  );

  const levels = useMemo(
    () =>
      LEVELS_BASE.map((l) => ({
        ...l,
        diamMm: computeDiamMm(l.mar, distanceCm),
      })),
    [distanceCm],
  );

  // Three-phase flow:
  //   practice   - warm-up trials. Feedback shown, results discarded.
  //   transition - brief screen telling the user the real test starts now.
  //   real       - scored trials. Staircase state lives only here.
  // Subsequent acuity tests in the same session skip straight to 'real'
  // because the user already knows the task.
  const [phase, setPhase] = useState<'practice' | 'transition' | 'real'>(
    () => (hasCompletedAcuityPractice ? 'real' : 'practice'),
  );
  const [practiceCount, setPracticeCount] = useState(0);
  const [trialNumber, setTrialNumber] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(() =>
    startLevelFor(distanceCm),
  );
  const [levelHistory, setLevelHistory] = useState<number[]>([]);
  const [levelTrials, setLevelTrials] = useState<boolean[]>([]);
  // True until the user gets a single scored trial wrong. Used to grant a
  // "perfect run" bonus: 10-for-10 jumps straight to the table ceiling
  // instead of being averaged down by the staircase trajectory.
  const [allCorrect, setAllCorrect] = useState(true);
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

  const handleSkipPractice = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHasCompletedAcuityPractice(true);
    setPhase('real');
    setPracticeCount(PRACTICE_TRIALS);
    setGapPosition(randomGap(gapPosition));
    setFeedback(null);
  };

  const handleStartReal = () => {
    setHasCompletedAcuityPractice(true);
    setPhase('real');
    setGapPosition(randomGap(gapPosition));
    setFeedback(null);
  };

  const handleSelect = (selected: number) => {
    if (feedback !== null) return;

    const isCorrect = selected === gapPosition;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    if (phase === 'practice') {
      timeoutRef.current = setTimeout(() => {
        const nextCount = practiceCount + 1;
        setPracticeCount(nextCount);
        if (nextCount >= PRACTICE_TRIALS) {
          // Auto-promote to the transition screen. Real-test state is
          // never touched here so nothing carries over from practice.
          setHasCompletedAcuityPractice(true);
          setPhase('transition');
          setFeedback(null);
          return;
        }
        setGapPosition(randomGap(gapPosition));
        setFeedback(null);
      }, FEEDBACK_MS);
      return;
    }

    const usedLevel = currentLevel;
    const nextTrial = trialNumber + 1;
    const nextHistory = [...levelHistory, usedLevel];
    const nextAllCorrect = allCorrect && isCorrect;
    if (!isCorrect && allCorrect) setAllCorrect(false);

    const updatedLevelTrials = [...levelTrials, isCorrect];
    const correctCount = updatedLevelTrials.filter(Boolean).length;
    const wrongCount = updatedLevelTrials.length - correctCount;

    let nextLevel = usedLevel;
    let nextLevelTrials = updatedLevelTrials;
    if (correctCount >= 2) {
      nextLevel = Math.min(usedLevel + 1, MAX_LEVEL);
      nextLevelTrials = [];
    } else if (wrongCount >= 2) {
      nextLevel = Math.max(usedLevel - 1, 0);
      nextLevelTrials = [];
    }

    timeoutRef.current = setTimeout(() => {
      if (nextTrial === TOTAL_TRIALS) {
        let avgIndex: number;
        if (nextAllCorrect) {
          // Perfect run override: every scored trial correct → reward with
          // the table ceiling (6/4.8). The staircase trajectory would
          // otherwise drag the average down because we run out of trials
          // before reaching the top.
          avgIndex = MAX_LEVEL;
        } else {
          const reversals = findReversals(nextHistory);
          if (reversals.length >= 2) {
            const last = reversals.slice(-REVERSALS_TO_AVERAGE);
            avgIndex = Math.round(
              last.reduce((a, b) => a + b, 0) / last.length,
            );
          } else {
            const last4 = nextHistory.slice(-4);
            avgIndex = Math.round(
              last4.reduce((a, b) => a + b, 0) / last4.length,
            );
          }
        }
        const threshold = levels[avgIndex];
        const snellen = `6/${threshold.denom}`;
        const range = estimateDiopters(threshold.mar, distanceCm);
        onComplete(snellen, range);
        return;
      }

      setLevelHistory(nextHistory);
      setLevelTrials(nextLevelTrials);
      setTrialNumber(nextTrial);
      setCurrentLevel(nextLevel);
      setGapPosition(randomGap(gapPosition));
      setFeedback(null);
    }, FEEDBACK_MS);
  };

  if (!pxPerMm || pxPerMm <= 0) {
    return <CalibrationRequired />;
  }

  if (phase === 'transition') {
    return (
      <View style={styles.container}>
        <View style={styles.transitionWrap}>
          <Text style={styles.transitionEmoji}>✅</Text>
          <Text style={styles.transitionTitle}>Trial round complete</Text>
          <Text style={styles.transitionBody}>
            Nice — you've got the idea. The actual test starts now and your
            answers from this point will be scored. Take your time on each one.
          </Text>
          <Pressable
            onPress={handleStartReal}
            style={styles.transitionButton}
          >
            <Text style={styles.transitionButtonText}>Start real test →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const eyeLabel =
    eye === 'left' ? 'Left eye' : eye === 'right' ? 'Right eye' : 'Both eyes';
  const headerLabel = label ? `${label} — ${eyeLabel}` : eyeLabel;
  const stimulusBackground =
    feedback === 'correct'
      ? FEEDBACK_COLORS.correct
      : feedback === 'wrong'
      ? FEEDBACK_COLORS.wrong
      : 'transparent';

  const isPractice = phase === 'practice';
  const displayedLevel = isPractice ? PRACTICE_LEVEL : currentLevel;
  // First practice trial only: highlight the matching segment so the user
  // sees what "tap the gap" means. Hides for trials 2 and 3 so they actually
  // try it themselves.
  const showHint = isPractice && practiceCount === 0 && feedback === null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eye}>{headerLabel}</Text>
        <Text style={[styles.instruction, { textAlign: 'center' }]}>
          {isPractice
            ? 'Trial round — See the top ring? Mark the corresponding gap on the lower ring'
            : 'See the top ring? Mark the corresponding gap on the lower ring'}
        </Text>
        {isPractice && (
          <Text style={styles.practiceNote}>
            These trials don't count — they're just to get you familiar.
          </Text>
        )}
        <Text style={styles.distance}>{distanceInstruction(distanceCm)}</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progress}>
            {isPractice
              ? `Trial round ${Math.min(practiceCount + 1, PRACTICE_TRIALS)} of ${PRACTICE_TRIALS}`
              : `Question ${Math.min(trialNumber + 1, TOTAL_TRIALS)} of ${TOTAL_TRIALS}`}
          </Text>
          {isPractice && (
            <Pressable
              onPress={handleSkipPractice}
              hitSlop={8}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Skip trial</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View
        style={[styles.stimulusArea, { backgroundColor: stimulusBackground }]}
      >
        <LandoltRing
          diameterMm={levels[displayedLevel].diamMm}
          gapPosition={gapPosition}
          contrast={1}
          pxPerMm={pxPerMm}
        />
      </View>

      <View style={styles.responseArea}>
        {showHint && (
          <Text style={styles.hintCaption}>
            👆 The gap is highlighted in green — tap that segment.
          </Text>
        )}
        <ResponseRing
          size={responseSize}
          onSelect={handleSelect}
          hintIndex={showHint ? gapPosition : null}
        />
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
  distance: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  progress: {
    fontSize: 13,
    color: '#888',
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  skipText: {
    fontSize: 13,
    color: '#1a73e8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  practiceNote: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  hintCaption: {
    fontSize: 13,
    color: '#34A853',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  transitionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  transitionEmoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  transitionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  transitionBody: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  transitionButton: {
    backgroundColor: '#000',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 10,
  },
  transitionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingBottom: 48,
  },
});
