import { Dimensions, View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface LandoltRingProps {
  diameterMm: number;
  gapPosition: number;
  contrast: number;
  pxPerMm: number;
  gapColor?: string;
}

const GAP_ARC_DEG = 72;

// Standard sRGB display gamma. iOS/Android consumer displays approximate this.
// We treat `contrast` as Weber contrast (ring vs white background) in linear
// luminance space, then convert the target linear luminance to an sRGB pixel
// value so the rendered ring matches the nominal contrast within ~5%.
const DISPLAY_GAMMA = 2.2;

function gammaCorrect(linearContrast: number, gamma = DISPLAY_GAMMA): number {
  const linearLum = Math.max(0, Math.min(1, 1 - linearContrast));
  return Math.round(Math.pow(linearLum, 1 / gamma) * 255);
}

export default function LandoltRing({
  diameterMm,
  gapPosition,
  contrast,
  pxPerMm,
  gapColor = 'white',
}: LandoltRingProps) {
  // Defensive cap. If the user calibrated pxPerMm aggressively, the
  // largest MAR levels can render bigger than the stimulus container,
  // overflow into the response area, and look clipped. We clamp to a
  // share of the smaller screen dimension so the ring always fits.
  const screen = Dimensions.get('window');
  const maxRenderRadius =
    Math.min(screen.width * 0.85, screen.height * 0.35) / 2;
  const desiredRadius = (diameterMm / 2) * pxPerMm;
  const outerRadius = Math.min(desiredRadius, maxRenderRadius);

  const strokeWidth = outerRadius * 0.4;
  const ringRadius = outerRadius - strokeWidth / 2;

  const gapAngleDeg = 45 * gapPosition;
  // Pad the SVG canvas slightly beyond the ring so the gap-arc stroke
  // (which is wider than the ring stroke) cannot be clipped at the
  // SVG edge.
  const padding = strokeWidth / 2 + 2;
  const size = outerRadius * 2 + padding * 2;
  const cx = outerRadius + padding;
  const cy = outerRadius + padding;

  const c = gammaCorrect(contrast);
  const ringColor = `rgb(${c}, ${c}, ${c})`;

  const startDeg = gapAngleDeg - GAP_ARC_DEG / 2;
  const endDeg = gapAngleDeg + GAP_ARC_DEG / 2;

  const polar = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + ringRadius * Math.sin(rad),
      y: cy - ringRadius * Math.cos(rad),
    };
  };

  const start = polar(startDeg);
  const end = polar(endDeg);
  const largeArcFlag = GAP_ARC_DEG > 180 ? 1 : 0;
  const sweepFlag = 1;

  const arcPath = `M ${start.x} ${start.y} A ${ringRadius} ${ringRadius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Path
          d={arcPath}
          stroke={gapColor}
          strokeWidth={strokeWidth + 2}
          fill="none"
          strokeLinecap="butt"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
