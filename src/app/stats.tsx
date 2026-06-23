import { Stack } from 'expo-router';

import { Screen } from '@/components/screen';
import { StatsView } from '@/features/statistics/StatsView';

export default function StatsScreen() {
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: 'Statistics' }} />
      <StatsView />
    </Screen>
  );
}
