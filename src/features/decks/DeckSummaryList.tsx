import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useDeckSummaries } from './use-deck-summaries';

/** Lists decks with their total and due-card counts, read live from SQLite. */
export function DeckSummaryList() {
  const { decks, loading, error } = useDeckSummaries();

  if (loading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <ThemedText type="small">Couldn’t load decks: {error.message}</ThemedText>;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="subtitle">Your decks</ThemedText>
      {decks.map((deck) => (
        <View key={deck.id} style={styles.row}>
          <ThemedText>{deck.name}</ThemedText>
          <ThemedText type="small">
            {deck.due} due · {deck.total} cards
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
