import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useSessionStore, formatRange, type DiopterRange } from '../store/session';
import {
  generateReport,
  type Report,
  type Urgency,
  type FindingFlag,
  type Eye,
} from '../api/report';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

const URGENCY_COLOR: Record<Urgency, string> = {
  urgent: '#d93025',
  soon: '#f9a825',
  routine: '#1a73e8',
  optional: '#2e9d4a',
};

const URGENCY_LABEL: Record<Urgency, string> = {
  urgent:'',
  soon: '',
  routine: '',
  optional: '',
};

const FLAG_COLOR: Record<FindingFlag, string> = {
  pass: '#2e9d4a',
  amber: '#f9a825',
  red: '#d93025',
};

const EYE_BADGE: Record<
  Exclude<Eye, null>,
  { label: string; bg: string; fg: string }
> = {
  right: { label: 'R', bg: '#E3F2FD', fg: '#1565C0' },
  left: { label: 'L', bg: '#E3F2FD', fg: '#1565C0' },
  both: { label: 'Both', bg: '#F3E5F5', fg: '#6A1B9A' },
};

interface DiopterRowConfig {
  rangeKey: 'rightEyeRange' | 'leftEyeRange' | 'nearRange';
  label: string;
  badge: { text: string; bg: string; fg: string };
}

const DIOPTER_ROWS: DiopterRowConfig[] = [
  {
    rangeKey: 'rightEyeRange',
    label: 'Right eye',
    badge: { text: 'R', bg: '#E3F2FD', fg: '#1565C0' },
  },
  {
    rangeKey: 'leftEyeRange',
    label: 'Left eye',
    badge: { text: 'L', bg: '#E3F2FD', fg: '#1565C0' },
  },
  {
    rangeKey: 'nearRange',
    label: 'Near vision',
    badge: { text: 'B', bg: '#F3E5F5', fg: '#6A1B9A' },
  },
];

interface DioptersCardProps {
  ranges: Record<DiopterRowConfig['rangeKey'], DiopterRange>;
}

