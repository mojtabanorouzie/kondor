import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CardContent } from '@/components/card-content';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useStudySession } from '@/features/study/use-study-session';
import { renderCard } from '@/services/templating';
import { Grade } from '@/types';

const GRADE_COLOR: Record<Grade, string> = {
  [Grade.Again]: '#e5484d',
  [Grade.Hard]: '#e0a23b',
  [Grade.Good]: '#2eb872',
  [Grade.Easy]: '#3c87f7',
};
const GRADE_KEY: Record<Grade, string> = {
  [Grade.Again]: 'study.again',
  [Grade.Hard]: 'study.hard',
  [Grade.Good]: 'study.good',
  [Grade.Easy]: 'study.easy',
};

export default function StudyScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useStudySession(id);
  const { current, revealed, reveal, grade, undo, canUndo, busy } = session;

  // Web keyboard shortcuts: space reveals, 1–4 grade, u/z undo.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && current && !revealed) {
        e.preventDefault();
        reveal();
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        const map = [Grade.Again, Grade.Hard, Grade.Good, Grade.Easy];
        grade(map[Number(e.key) - 1]);
      } else if ((e.key === 'u' || e.key === 'z') && canUndo) {
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, canUndo, reveal, grade, undo]);

  const undoButton = canUndo ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('study.undo')}
      onPress={undo}
      hitSlop={12}>
      <ThemedText type="link">{t('study.undo')}</ThemedText>
    </Pressable>
  ) : null;

  if (session.loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('study.title') }} />
        <ActivityIndicator style={styles.loader} />
      </Screen>
    );
  }

  if (session.error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('study.title') }} />
        <EmptyState title={t('study.errorTitle')} message={session.error.message} />
      </Screen>
    );
  }

  if (session.done) {
    const s = session.summary;
    return (
      <Screen>
        <Stack.Screen options={{ title: t('study.title') }} />
        {s.total === 0 ? (
          <EmptyState title={t('study.allCaughtTitle')} message={t('study.allCaughtMessage')} />
        ) : (
          <View style={styles.summary}>
            <ThemedText type="title" style={styles.center}>
              {t('study.doneTitle')}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {t('study.reviewed', { count: s.total })}
            </ThemedText>
            <View style={styles.summaryRow}>
              <Tally label={t('study.again')} value={s.again} color={GRADE_COLOR[Grade.Again]} />
              <Tally label={t('study.hard')} value={s.hard} color={GRADE_COLOR[Grade.Hard]} />
              <Tally label={t('study.good')} value={s.good} color={GRADE_COLOR[Grade.Good]} />
              <Tally label={t('study.easy')} value={s.easy} color={GRADE_COLOR[Grade.Easy]} />
            </View>
          </View>
        )}
        <Button title={t('common.finish')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('study.title'), headerRight: () => undoButton }} />
      <View style={styles.progress}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('study.left', { count: session.remaining })}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.cardArea} keyboardShouldPersistTaps="handled">
        {current ? (
          <CardContent
            content={renderCard(current.noteKind, current.noteFields, current.templateIndex).front}
            type="subtitle"
          />
        ) : null}
        {revealed && current && (
          <>
            <ThemedView type="backgroundElement" style={styles.divider} />
            <CardContent
              content={renderCard(current.noteKind, current.noteFields, current.templateIndex).back}
              type="default"
            />
          </>
        )}
      </ScrollView>

      <View style={styles.controls}>
        {!revealed ? (
          <Button title={t('study.showAnswer')} onPress={reveal} />
        ) : (
          <View style={styles.grades}>
            {session.predictions.map((p) => (
              <Pressable
                key={p.grade}
                accessibilityRole="button"
                accessibilityLabel={t(GRADE_KEY[p.grade])}
                disabled={busy}
                onPress={() => grade(p.grade)}
                style={({ pressed }) => [
                  styles.gradeButton,
                  { backgroundColor: GRADE_COLOR[p.grade], opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText type="smallBold" style={styles.gradeName}>
                  {t(GRADE_KEY[p.grade])}
                </ThemedText>
                <ThemedText type="small" style={styles.gradeLabel}>
                  {p.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function Tally({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.tally}>
      <ThemedText type="subtitle" style={{ color }}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  loader: { marginTop: Spacing.six },
  progress: { alignItems: 'center', paddingVertical: Spacing.three },
  cardArea: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  controls: { padding: Spacing.four, gap: Spacing.three },
  grades: { flexDirection: 'row', gap: Spacing.two },
  gradeButton: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 2,
    minHeight: 56,
    justifyContent: 'center',
  },
  gradeName: { color: '#ffffff' },
  gradeLabel: { color: 'rgba(255,255,255,0.85)' },
  summary: { flex: 1, justifyContent: 'center', gap: Spacing.four },
  summaryRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.five },
  tally: { alignItems: 'center' },
});
