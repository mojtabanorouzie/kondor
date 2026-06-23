import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { NoteKind } from '@/types';

import { fieldsForKind } from './card-service';

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
  return (
    <View style={styles.toggle}>
      <Button
        title="Basic"
        variant={value === 'basic' ? 'primary' : 'secondary'}
        onPress={() => onChange('basic')}
        style={styles.toggleButton}
      />
      <Button
        title="Cloze"
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
  return (
    <>
      {fieldsForKind(kind).map((name, i) => (
        <TextField
          key={name}
          label={name === 'Extra' ? 'Extra (optional)' : name}
          value={fields[name] ?? ''}
          onChangeText={(v) => onChange(name, v)}
          autoFocus={i === 0}
          multiline
        />
      ))}
      {kind === 'cloze' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Wrap hidden parts like {'{{c1::answer}}'}. Each c1, c2… makes its own
          card.
        </ThemedText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: Spacing.two },
  toggleButton: { flex: 1 },
});
