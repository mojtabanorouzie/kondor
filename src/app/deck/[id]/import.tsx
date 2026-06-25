import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import {
  detectDelimiter,
  importCards,
  JsonImportError,
  parseCardJson,
  parseCardRows,
  parseDelimited,
  pickTextFile,
  type ImportSummary,
  type ParsedCard,
} from '@/services/import-export';

type Format = 'csv' | 'json';

interface ParseResult {
  cards: ParsedCard[];
  total: number;
  errorKey?: string;
}

const PREVIEW_LIMIT = 10;

function formatForName(name: string): Format {
  return name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
}

export default function ImportScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [format, setFormat] = useState<Format>('csv');
  const [hasHeader, setHasHeader] = useState(false);
  const [frontColumn, setFrontColumn] = useState(0);
  const [backColumn, setBackColumn] = useState(1);
  const [frontKey, setFrontKey] = useState('');
  const [backKey, setBackKey] = useState('');
  const [dedupe, setDedupe] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);

  // Number of columns available for CSV column mapping (from the first row).
  const columnCount = useMemo(() => {
    if (!file || format !== 'csv') return 0;
    const rows = parseDelimited(file.text, detectDelimiter(file.text));
    return rows[0]?.length ?? 0;
  }, [file, format]);

  // Re-parse live whenever the file or any mapping control changes.
  const parsed = useMemo<ParseResult>(() => {
    if (!file) return { cards: [], total: 0 };
    if (file.text.trim().length === 0) return { cards: [], total: 0, errorKey: 'errorEmpty' };
    try {
      if (format === 'json') {
        const cards = parseCardJson(file.text, {
          frontKey: frontKey.trim() || undefined,
          backKey: backKey.trim() || undefined,
        });
        const arr = JSON.parse(file.text) as unknown;
        const total = Array.isArray(arr) ? arr.length : 0;
        return { cards, total };
      }
      const cards = parseCardRows(file.text, { hasHeader, frontColumn, backColumn });
      const rows = parseDelimited(file.text, detectDelimiter(file.text));
      const total = hasHeader ? Math.max(0, rows.length - 1) : rows.length;
      return { cards, total };
    } catch (e) {
      if (e instanceof JsonImportError) {
        return {
          cards: [],
          total: 0,
          errorKey: e.code === 'not-array' ? 'errorNotArray' : 'errorInvalidJson',
        };
      }
      return { cards: [], total: 0, errorKey: 'errorInvalidJson' };
    }
  }, [file, format, hasHeader, frontColumn, backColumn, frontKey, backKey]);

  async function pick() {
    const picked = await pickTextFile(['.json', '.csv', '.tsv', 'text/*', 'application/json']);
    if (!picked) return;
    setResult(null);
    setFile({ name: picked.name, text: picked.text });
    setFormat(formatForName(picked.name));
  }

  async function confirmImport() {
    setImporting(true);
    try {
      const summary = await importCards(db, id, parsed.cards, { dedupe });
      setResult(summary);
    } finally {
      setImporting(false);
    }
  }

  const columnOptions = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, i) => ({ value: String(i), label: String(i + 1) })),
    [columnCount],
  );

  // --- Result view ---------------------------------------------------------
  if (result) {
    const failed = result.imported === 0 && result.errors.length > 0;
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ title: t('import.title') }} />
        <View style={styles.resultWrap}>
          <EmptyState
            title={failed ? t('import.resultFailedTitle') : t('import.resultTitle')}
            message={
              failed
                ? t('import.resultFailedMessage')
                : [
                    t('import.resultImported', { count: result.imported }),
                    t('import.resultSkipped', { count: result.skipped }),
                    t('import.resultDuplicates', { count: result.duplicates }),
                    t('import.resultErrors', { count: result.errors.length }),
                  ].join(' · ')
            }
          />
          <View style={styles.resultActions}>
            <Button title={t('import.backToDeck')} onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  // --- Setup / preview view ------------------------------------------------
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('import.title') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Button title={t('import.pickFile')} onPress={pick} />
        {!file ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('import.pickFileHint')}
          </ThemedText>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t('import.file', { name: file.name })}
            </ThemedText>

            <SegmentedControl<Format>
              value={format}
              onChange={setFormat}
              options={[
                { value: 'csv', label: t('import.formatCsv') },
                { value: 'json', label: t('import.formatJson') },
              ]}
            />

            {format === 'csv' ? (
              <>
                <View style={styles.switchRow}>
                  <ThemedText>{t('import.hasHeader')}</ThemedText>
                  <Switch value={hasHeader} onValueChange={setHasHeader} />
                </View>
                {columnOptions.length > 1 ? (
                  <>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {t('import.frontColumn')}
                    </ThemedText>
                    <SegmentedControl<string>
                      value={String(frontColumn)}
                      onChange={(v) => setFrontColumn(Number(v))}
                      options={columnOptions}
                    />
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {t('import.backColumn')}
                    </ThemedText>
                    <SegmentedControl<string>
                      value={String(backColumn)}
                      onChange={(v) => setBackColumn(Number(v))}
                      options={columnOptions}
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <TextField
                  label={t('import.frontKey')}
                  value={frontKey}
                  onChangeText={setFrontKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextField
                  label={t('import.backKey')}
                  value={backKey}
                  onChangeText={setBackKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('import.keyHint')}
                </ThemedText>
              </>
            )}

            <View style={styles.switchRow}>
              <ThemedText>{t('import.dedupe')}</ThemedText>
              <Switch value={dedupe} onValueChange={setDedupe} />
            </View>

            {parsed.errorKey ? (
              <EmptyState title={t('import.errorTitle')} message={t(`import.${parsed.errorKey}`)} />
            ) : parsed.cards.length === 0 ? (
              <EmptyState title={t('import.nothingTitle')} message={t('import.nothingMessage')} />
            ) : (
              <>
                <ThemedText type="smallBold">
                  {[
                    t('import.summaryFound', { total: parsed.total }),
                    t('import.summaryValid', { count: parsed.cards.length }),
                    t('import.summarySkipped', {
                      count: Math.max(0, parsed.total - parsed.cards.length),
                    }),
                  ].join(' · ')}
                </ThemedText>

                {parsed.cards.slice(0, PREVIEW_LIMIT).map((c, i) => (
                  <ThemedView key={i} type="backgroundElement" style={styles.previewCard}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {c.front}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                      {c.back}
                    </ThemedText>
                  </ThemedView>
                ))}
                {parsed.cards.length > PREVIEW_LIMIT ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('import.previewMore', { count: parsed.cards.length - PREVIEW_LIMIT })}
                  </ThemedText>
                ) : null}

                <Button
                  title={t('import.confirm', { count: parsed.cards.length })}
                  onPress={confirmImport}
                  disabled={importing}
                  loading={importing}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  previewCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  resultWrap: { flex: 1 },
  resultActions: { padding: Spacing.four },
});
