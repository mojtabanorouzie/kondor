import { Redirect, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DeckCard } from '@/features/decks/DeckCard';
import { useDecks } from '@/features/decks/use-decks';
import { useSettings } from '@/store/settings';

export default function DecksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasSeenOnboarding } = useSettings();
  const { data: decks, loading, error } = useDecks();

  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Statistics"
                onPress={() => router.push('/stats')}
                hitSlop={12}>
                <ThemedText type="link">{t('decks.headerStats')}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Import and export"
                onPress={() => router.push('/settings')}
                hitSlop={12}>
                <ThemedText type="link">{t('decks.headerData')}</ThemedText>
              </Pressable>
            </View>
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
        <EmptyState title={t('decks.errorTitle')} message={error.message} />
      ) : !decks || decks.length === 0 ? (
        <EmptyState title={t('decks.emptyTitle')} message={t('decks.emptyMessage')} />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DeckCard deck={item} onPress={() => router.push(`/deck/${item.id}`)} />
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
  headerLeft: { flexDirection: 'row', gap: Spacing.three },
});
