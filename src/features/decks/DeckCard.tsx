import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DeckWithCounts } from '@/db/repositories';

export function DeckCard({ deck, onPress }: { deck: DeckWithCounts; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {deck.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('decks.cards', { count: deck.total })}
          </ThemedText>
        </View>
        <View style={styles.counts}>
          <Count label={t('decks.new')} value={deck.newCount} color="#3c87f7" />
          <Count label={t('decks.learning')} value={deck.learningCount} color="#e0a23b" />
          <Count label={t('decks.due')} value={deck.dueCount} color="#2eb872" />
        </View>
      </ThemedView>
    </Pressable>
  );
}

function Count({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.count}>
      <ThemedText type="smallBold" style={{ color }}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  name: { flex: 1 },
  counts: { flexDirection: 'row', gap: Spacing.four },
  count: { flexDirection: 'row', gap: Spacing.one, alignItems: 'baseline' },
});
