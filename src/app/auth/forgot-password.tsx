import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/store/auth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    if (!auth.serverUrl) return;
    setBusy(true);
    try {
      await fetch(`${auth.serverUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // Ignore network errors — always show the confirmation message.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('auth.forgotPasswordTitle') }} />

      {sent ? (
        <ThemedText style={styles.message}>{t('auth.resetSent')}</ThemedText>
      ) : (
        <>
          <TextField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <Button
            title={t('auth.sendResetLink')}
            onPress={handleSend}
            disabled={busy || !email.trim() || !auth.serverUrl}
            loading={busy}
          />
        </>
      )}

      <Button title={t('common.back')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { textAlign: 'center', lineHeight: 22 },
});
