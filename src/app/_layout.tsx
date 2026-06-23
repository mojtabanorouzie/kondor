import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DatabaseProvider } from '@/db';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <DatabaseProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Kondor' }} />
          <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
          <Stack.Screen name="settings" options={{ title: 'Import & Export' }} />
          <Stack.Screen
            name="deck/new"
            options={{ title: 'New deck', presentation: 'modal' }}
          />
          <Stack.Screen name="deck/[id]/index" options={{ title: 'Deck' }} />
          <Stack.Screen name="deck/[id]/study" options={{ title: 'Study' }} />
          <Stack.Screen
            name="deck/[id]/stats"
            options={{ title: 'Deck statistics' }}
          />
          <Stack.Screen
            name="deck/[id]/edit"
            options={{ title: 'Edit deck', presentation: 'modal' }}
          />
          <Stack.Screen
            name="deck/[id]/card/new"
            options={{ title: 'New card', presentation: 'modal' }}
          />
          <Stack.Screen
            name="deck/[id]/card/[cardId]"
            options={{ title: 'Edit card', presentation: 'modal' }}
          />
        </Stack>
      </ThemeProvider>
    </DatabaseProvider>
  );
}
