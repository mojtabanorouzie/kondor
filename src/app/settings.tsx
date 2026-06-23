import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
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

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || 'Imported';
}

export default function SettingsScreen() {
  const db = useDatabase();
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
      return 'Backup exported.';
    });

  const importBackupHandler = () => {
    if (!confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    setConfirmReplace(false);
    return run(async () => {
      const picked = await pickTextFile(['.json', 'application/json']);
      if (!picked) return 'Cancelled.';
      const res = await importBackupReplace(db, parseBackup(picked.text));
      return `Restored ${res.decks} decks, ${res.notes} notes, ${res.cards} cards.`;
    });
  };

  const importCsvHandler = () =>
    run(async () => {
      const picked = await pickTextFile(['.csv', '.tsv', 'text/*']);
      if (!picked) return 'Cancelled.';
      const cards = parseCardRows(picked.text);
      if (cards.length === 0) return 'No front/back rows found in that file.';
      const deck = await deckRepository.create(db, { name: baseName(picked.name) });
      for (const c of cards) {
        await createNote(db, {
          deckId: deck.id,
          kind: 'basic',
          fields: { Front: c.front, Back: c.back },
        });
      }
      return `Imported ${cards.length} cards into “${deck.name}”.`;
    });

  const importApkgHandler = () =>
    run(async () => {
      const picked = await pickBinaryFile(['.apkg', 'application/zip']);
      if (!picked) return 'Cancelled.';
      const res = await importApkg(db, picked.bytes, baseName(picked.name));
      return `Imported ${res.notes} notes (${res.cards} cards) from Anki.`;
    });

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: 'Import & Export' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section
          title="Backup"
          subtitle="A full copy of your decks, cards, and review history as a Kondor JSON file.">
          <Button title="Export backup" onPress={exportBackupHandler} disabled={busy} />
          <Button
            title={
              confirmReplace
                ? 'Tap again — this replaces everything'
                : 'Restore from backup'
            }
            variant={confirmReplace ? 'destructive' : 'secondary'}
            onPress={importBackupHandler}
            disabled={busy}
          />
        </Section>

        <Section
          title="Import cards"
          subtitle="Bring cards in from a spreadsheet or from Anki. Each import creates a new deck.">
          <Button
            title="Import CSV / TSV"
            variant="secondary"
            onPress={importCsvHandler}
            disabled={busy}
          />
          <Button
            title="Import Anki .apkg"
            variant="secondary"
            onPress={importApkgHandler}
            disabled={busy}
          />
        </Section>

        {status ? (
          <ThemedText style={styles.status}>{status}</ThemedText>
        ) : null}
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
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.five },
  section: { gap: Spacing.three },
  status: { textAlign: 'center' },
});
