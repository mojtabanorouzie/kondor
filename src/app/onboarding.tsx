import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/store/settings';

const PRIMARY = '#208AEF';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  { emoji: '🧠', titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body' },
  { emoji: '📊', titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { emoji: '🔓', titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { completeOnboarding } = useSettings();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const isLast = index === SLIDES.length - 1;

  function finish() {
    completeOnboarding();
    router.replace('/');
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }

  return (
    <View style={[styles.root, dark && styles.rootDark]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
            <ThemedText type="title" style={styles.title}>
              {t(item.titleKey)}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.body}>
              {t(item.bodyKey)}
            </ThemedText>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable style={styles.btn} onPress={next}>
        <ThemedText type="smallBold" style={styles.btnText}>
          {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
        </ThemedText>
      </Pressable>

      {!isLast && (
        <Pressable style={styles.skip} onPress={finish}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.skip')}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  rootDark: { backgroundColor: '#111' },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  emoji: { fontSize: 72, lineHeight: 88 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: Spacing.five },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  dotActive: { backgroundColor: PRIMARY, width: 24 },
  btn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginHorizontal: Spacing.four,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16 },
  skip: { marginTop: Spacing.three, padding: Spacing.two },
});
