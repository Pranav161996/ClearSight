import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useSessionStore, type TestResults } from '../store/session';
import InstructionCard from '../components/InstructionCard';
import AcuityTest from './AcuityTest';
import ContrastTest from './ContrastTest';
import ColourTest from './ColourTest';

type Props = NativeStackScreenProps<RootStackParamList, 'TestRunner'>;

const FINAL_STEP = 11;
const TOTAL_TESTS = 5;

const TEST_STEP_TO_NUMBER: Record<number, number> = {
  1: 1,
  3: 2,
  5: 3,
  7: 4,
  9: 5,
};

export default function TestRunnerScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const setTestResults = useSessionStore((s) => s.setTestResults);

  const advance = () => setStep((s) => s + 1);
  const setResult = <K extends keyof TestResults>(
    key: K,
    value: TestResults[K],
  ) => setTestResults({ [key]: value } as Partial<TestResults>);

  useEffect(() => {
    if (step >= FINAL_STEP) {
      navigation.replace('Results');
    }
  }, [step, navigation]);

  const testNumber = TEST_STEP_TO_NUMBER[step];
  const stepLabel = testNumber ? `Test ${testNumber} of ${TOTAL_TESTS}` : '';

  let content: React.ReactNode = null;

  switch (step) {
    case 0:
      content = (
        <InstructionCard
          icon="👁️"
          title="Let's test your RIGHT eye"
          body={
            "Cover your LEFT eye completely with your palm.\n\n" +
            "You'll see a ring with a gap. Tap the segment on the bottom ring that matches where the gap is.\n\n" +
            "Hold the phone at arm's length (~60cm)."
          }
          ctaText="Start →"
          onReady={advance}
        />
      );
      break;
    case 1:
      content = (
        <AcuityTest
          key="distance-right"
          eye="right"
          distanceCm={60}
          label="Distance Vision"
          onComplete={(snellen, range) => {
            setResult('rightEyeSnellen', snellen);
            setResult('rightEyeRange', range);
            advance();
          }}
        />
      );
      break;
    case 2:
      content = (
        <InstructionCard
          icon="👁️"
          title="Now test your LEFT eye"
          body={
            "Switch — cover your RIGHT eye with your palm.\n\n" +
            "Same task: tap where the gap is on the bottom ring.\n\n" +
            "Keep the phone at arm's length."
          }
          ctaText="Start →"
          onReady={advance}
        />
      );
      break;
    case 3:
      content = (
        <AcuityTest
          key="distance-left"
          eye="left"
          distanceCm={60}
          label="Distance Vision"
          onComplete={(snellen, range) => {
            setResult('leftEyeSnellen', snellen);
            setResult('leftEyeRange', range);
            advance();
          }}
        />
      );
      break;
    case 4:
      content = (
        <InstructionCard
          icon="📱"
          title="Near Vision Test"
          body={
            "Use BOTH eyes for this one — no need to cover either eye.\n\n" +
            "Bring the phone closer, to a comfortable reading distance (~30cm).\n\n" +
            "Same task: tap where the gap is."
          }
          ctaText="Start →"
          onReady={advance}
        />
      );
      break;
    case 5:
      content = (
        <AcuityTest
          key="near-both"
          eye="both"
          distanceCm={30}
          label="Near Vision"
          onComplete={(snellen, range) => {
            setResult('nearSnellen', snellen);
            setResult('nearRange', range);
            advance();
          }}
        />
      );
      break;
    case 6:
      content = (
        <InstructionCard
          icon="🌫️"
          title="Contrast Sensitivity"
          body={
            "The ring will gradually fade until it almost disappears.\n\n" +
            "Tap where you see the gap for as long as you can. It's okay if you lose it — that's the point.\n\n" +
            "Make sure your brightness is at MAXIMUM before continuing."
          }
          ctaText="Brightness is max →"
          onReady={advance}
        />
      );
      break;
    case 7:
      content = (
        <ContrastTest
          distanceCm={60}
          onComplete={(flag, cs, atLimit) => {
            setResult('contrastFlag', flag);
            setResult('contrastLogCS', cs);
            setResult('contrastAtLimit', atLimit);
            advance();
          }}
        />
      );
      break;
    case 8:
      content = (
        <InstructionCard
          icon="🎨"
          title="Colour Vision Check"
          body={
            "You'll see a circle of coloured dots with a number hidden inside.\n\n" +
            "Tap the number you see — or 'Nothing' if you can't make one out.\n\n" +
            "Don't spend too long on each one, go with your first instinct."
          }
          ctaText="Start →"
          onReady={advance}
        />
      );
      break;
    case 9:
      content = (
        <ColourTest
          onComplete={(r) => {
            setResult('colourErrors', r);
            advance();
          }}
        />
      );
      break;
    case 10:
      content = (
        <InstructionCard
          icon="✅"
          title="All done!"
          body={
            "Great work. We're now analysing your responses.\n\n" +
            "Your personalised vision report will be ready in a few seconds."
          }
          ctaText="See my results →"
          onReady={advance}
        />
      );
      break;
    default:
      content = null;
  }

  if (!content) return null;

  return (
    <View style={styles.container}>
      {stepLabel ? (
        <View style={styles.stepBar}>
          <Text style={styles.stepText}>{stepLabel}</Text>
        </View>
      ) : null}
      <View style={styles.content}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  stepBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
});
