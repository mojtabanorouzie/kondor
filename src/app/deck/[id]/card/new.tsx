import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import { createBasicCard } from '@/features/cards/card-service';

export default function NewCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const canSave = front.trim().length > 0 && back.trim().length > 0 && !saving;

  async function save() {
    setSaving(true);
    try {
      await createBasicCard(db, {
        deckId: id,
        front: front.trim(),
        back: back.trim(),
      });
      if (addAnother) {
        setFront('');
        setBack('');
      } else {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label="Front"
          value={front}
          onChangeText={setFront}
          placeholder="Question / prompt"
          autoFocus
          multiline
        />
        <TextField
          label="Back"
          value={back}
          onChangeText={setBack}
          placeholder="Answer"
          multiline
        />
        <Button title="Add card" onPress={save} disabled={!canSave} loading={saving} />
        <Button
          title={addAnother ? '✓ Keep adding more' : 'Keep adding more'}
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
