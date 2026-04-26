import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  SafeAreaView,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { VideoView, type VideoPlayer } from 'expo-video';

export type InstructionMedia =
  | { type: 'video'; player: VideoPlayer }
  | { type: 'image'; source: ImageSourcePropType };

export interface InstructionCardProps {
  icon?: string;
  title: string;
  body?: string;
  ctaText?: string;
  onReady: () => void;
  /**
   * Optional media to display in the upper portion of the card. When
   * provided, replaces the icon zone entirely; the title is shown above the
   * step list instead of on the blue header.
   */
  media?: InstructionMedia;
}

export default function InstructionCard({
  icon,
  title,
  body,
  ctaText = "I'm Ready →",
  onReady,
  media,
}: InstructionCardProps) {
  const zone1Translate = useRef(new Animated.Value(-50)).current;
  const zone1Opacity = useRef(new Animated.Value(0)).current;
  const zone2Opacity = useRef(new Animated.Value(0)).current;
  const zone3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(zone1Translate, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(zone1Opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(zone2Opacity, {
        toValue: 1,
        duration: 300,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(zone3Opacity, {
        toValue: 1,
        duration: 300,
        delay: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [zone1Translate, zone1Opacity, zone2Opacity, zone3Opacity]);

  const steps = useMemo(() => {
    if (!body) return [];
    return body
      .split('\n\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [body]);

  const hasMedia = media != null;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          hasMedia ? styles.mediaZone : styles.zone1,
          {
            opacity: zone1Opacity,
            transform: [{ translateY: zone1Translate }],
          },
        ]}
      >
        {hasMedia ? (
          media.type === 'video' ? (
            <VideoView
              player={media.player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
            />
          ) : (
            <Image
              source={media.source}
              style={styles.image}
              resizeMode="contain"
            />
          )
        ) : (
          <>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={styles.title}>{title}</Text>
          </>
        )}
      </Animated.View>

      <Animated.View style={[styles.zone2, { opacity: zone2Opacity }]}>
        {hasMedia ? <Text style={styles.titleOnLight}>{title}</Text> : null}
        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.zone3, { opacity: zone3Opacity }]}>
        <Pressable style={styles.ctaButton} onPress={onReady}>
          <Text style={styles.ctaButtonText}>{ctaText}</Text>
        </Pressable>
        <Text style={styles.helper}>Tap when you are physically ready</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  zone1: {
    flex: 4,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaZone: {
    flex: 4,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: 280,
    height: '100%',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 32,
  },
  titleOnLight: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    lineHeight: 28,
    marginBottom: 16,
  },
  zone2: {
    flex: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A73E8',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    paddingLeft: 12,
  },
  zone3: {
    flex: 2,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingBottom: 24,
    justifyContent: 'flex-end',
  },
  ctaButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 14,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  helper: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
  },
});
