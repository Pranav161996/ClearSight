import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PixelRatio } from 'react-native';
import Slider from '@react-native-community/slider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useSessionStore } from '../store/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Calibration'>;

const CARD_LONG_MM = 85.6;
const CARD_SHORT_MM = 54;
const ASPECT = CARD_SHORT_MM / CARD_LONG_MM;

const SLIDER_MIN = 200;
const SLIDER_MAX = 700;
const SLIDER_INITIAL = 350;
const SLIDER_TRACK_LENGTH = 360;

export default function CalibrationScreen({ navigation }: Props) {
  const [sliderValue, setSliderValue] = useState(SLIDER_INITIAL);
  const setPxPerMm = useSessionStore((s) => s.setPxPerMm);
  const setCalibrationConfidence = useSessionStore(
    (s) => s.setCalibrationConfidence,
  );

  const pxPerMmEstimate = useMemo(() => PixelRatio.get() * 160, []);
  const heightMm = sliderValue / pxPerMmEstimate;

  const cardHeight = sliderValue;
  const cardWidth = sliderValue * ASPECT;

  const onLooksGood = () => {
    setPxPerMm(sliderValue / CARD_LONG_MM);
    setCalibrationConfidence('high');
    navigation.navigate('TestRunner');
  };

  const onSkip = () => {
    setPxPerMm((PixelRatio.get() * 160) / CARD_LONG_MM);
    setCalibrationConfidence('low');
    navigation.navigate('TestRunner');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        Hold a standard credit card flat against the screen with the long edge
        vertical, then drag the slider until the outline matches the card
        height.
      </Text>

      <View style={styles.row}>
        <View
          style={[styles.card, { width: cardWidth, height: cardHeight }]}
        />
        <View style={styles.sliderColumn}>
          <Slider
            style={styles.verticalSlider}
            minimumValue={SLIDER_MIN}
            maximumValue={SLIDER_MAX}
            value={sliderValue}
            onValueChange={setSliderValue}
            minimumTrackTintColor="#000"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#000"
          />
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={styles.label}>Drag to match card height</Text>
        <Text style={styles.readout}>Height: {heightMm.toFixed(1)} mm</Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={onLooksGood}>
          <Text style={styles.buttonText}>Looks good</Text>
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  instructions: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  card: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sliderColumn: {
    width: 40,
    height: SLIDER_TRACK_LENGTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalSlider: {
    width: SLIDER_TRACK_LENGTH,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  controls: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  readout: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: '#000',
  },
  footer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    marginTop: 14,
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
