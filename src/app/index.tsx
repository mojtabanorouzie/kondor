import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DeckCard } from '@/features/decks/DeckCard';
import { useDecks } from '@/features/decks/use-decks';

export default function DecksScreen() {
  const router = useRouter();
  const { data: decks, loading, error } = useDecks();

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Statistics"
              onPress={() => router.push('/stats')}
              hitSlop={12}>
              <ThemedText type="link">Stats</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New deck"
              onPress={() => router.push('/deck/new')}
              hitSlop={12}>
              <ThemedText type="subtitle" style={styles.add}>
                +
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error.message} />
      ) : !decks || decks.length === 0 ? (
        <EmptyState
          title="No decks yet"
          message="Tap + to create your first deck."
        />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              onPress={() => router.push(`/deck/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: Spacing.six },
  list: { padding: Spacing.four, gap: Spacing.three },
  add: { lineHeight: 32, paddingHorizontal: Spacing.two },
});
