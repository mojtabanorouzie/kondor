import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDeckCards } from '@/features/cards/use-deck-cards';

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error } = useDeckCards(id);
  const [query, setQuery] = useState('');

  const cards = data?.cards ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      Object.values(c.noteFields).some((v) => v.toLowerCase().includes(q)),
    );
  }, [cards, query]);

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          title: data?.deck?.name ?? 'Deck',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New card"
              onPress={() => router.push(`/deck/${id}/card/new`)}
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
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.toolbar}>
              <Button
                title="Study"
                onPress={() => router.push(`/deck/${id}/study`)}
              />
              <TextField
                placeholder="Search cards"
                value={query}
                onChangeText={setQuery}
              />
              <Button
                title="Edit deck"
                variant="secondary"
                onPress={() => router.push(`/deck/${id}/edit`)}
              />
            </View>
          }
          ListEmptyComponent={
            cards.length === 0 ? (
              <EmptyState
                title="No cards yet"
                message="Tap + to add your first card."
              />
            ) : (
              <EmptyState title="No matches" message="Try a different search." />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/deck/${id}/card/${item.id}`)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.noteFields.Front || '(empty)'}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={2}>
                  {item.noteFields.Back || '(empty)'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: Spacing.six },
  list: { padding: Spacing.four, gap: Spacing.three },
  toolbar: { gap: Spacing.three, marginBottom: Spacing.three },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  pressed: { opacity: 0.7 },
  add: { lineHeight: 32, paddingHorizontal: Spacing.two },
});
