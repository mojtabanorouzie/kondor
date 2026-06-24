import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/screen';
import { StatsView } from '@/features/statistics/StatsView';

export default function DeckStatsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('stats.deckTitle') }} />
      <StatsView deckId={id} />
    </Screen>
  );
}
