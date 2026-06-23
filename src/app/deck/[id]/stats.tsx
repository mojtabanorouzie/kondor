import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/screen';
import { StatsView } from '@/features/statistics/StatsView';

export default function DeckStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: 'Deck statistics' }} />
      <StatsView deckId={id} />
    </Screen>
  );
}
