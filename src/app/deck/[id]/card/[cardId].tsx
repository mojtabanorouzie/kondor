import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import {
  deleteCardByNote,
  loadNoteForEdit,
  updateNote,
} from '@/features/cards/card-service';
import { isNoteValid, NoteFields } from '@/features/cards/note-form';
import type { NoteKind } from '@/types';

export default function EditCardScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [noteId, setNoteId] = useState<string | null>(null);
  const [kind, setKind] = useState<NoteKind>('basic');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadNoteForEdit(db, cardId).then((note) => {
      if (cancelled) return;
      if (!note) {
        setStatus('missing');
        return;
      }
      setNoteId(note.noteId);
      setKind(note.kind);
      setFields(note.fields);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [db, cardId]);

  const setField = (name: string, value: string) =>
    setFields((f) => ({ ...f, [name]: value }));

  async function save() {
    if (!noteId) return;
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields)) trimmed[k] = v.trim();
      await updateNote(db, noteId, kind, trimmed);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!noteId) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteCardByNote(db, noteId);
    router.back();
  }

  if (status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator style={styles.loader} />
      </Screen>
    );
  }
  if (status === 'missing') {
    return (
      <Screen>
        <EmptyState title="Card not found" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          {kind === 'cloze' ? 'Cloze card' : 'Basic card'}
        </ThemedText>
        <NoteFields kind={kind} fields={fields} onChange={setField} />
        <Button
          title="Save"
          onPress={save}
          disabled={!isNoteValid(kind, fields) || saving}
          loading={saving}
        />
        <Button
          title={confirmingDelete ? 'Tap again to confirm delete' : 'Delete card'}
          variant="destructive"
          onPress={remove}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.six },
  content: { padding: Spacing.four, gap: Spacing.four },
});
