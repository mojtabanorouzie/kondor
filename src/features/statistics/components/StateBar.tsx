import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Statistics } from '../stats-service';

const SEGMENTS: { key: keyof Statistics['byState']; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#3c87f7' },
  { key: 'learning', label: 'Learning', color: '#e0a23b' },
  { key: 'relearning', label: 'Relearning', color: '#e5484d' },
  { key: 'review', label: 'Review', color: '#2eb872' },
];

/** Horizontal stacked bar of cards by scheduling state, with a legend. */
export function StateBar({ byState }: { byState: Statistics['byState'] }) {
  const total =
    byState.new + byState.learning + byState.review + byState.relearning;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {total === 0 ? (
          <View style={[styles.segment, styles.empty]} />
        ) : (
          SEGMENTS.map((s) =>
            byState[s.key] > 0 ? (
              <View
                key={s.key}
                style={{ flex: byState[s.key], backgroundColor: s.color }}
              />
            ) : null,
          )
        )}
      </View>
      <View style={styles.legend}>
        {SEGMENTS.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {s.label} {byState[s.key]}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  bar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: { flex: 1 },
  empty: { backgroundColor: 'rgba(127,127,127,0.15)' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
