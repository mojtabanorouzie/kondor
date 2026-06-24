import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { NoteKind } from '@/types';

import { fieldsForKind } from './card-service';

const FIELD_LABEL: Record<string, string> = {
  Front: 'cardForm.front',
  Back: 'cardForm.back',
  Text: 'cardForm.text',
  Extra: 'cardForm.extra',
};

/** Whether the required fields for a kind are filled. */
export function isNoteValid(
  kind: NoteKind,
  fields: Record<string, string>,
): boolean {
  if (kind === 'cloze') return (fields.Text ?? '').trim().length > 0;
  return (
    (fields.Front ?? '').trim().length > 0 &&
    (fields.Back ?? '').trim().length > 0
  );
}

export function KindToggle({
  value,
  onChange,
}: {
  value: NoteKind;
  onChange: (kind: NoteKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.toggle}>
      <Button
        title={t('cardForm.basic')}
        variant={value === 'basic' ? 'primary' : 'secondary'}
        onPress={() => onChange('basic')}
        style={styles.toggleButton}
      />
      <Button
        title={t('cardForm.cloze')}
        variant={value === 'cloze' ? 'primary' : 'secondary'}
        onPress={() => onChange('cloze')}
        style={styles.toggleButton}
      />
    </View>
  );
}

export function NoteFields({
  kind,
  fields,
  onChange,
}: {
  kind: NoteKind;
  fields: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {fieldsForKind(kind).map((name, i) => (
        <TextField
          key={name}
          label={t(FIELD_LABEL[name] ?? name)}
          value={fields[name] ?? ''}
          onChangeText={(v) => onChange(name, v)}
          autoFocus={i === 0}
          multiline
        />
      ))}
      {kind === 'cloze' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('cardForm.clozeHint', { example: '{{c1::answer}}' })}
        </ThemedText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: Spacing.two },
  toggleButton: { flex: 1 },
});
