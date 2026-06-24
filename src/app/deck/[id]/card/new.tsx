import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import { createNote } from '@/features/cards/card-service';
import { isNoteValid, KindToggle, NoteFields } from '@/features/cards/note-form';
import type { NoteKind } from '@/types';

export default function NewCardScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [kind, setKind] = useState<NoteKind>('basic');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const setField = (name: string, value: string) => setFields((f) => ({ ...f, [name]: value }));

  const canSave = isNoteValid(kind, fields) && !saving;

  async function save() {
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields)) trimmed[k] = v.trim();
      await createNote(db, { deckId: id, kind, fields: trimmed });
      if (addAnother) {
        setFields({});
      } else {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('cardForm.add') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <KindToggle
          value={kind}
          onChange={(k) => {
            setKind(k);
            setFields({});
          }}
        />
        <NoteFields kind={kind} fields={fields} onChange={setField} />
        <Button title={t('cardForm.add')} onPress={save} disabled={!canSave} loading={saving} />
        <Button
          title={addAnother ? t('cardForm.keepAddingOn') : t('cardForm.keepAdding')}
          variant="secondary"
          onPress={() => setAddAnother((v) => !v)}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four },
});
