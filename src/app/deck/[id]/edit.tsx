import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db';
import { deckRepository } from '@/db/repositories';

export default function EditDeckScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    deckRepository.getById(db, id).then((deck) => {
      if (!cancelled && deck) {
        setName(deck.name);
        setDescription(deck.description ?? '');
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  async function save() {
    setSaving(true);
    try {
      await deckRepository.update(db, id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deckRepository.remove(db, id);
    router.dismissTo('/');
  }

  if (!loaded) {
    return (
      <Screen>
        <ActivityIndicator style={styles.center} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('deckForm.titleEdit') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextField label={t('deckForm.name')} value={name} onChangeText={setName} autoFocus />
        <TextField
          label={t('deckForm.description')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Button
          title={t('deckForm.save')}
          onPress={save}
          disabled={name.trim().length === 0 || saving}
          loading={saving}
        />

        <ThemedText type="small" themeColor="textSecondary" style={styles.danger}>
          {t('deckForm.deleteHint')}
        </ThemedText>
        <Button
          title={confirmingDelete ? t('deckForm.deleteConfirm') : t('deckForm.delete')}
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
  danger: { marginTop: Spacing.four },
});
