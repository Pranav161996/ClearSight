import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface ResponseRingProps {
  onSelect: (position: number) => void;
  size: number;
  /**
   * Optional teaching hint. If provided, that segment renders in a distinct
   * colour to show the user where the correct tap is during the warm-up.
   */
  hintIndex?: number | null;
}

const SEGMENTS = 8;
const SEGMENT_DEG = 360 / SEGMENTS;
const SEGMENT_GAP_DEG = 4;
const HIGHLIGHT_MS = 200;
const HIGHLIGHT_COLOR = '#007AFF';
const HINT_COLOR = '#34A853';
const RING_COLOR = '#000';
const INNER_RADIUS_RATIO = 0.5;

export default function ResponseRing({
  onSelect,
  size,
  hintIndex = null,
}: ResponseRingProps) {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2;
  const rInner = rOuter * INNER_RADIUS_RATIO;

  const polar = (r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    };
  };

  const handleTap = (locationX: number, locationY: number) => {
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < rInner * 0.4 || dist > rOuter * 1.15) return;

    let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    const segment = Math.floor(
      ((angleDeg + SEGMENT_DEG / 2) % 360) / SEGMENT_DEG,
    );

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHighlighted(segment);
    timeoutRef.current = setTimeout(() => {
      setHighlighted(null);
      onSelect(segment);
    }, HIGHLIGHT_MS);
  };

  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const span = SEGMENT_DEG - SEGMENT_GAP_DEG;
    const startAngle = i * SEGMENT_DEG - span / 2;
    const endAngle = i * SEGMENT_DEG + span / 2;
    const outerStart = polar(rOuter, startAngle);
    const outerEnd = polar(rOuter, endAngle);
    const innerEnd = polar(rInner, endAngle);
    const innerStart = polar(rInner, startAngle);

    const d = [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${rOuter} ${rOuter} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${rInner} ${rInner} 0 0 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');

    const fill =
      highlighted === i
        ? HIGHLIGHT_COLOR
        : hintIndex === i
        ? HINT_COLOR
        : RING_COLOR;

    return <Path key={i} d={d} fill={fill} />;
  });

  return (
    <Pressable
      onPress={(e) =>
        handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)
      }
      style={[styles.container, { width: size, height: size }]}
    >
      <Svg width={size} height={size} pointerEvents="none">
        {segments}
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // Transparent on purpose. A white background here was visually clipping
    // the bottom of the upper Landolt ring when it grew large, producing a
    // fake second "gap" right at the seam between the two halves of the
    // screen. The Pressable still receives taps without an explicit colour.
    backgroundColor: 'transparent',
  },
});
