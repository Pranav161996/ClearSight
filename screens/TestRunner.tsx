import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useSessionStore, type TestResults } from '../store/session';
import InstructionCard from '../components/InstructionCard';
import AcuityTest from './AcuityTest';
import ContrastTest from './ContrastTest';
import ColourTest from './ColourTest';

type Props = NativeStackScreenProps<RootStackParamList, 'TestRunner'>;

const LANDOLT_C_VIDEO = require('../assets/Landolt C Ring Test.mov');

const FINAL_STEP = 12;
const TOTAL_TESTS = 5;

// Maps step index → "Test N of 5" label. Instruction-card steps (including
// the new Landolt-C video at index 1) are intentionally absent so the step
// bar only shows on actual test screens.
const TEST_STEP_TO_NUMBER: Record<number, number> = {
  2: 1,
  4: 2,
  6: 3,
  8: 4,
  10: 5,
};

export default function TestRunnerScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const setTestResults = useSessionStore((s) => s.setTestResults);

  // Created up front so the asset is decoded and the first frame is ready
  // by the time the user reaches step 1. Creating the player inside
  // InstructionCard caused a visible ~1s blank-frame delay because the
  // hook only ran when that step mounted.
  const landoltPlayer = useVideoPlayer(LANDOLT_C_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
            "Cover your other eye completely with your palm, do not press.\n\n" +
            "Hold the phone at arm's length (~60cm)."
          }
          ctaText="Start →"
          onReady={advance}
        />
      );
      break;
    case 1:
      content = (
        <InstructionCard
          media={{ type: 'video', player: landoltPlayer }}
          title="How the Landolt C test works"
          body={
            "You'll see a ring with a small gap on top.\n\n" +
            "On the bottom wheel, tap the segment that points to the same side as the gap.\n\n" +
            "Go with your first instinct — don't overthink it."
          }
          ctaText="Got it →"
          onReady={advance}
        />
      );
      break;
    case 2:
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
    case 3:
      content = (
        <InstructionCard
          icon="👁️"
          title="Now test your LEFT eye"
          body={
            "Switch — cover your other eye with your palm.\n\n" +
            "Same task: tap where the gap is on the bottom ring.\n\n" +
            "Keep the phone at arm's length."
          }
          ctaText="Start →"
          onReady={advance}
        />
      );
      break;
    case 4:
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
    case 5:
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
    case 6:
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
    case 7:
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
    case 8:
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
    case 9:
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
    case 10:
      content = (
        <ColourTest
          onComplete={(r) => {
            setResult('colourErrors', r);
            advance();
          }}
        />
      );
      break;
    case 11:
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
