import { create } from 'zustand';

export interface DiopterRange {
  min: number;
  max: number;
  estimate: number;
  capped: boolean;
}

const EMPTY_RANGE: DiopterRange = {
  min: 0,
  max: 0,
  estimate: 0,
  capped: false,
};

export interface TestResults {
  rightEyeSnellen: string;
  leftEyeSnellen: string;
  rightEyeRange: DiopterRange;
  leftEyeRange: DiopterRange;
  nearSnellen: string;
  nearRange: DiopterRange;
  contrastFlag: 'normal' | 'mild' | 'significant';
  contrastLogCS: number | null;
  contrastAtLimit: boolean;
  colourErrors: number;
}

interface SessionState {
  age: number | null;
  pxPerMm: number;
  calibrationConfidence: 'high' | 'low';
  // True once the user has been through the acuity warm-up at least once
  // in this session. Subsequent acuity tests skip the practice round.
  hasCompletedAcuityPractice: boolean;
  testResults: TestResults;
  setAge: (value: number | null) => void;
  setPxPerMm: (value: number) => void;
  setCalibrationConfidence: (value: 'high' | 'low') => void;
  setHasCompletedAcuityPractice: (value: boolean) => void;
  setTestResults: (results: Partial<TestResults>) => void;
  reset: () => void;
}

const initialTestResults: TestResults = {
  rightEyeSnellen: '',
  leftEyeSnellen: '',
  rightEyeRange: { ...EMPTY_RANGE },
  leftEyeRange: { ...EMPTY_RANGE },
  nearSnellen: '',
  nearRange: { ...EMPTY_RANGE },
  contrastFlag: 'normal',
  contrastLogCS: null,
  contrastAtLimit: false,
  colourErrors: 0,
};

export const useSessionStore = create<SessionState>((set) => ({
  age: null,
  pxPerMm: 0,
  calibrationConfidence: 'low',
  hasCompletedAcuityPractice: false,
  testResults: { ...initialTestResults },
  setAge: (value) => set({ age: value }),
  setPxPerMm: (value) => set({ pxPerMm: value }),
  setCalibrationConfidence: (value) => set({ calibrationConfidence: value }),
  setHasCompletedAcuityPractice: (value) =>
    set({ hasCompletedAcuityPractice: value }),
  setTestResults: (results) =>
    set((state) => ({
      testResults: { ...state.testResults, ...results },
    })),
  reset: () =>
    set({
      age: null,
      pxPerMm: 0,
      calibrationConfidence: 'low',
      hasCompletedAcuityPractice: false,
      testResults: { ...initialTestResults },
    }),
}));

function signed(n: number): string {
  // 2-decimal precision so quarter-dioptre values (0.25, 0.50, 0.75)
  // display verbatim instead of rounding to clinically meaningless tenths
  // like 0.3 or 0.8.
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

export function formatRange(r: DiopterRange): string {
  if (r.capped) return `${signed(r.min)} D or stronger`;
  if (r.estimate === 0) return 'Within normal range';
  return `${signed(r.min)} to ${signed(r.max)} D`;
}
