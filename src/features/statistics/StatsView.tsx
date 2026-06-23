import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { BarChart } from './components/BarChart';
import { Heatmap } from './components/Heatmap';
import { StateBar } from './components/StateBar';
import { useStatistics } from './use-statistics';

export function StatsView({ deckId }: { deckId?: string }) {
  const { data: stats, loading, error } = useStatistics(deckId);

  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (error) {
    return <EmptyState title="Couldn’t load stats" message={error.message} />;
  }
  if (!stats) return null;

  if (stats.totalCards === 0) {
    return (
      <EmptyState
        title="No data yet"
        message="Add cards and study to see your statistics."
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        <Tile label="Cards" value={stats.totalCards} />
        <Tile label="Reviews today" value={stats.reviewsToday} />
        <Tile
          label="Streak"
          value={stats.streak === 1 ? '1 day' : `${stats.streak} days`}
        />
        <Tile
          label="Retention"
          value={stats.retentionPct === null ? '—' : `${stats.retentionPct}%`}
        />
      </View>

      <Section title="Card states">
        <StateBar byState={stats.byState} />
      </Section>

      <Section title="Reviews (last 30 days)">
        <BarChart
          values={stats.reviewsByDay.map((d) => d.count)}
          color="#2eb872"
          caption={`${stats.totalReviews} reviews in the window`}
        />
      </Section>

      <Section title="Due forecast (next 14 days)">
        <BarChart
          values={stats.forecast.map((d) => d.count)}
          color="#3c87f7"
          caption={`${stats.forecast.reduce((s, d) => s + d.count, 0)} cards upcoming`}
        />
      </Section>

      <Section title="Activity">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Heatmap data={stats.heatmap} />
        </ScrollView>
      </Section>
    </ScrollView>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.six },
  content: { padding: Spacing.four, gap: Spacing.five },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tile: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  section: { gap: Spacing.three },
});
