import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { BarChart } from './components/BarChart';
import { Heatmap } from './components/Heatmap';
import { StateBar } from './components/StateBar';
import { useStatistics } from './use-statistics';

export function StatsView({ deckId }: { deckId?: string }) {
  const { t } = useTranslation();
  const { data: stats, loading, error } = useStatistics(deckId);

  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (error) {
    return <EmptyState title={t('stats.errorTitle')} message={error.message} />;
  }
  if (!stats) return null;

  if (stats.totalCards === 0) {
    return <EmptyState title={t('stats.noDataTitle')} message={t('stats.noDataMessage')} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        <Tile label={t('stats.cards')} value={stats.totalCards} />
        <Tile label={t('stats.reviewsToday')} value={stats.reviewsToday} />
        <Tile label={t('stats.streak')} value={t('stats.streakDays', { count: stats.streak })} />
        <Tile
          label={t('stats.retention')}
          value={stats.retentionPct === null ? '—' : `${stats.retentionPct}%`}
        />
      </View>

      <Section title={t('stats.cardStates')}>
        <StateBar byState={stats.byState} />
      </Section>

      <Section title={t('stats.reviews30')}>
        <BarChart
          values={stats.reviewsByDay.map((d) => d.count)}
          color="#2eb872"
          caption={t('stats.reviewsInWindow', { count: stats.totalReviews })}
        />
      </Section>

      <Section title={t('stats.forecast')}>
        <BarChart
          values={stats.forecast.map((d) => d.count)}
          color="#3c87f7"
          caption={t('stats.upcoming', {
            count: stats.forecast.reduce((s, d) => s + d.count, 0),
          })}
        />
      </Section>

      <Section title={t('stats.activity')}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
