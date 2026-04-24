import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useSessionStore } from '../store/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

interface Provider {
  name: string;
  description: string;
  url: string;
}


export default function BookingScreen({ navigation }: Props) {
  const reset = useSessionStore((s) => s.reset);

  const handleStartOver = () => {
    reset();
    navigation.popToTop();
  };

  const openMapsSearch = () => {
    Linking.openURL('https://www.google.com/maps/search/Lenskart+Store+near+me');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Find an eye care professional</Text>
        <Text style={styles.body}>
          Your screening suggests it's worth booking a follow-up eye test. Search for an
          a Lenskart Store near you.
        </Text>

        <Pressable style={styles.mapsButton} onPress={openMapsSearch}>
          <Text style={styles.mapsButtonText}>Find Lenskart Store near me</Text>
        </Pressable>


        <Text style={styles.disclaimer}>
          ClearSight is a screening aid, not a medical device. The providers
          above are not affiliated with ClearSight.
        </Text>
      </ScrollView>

      <View style={styles.cta}>
        <Pressable style={styles.secondaryButton} onPress={handleStartOver}>
          <Text style={styles.secondaryButtonText}>Start over</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  mapsButton: {
    marginTop: 16,
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  cardChevron: {
    fontSize: 18,
    color: '#888',
    marginLeft: 8,
  },
  helper: {
    fontSize: 13,
    color: '#444',
    marginTop: 20,
    lineHeight: 19,
  },
  disclaimer: {
    fontSize: 11,
    color: '#888',
    marginTop: 20,
    lineHeight: 16,
    textAlign: 'center',
  },
  cta: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
