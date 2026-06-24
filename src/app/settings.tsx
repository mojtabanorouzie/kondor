import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import { deckRepository } from '@/db/repositories';
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
import {
  useSettings,
  type LanguageSetting,
  type ThemeSetting,
} from '@/store/settings';

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || 'Imported';
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { language, theme, setLanguage, setTheme } = useSettings();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

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
      return `${cards.length} → “${deck.name}”`;
    });

  const importApkgHandler = () =>
    run(async () => {
      const picked = await pickBinaryFile(['.apkg', 'application/zip']);
      if (!picked) return t('common.cancel');
      const res = await importApkg(db, picked.bytes, baseName(picked.name));
      return `${res.notes} → “${baseName(picked.name)}”`;
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

        {status ? <ThemedText style={styles.status}>{status}</ThemedText> : null}
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
});
