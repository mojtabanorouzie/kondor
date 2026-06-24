import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, useAuthRequest, ResponseType } from 'expo-auth-session';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/store/auth';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';

const GITHUB_DISCOVERY = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Google OAuth — always call hook; disable button if no client ID
  const redirectUri = makeRedirectUri();
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID || 'placeholder',
    redirectUri,
  });

  // GitHub OAuth
  const [githubRequest, githubResponse, githubPromptAsync] = useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID || 'placeholder',
      redirectUri,
      scopes: ['user:email'],
      usePKCE: false,
      responseType: ResponseType.Code,
    },
    GITHUB_DISCOVERY,
  );

  async function handleOAuth(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const code = googleResponse.params?.code;
    if (!code) return;
    handleOAuth(() => auth.loginWithGoogle(code, redirectUri));
  }, [googleResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (githubResponse?.type !== 'success') return;
    const code = githubResponse.params?.code;
    if (!code) return;
    handleOAuth(() => auth.loginWithGitHub(code));
  }, [githubResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin() {
    if (!auth.serverUrl) {
      setError(t('auth.noServerUrl'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.login(email.trim(), password);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const googleDisabled = !GOOGLE_CLIENT_ID || !googleRequest || busy || !auth.serverUrl;
  const githubDisabled = !GITHUB_CLIENT_ID || !githubRequest || busy || !auth.serverUrl;

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('auth.loginTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!auth.serverUrl ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {t('auth.noServerUrl')}
          </ThemedText>
        ) : null}

        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry
          textContentType="password"
        />

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        <Button
          title={t('auth.signIn')}
          onPress={handleLogin}
          disabled={busy || !auth.serverUrl}
          loading={busy}
        />

        <Divider label={t('auth.orDivider')} />

        {GOOGLE_CLIENT_ID ? (
          <Button
            title={t('auth.signInWithGoogle')}
            variant="secondary"
            onPress={() => googlePromptAsync()}
            disabled={googleDisabled}
            loading={busy}
          />
        ) : null}

        {GITHUB_CLIENT_ID ? (
          <Button
            title={t('auth.signInWithGitHub')}
            variant="secondary"
            onPress={() => githubPromptAsync()}
            disabled={githubDisabled}
            loading={busy}
          />
        ) : null}

        <View style={styles.links}>
          <Pressable onPress={() => router.push('/auth/forgot-password')}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('auth.forgotPassword')}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.replace('/auth/register')}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('auth.noAccount')}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.dividerLabel}>
        {label}
      </ThemedText>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  error: { color: '#b00020', textAlign: 'center' },
  center: { textAlign: 'center' },
  links: { gap: Spacing.two, alignItems: 'center', marginTop: Spacing.two },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#C0C0C0' },
  dividerLabel: { flexShrink: 0 },
});
