import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useSessionStore } from '../store/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const MIN_AGE = 5;
const MAX_AGE = 110;

export default function OnboardingScreen({ navigation }: Props) {
  const setAge = useSessionStore((s) => s.setAge);
  const [ageInput, setAgeInput] = useState('');

  const parsedAge = useMemo(() => {
    const n = parseInt(ageInput.trim(), 10);
    if (Number.isNaN(n)) return null;
    return n;
  }, [ageInput]);

  const isValid =
    parsedAge !== null && parsedAge >= MIN_AGE && parsedAge <= MAX_AGE;

  const handleContinue = () => {
    if (!isValid || parsedAge === null) return;
    setAge(parsedAge);
    navigation.navigate('Calibration');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>ClearSight</Text>
        <Text style={styles.tagline}>
          A 5-minute screening of your distance vision, near vision, contrast,
          and colour perception.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>How old are you?</Text>
          <Text style={styles.hint}>
            Helps us interpret near-vision results, since reading focus
            naturally weakens after 40.
          </Text>
          <TextInput
            value={ageInput}
            onChangeText={setAgeInput}
            placeholder="e.g. 32"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
            maxLength={3}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          {ageInput.length > 0 && !isValid && (
            <Text style={styles.error}>
              Please enter an age between {MIN_AGE} and {MAX_AGE}.
            </Text>
          )}
        </View>

        <Pressable
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
        >
          <Text
            style={[
              styles.buttonText,
              !isValid && styles.buttonTextDisabled,
            ]}
          >
            Continue →
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          ClearSight is a screening aid, not a medical device. Your age stays
          on this device unless you choose to share results.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 40,
  },
  field: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  error: {
    fontSize: 13,
    color: '#d93025',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    marginTop: 32,
    lineHeight: 16,
    textAlign: 'center',
  },
});
