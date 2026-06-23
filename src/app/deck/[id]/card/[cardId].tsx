import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import {
  deleteCardByNote,
  loadCardForEdit,
  updateBasicCard,
} from '@/features/cards/card-service';

export default function EditCardScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [noteId, setNoteId] = useState<string | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    'loading',
  );
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCardForEdit(db, cardId).then((card) => {
      if (cancelled) return;
      if (!card) {
        setStatus('missing');
        return;
      }
      setNoteId(card.noteId);
      setFront(card.front);
      setBack(card.back);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [db, cardId]);

  async function save() {
    if (!noteId) return;
    setSaving(true);
    try {
      await updateBasicCard(db, noteId, {
        front: front.trim(),
        back: back.trim(),
      });
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
        <ActivityIndicator style={styles.center} />
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

  const canSave =
    front.trim().length > 0 && back.trim().length > 0 && !saving;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label="Front"
          value={front}
          onChangeText={setFront}
          autoFocus
          multiline
        />
        <TextField label="Back" value={back} onChangeText={setBack} multiline />
        <Button title="Save" onPress={save} disabled={!canSave} loading={saving} />
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
  center: { marginTop: Spacing.six },
  content: { padding: Spacing.four, gap: Spacing.four },
});
