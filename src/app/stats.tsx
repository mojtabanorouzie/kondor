import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/screen';
import { StatsView } from '@/features/statistics/StatsView';

export default function StatsScreen() {
  const { t } = useTranslation();
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('stats.title') }} />
      <StatsView />
    </Screen>
  );
}
