import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import { deckRepository, settingsRepository } from '@/db/repositories';
import { createNote } from '@/features/cards/card-service';
import {
  exportBackup,
  importApkg,
  importBackupReplace,
  parseBackup,
  parseCardRows,
  pickBinaryFile,
  pickTextFile,
  saveTextFile,
  serializeBackup,
} from '@/services/import-export';
import { localStorageBackend, restSyncBackend, sync } from '@/services/sync';
import {
  useSettings,
  type LanguageSetting,
  type ThemeSetting,
} from '@/store/settings';

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || 'Imported';
}

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { language, theme, setLanguage, setTheme } = useSettings();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [syncToken, setSyncToken] = useState('');

  // Load persisted sync settings on mount.
  useEffect(() => {
    settingsRepository.getAll(db).then((s) => {
      setServerUrl(s['sync.serverUrl'] ?? '');
      setSyncToken(s['sync.token'] ?? '');
    });
  }, [db]);

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(await fn());
    } catch (e) {
      setStatus(`⚠ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const exportBackupHandler = () =>
    run(async () => {
      const backup = await exportBackup(db);
      const date = new Date().toISOString().slice(0, 10);
      await saveTextFile(`kondor-backup-${date}.json`, serializeBackup(backup));
      return t('settings.exportBackup') + ' ✓';
    });

  const importBackupHandler = () => {
    if (!confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    setConfirmReplace(false);
    return run(async () => {
      const picked = await pickTextFile(['.json', 'application/json']);
      if (!picked) return t('common.cancel');
      const res = await importBackupReplace(db, parseBackup(picked.text));
      return `${res.decks} / ${res.notes} / ${res.cards}`;
    });
  };

  const importCsvHandler = () =>
    run(async () => {
      const picked = await pickTextFile(['.csv', '.tsv', 'text/*']);
      if (!picked) return t('common.cancel');
      const cards = parseCardRows(picked.text);
      if (cards.length === 0) return '0';
      const deck = await deckRepository.create(db, { name: baseName(picked.name) });
      for (const c of cards) {
        await createNote(db, {
          deckId: deck.id,
          kind: 'basic',
          fields: { Front: c.front, Back: c.back },
        });
      }
      return `${cards.length} → "${deck.name}"`;
    });

  const importApkgHandler = () =>
    run(async () => {
      const picked = await pickBinaryFile(['.apkg', 'application/zip']);
      if (!picked) return t('common.cancel');
      const res = await importApkg(db, picked.bytes, baseName(picked.name));
      return `${res.notes} → "${baseName(picked.name)}"`;
    });

  const syncHandler = () =>
    run(async () => {
      const url = serverUrl.trim();
      const token = syncToken.trim();
      const backend = url
        ? restSyncBackend(url, token || undefined)
        : localStorageBackend();
      const res = await sync(db, backend);
      return t('settings.syncDone', { cards: res.cards });
    });

  const checkUpdateHandler = () =>
    run(async () => {
      // OTA update checks only work in a real build (not Expo Go dev / web)
      if (Platform.OS === 'web' || __DEV__) {
        return t('settings.updateNone');
      }
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return t('settings.updateNone');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return t('settings.updateAvailable');
    });

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={t('settings.appearance')}>
          <SegmentedControl<ThemeSetting>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </Section>

        <Section title={t('settings.language')}>
          <SegmentedControl<LanguageSetting>
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'system', label: t('settings.langSystem') },
              { value: 'en', label: 'English' },
              { value: 'fa', label: 'فارسی' },
            ]}
          />
        </Section>

        <Section title={t('settings.sync')} subtitle={t('settings.syncDesc')}>
          <TextField
            label={t('settings.syncServerUrl')}
            value={serverUrl}
            onChangeText={(v) => {
              setServerUrl(v);
              settingsRepository.set(db, 'sync.serverUrl', v);
            }}
            placeholder={t('settings.syncServerPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TextField
            label={t('settings.syncToken')}
            value={syncToken}
            onChangeText={(v) => {
              setSyncToken(v);
              settingsRepository.set(db, 'sync.token', v);
            }}
            placeholder={t('settings.syncTokenPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Button
            title={t('settings.syncNow')}
            onPress={syncHandler}
            disabled={busy}
          />
        </Section>

        <Section title={t('settings.backup')} subtitle={t('settings.backupDesc')}>
          <Button
            title={t('settings.exportBackup')}
            onPress={exportBackupHandler}
            disabled={busy}
          />
          <Button
            title={
              confirmReplace
                ? t('settings.restoreConfirm')
                : t('settings.restoreBackup')
            }
            variant={confirmReplace ? 'destructive' : 'secondary'}
            onPress={importBackupHandler}
            disabled={busy}
          />
        </Section>

        <Section
          title={t('settings.importCards')}
          subtitle={t('settings.importCardsDesc')}>
          <Button
            title={t('settings.importCsv')}
            variant="secondary"
            onPress={importCsvHandler}
            disabled={busy}
          />
          <Button
            title={t('settings.importApkg')}
            variant="secondary"
            onPress={importApkgHandler}
            disabled={busy}
          />
        </Section>

        <Section title={t('settings.about')}>
          <Button
            title={t('settings.checkUpdate')}
            variant="secondary"
            onPress={checkUpdateHandler}
            disabled={busy}
          />
          <Pressable onPress={() => router.push('/privacy')} style={styles.row}>
            <ThemedText type="small">{t('settings.privacy')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </Pressable>
        </Section>

        {status ? <ThemedText style={styles.status}>{status}</ThemedText> : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
          {t('settings.version', { version: appVersion })}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.five },
  section: { gap: Spacing.three },
  status: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  version: { textAlign: 'center', marginTop: Spacing.two },
});
