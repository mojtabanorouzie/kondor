import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import { deckRepository } from '@/db/repositories';

export default function NewDeckScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    setSaving(true);
    try {
      await deckRepository.create(db, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('deckForm.titleNew') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label={t('deckForm.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('deckForm.namePlaceholder')}
          autoFocus
        />
        <TextField
          label={t('deckForm.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('deckForm.descriptionPlaceholder')}
          multiline
        />
        <Button title={t('deckForm.create')} onPress={save} disabled={!canSave} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four },
});
