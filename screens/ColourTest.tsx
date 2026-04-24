import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  type ImageSourcePropType,
} from 'react-native';

export interface ColourTestProps {
  onComplete: (colourErrors: number) => void;
}

interface Plate {
  answer: string;
  source: ImageSourcePropType;
}

interface Trial extends Plate {
  options: string[];
}

const ALL_PLATES: Plate[] = [
  { answer: '12', source: require('../assets/color/12.png') },
  { answer: '5', source: require('../assets/color/5.png') },
  { answer: '6', source: require('../assets/color/6.png') },
  { answer: '74', source: require('../assets/color/74.png') },
  { answer: '8', source: require('../assets/color/8.png') },
  { answer: 'Nothing', source: require('../assets/color/Nothing.png') },
];

const PLATES_PER_TEST = 4;
const OPTIONS_PER_PLATE = 4;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptions(answer: string): string[] {
  const distractors = shuffle(
    ALL_PLATES.map((p) => p.answer).filter((a) => a !== answer),
  ).slice(0, OPTIONS_PER_PLATE - 1);
  return shuffle([answer, ...distractors]);
}

export default function ColourTest({ onComplete }: ColourTestProps) {
  const trials = useMemo<Trial[]>(() => {
    const selected = shuffle(ALL_PLATES).slice(0, PLATES_PER_TEST);
    return selected.map((p) => ({ ...p, options: buildOptions(p.answer) }));
  }, []);

  const [plateIndex, setPlateIndex] = useState(0);
  const [errors, setErrors] = useState(0);

  const plate = trials[plateIndex];

  const handleAnswer = (selected: string) => {
    const isError = selected !== plate.answer;
    const nextErrors = errors + (isError ? 1 : 0);
    const nextIndex = plateIndex + 1;

    if (nextIndex >= trials.length) {
      onComplete(nextErrors);
      return;
    }

    setErrors(nextErrors);
    setPlateIndex(nextIndex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.instruction}>What number do you see?</Text>
        <Text style={styles.progress}>
          Plate {plateIndex + 1} of {trials.length}
        </Text>
      </View>

      <View style={styles.plateArea}>
        <Image
          source={plate.source}
          style={styles.plateImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.optionsRow}>
        {plate.options.map((option) => (
          <Pressable
            key={option}
            style={styles.optionButton}
            onPress={() => handleAnswer(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progress: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
  },
  plateArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateImage: {
    width: 320,
    height: 320,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