function DioptersCard({ ranges }: DioptersCardProps) {
  const anyCapped = DIOPTER_ROWS.some((r) => ranges[r.rangeKey].capped);

  return (
    <View style={styles.dioptersCard}>
      <Text style={styles.dioptersCardTitle}>💊 Estimated Prescription</Text>
      {DIOPTER_ROWS.map((row, i) => {
        const range = ranges[row.rangeKey];
        const isCapped = range.capped;
        return (
          <View
            key={row.rangeKey}
            style={[
              styles.dioptersRow,
              i === DIOPTER_ROWS.length - 1 && styles.dioptersRowLast,
            ]}
          >
            <Text style={styles.dioptersLabel}>{row.label}</Text>
            <View style={styles.dioptersValueGroup}>
              <Text
                style={[
                  styles.dioptersValue,
                  isCapped && styles.dioptersValueCapped,
                ]}
              >
                {formatRange(range)}
              </Text>
              <View
                style={[
                  styles.dioptersBadge,
                  { backgroundColor: row.badge.bg },
                ]}
              >
                <Text
                  style={[styles.dioptersBadgeText, { color: row.badge.fg }]}
                >
                  {row.badge.text}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
      {anyCapped && (
        <Text style={styles.dioptersFootnote}>
          * Test limit reached. Clinical refraction needed for exact value.
        </Text>
      )}
    </View>
  );
}

function shouldShowInterEyeBanner(report: Report): boolean {
  const distanceFindings = report.findings.filter(
    (f) =>
      (f.eye === 'right' || f.eye === 'left') && /distance/i.test(f.test),
  );
  const right = distanceFindings.find((f) => f.eye === 'right');
  const left = distanceFindings.find((f) => f.eye === 'left');
  if (!right || !left) return false;
  if (right.flag === left.flag) return false;
  if (right.flag === 'red' || left.flag === 'red') return true;
  if (
    (right.flag === 'amber' && left.flag === 'pass') ||
    (left.flag === 'amber' && right.flag === 'pass')
  ) {
    return true;
  }
  return false;
}

export default function ResultsScreen({ navigation }: Props) {
  const testResults = useSessionStore((s) => s.testResults);
  const { rightEyeRange, leftEyeRange, nearRange } = testResults;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    generateReport().then((r) => {
      if (!cancelled) {
        setReport(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [testResults]);

  if (loading || !report) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Generating your report…</Text>
      </View>
    );
  }

  const urgencyColor = URGENCY_COLOR[report.urgency];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Your screening results</Text>

        <View style={[styles.summaryCard, { borderColor: urgencyColor }]}>
          <Text style={[styles.urgencyBadge, { color: urgencyColor }]}>
            {URGENCY_LABEL[report.urgency]}
          </Text>
          <Text style={styles.summary}>{report.summary}</Text>
        </View>

        <DioptersCard
          ranges={{ rightEyeRange, leftEyeRange, nearRange }}
        />

        {report.findings.length > 0 && (
          <>
            {shouldShowInterEyeBanner(report) && (
              <View style={styles.interEyeBanner}>
                <Text style={styles.interEyeBannerText}>
                  ⚠️ Your eyes differ significantly — one eye is compensating
                  for the other. This is worth checking with an optometrist.
                </Text>
              </View>
            )}
            <Text style={styles.h2}>Findings</Text>
            {report.findings.map((f, i) => {
              const badge = f.eye ? EYE_BADGE[f.eye] : null;
              return (
                <View
                  key={`${f.test}-${i}`}
                  style={[
                    styles.findingCard,
                    { borderLeftColor: FLAG_COLOR[f.flag] ?? '#999' },
                  ]}
                >
                  <View style={styles.findingHeader}>
                    <View style={styles.findingTitleRow}>
                      <Text style={styles.findingTest}>{f.test}</Text>
                      {badge && (
                        <View
                          style={[
                            styles.eyeBadge,
                            { backgroundColor: badge.bg },
                          ]}
                        >
                          <Text
                            style={[styles.eyeBadgeText, { color: badge.fg }]}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.findingResult}>{f.result}</Text>
                  </View>
                  {f.plain ? (
                    <Text style={styles.findingPlain}>{f.plain}</Text>
                  ) : null}
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.h2}>Pattern</Text>
        <Text style={styles.body}>{report.patternNote}</Text>

        <Text style={styles.h2}>Recommendation</Text>
        <Text style={styles.body}>{report.recommendation}</Text>

        <Text style={styles.disclaimer}>
          ClearSight is a screening aid, not a medical device. Results are
          estimates only. Always consult a qualified optometrist or
          ophthalmologist for clinical diagnosis.
        </Text>
      </ScrollView>

      <View style={styles.cta}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Booking')}
        >
          <Text style={styles.primaryButtonText}>Book an Eye Test</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#555',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginTop: 22,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  summaryCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  urgencyBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  summary: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  findingCard: {
    backgroundColor: '#fafafa',
    borderLeftWidth: 4,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  findingTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  findingTest: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  eyeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eyeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  interEyeBanner: {
    marginTop: 16,
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#F9A825',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
  },
  interEyeBannerText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  dioptersCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dioptersCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  dioptersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  dioptersRowLast: {
    borderBottomWidth: 0,
  },
  dioptersLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  dioptersValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dioptersValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A73E8',
    fontVariant: ['tabular-nums'],
  },
  dioptersValueCapped: {
    color: '#EA4335',
  },
  dioptersBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
  },
  dioptersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dioptersFootnote: {
    marginTop: 10,
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  findingResult: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    fontVariant: ['tabular-nums'],
  },
  findingPlain: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
  },
  disclaimer: {
    fontSize: 11,
    color: '#888',
    marginTop: 28,
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
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
