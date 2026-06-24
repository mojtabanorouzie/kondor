import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useContext } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { DatabaseProvider } from '@/db';
import '@/i18n';
import { AuthProvider } from '@/store/auth';
import { SettingsProvider } from '@/store/settings';
import { SchemeContext } from '@/theme/scheme-context';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <DatabaseProvider>
        <SettingsProvider>
          <AuthProvider>
            <ThemedNavigation />
          </AuthProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}

function ThemedNavigation() {
  const scheme = useContext(SchemeContext);

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Kondor' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen
          name="auth/register"
          options={{ title: 'Create account', presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ title: 'Forgot password', presentation: 'modal' }}
        />
        <Stack.Screen name="deck/new" options={{ title: 'New deck', presentation: 'modal' }} />
        <Stack.Screen name="deck/[id]/index" options={{ title: 'Deck' }} />
        <Stack.Screen name="deck/[id]/study" options={{ title: 'Study' }} />
        <Stack.Screen name="deck/[id]/stats" options={{ title: 'Deck statistics' }} />
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
  );
}
