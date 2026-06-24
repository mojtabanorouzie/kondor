import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: t('settings.privacy') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Data Storage">
          Kondor stores all your data — decks, cards, and review history — locally
          on your device using SQLite. Nothing is sent to any server unless you
          explicitly use the Sync feature.
        </Section>

        <Section title="Sync">
          When you press "Sync now," a snapshot of your collection is written to
          your browser's local storage (web) or to a server you configure. No
          data is shared with the Kondor developers.
        </Section>

        <Section title="Analytics & Crash Reporting">
          Kondor does not include any third-party analytics or advertising SDKs.
          No usage data, device identifiers, or personal information is collected
          or transmitted.
        </Section>

        <Section title="Import">
          Files you import (CSV, Anki .apkg, JSON backup) are read locally. For
          Anki imports on web, sql.js is loaded from a CDN (jsDelivr) — only the
          WebAssembly binary is fetched, not your card data.
        </Section>

        <Section title="Contact">
          Questions? Reach us at daeimoshtaba@gmail.com
        </Section>

        <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
          Last updated: June 2026
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <>
      <ThemedText type="smallBold" style={styles.heading}>
        {title}
      </ThemedText>
      <ThemedText style={styles.para}>{children}</ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  heading: { marginTop: Spacing.three },
  para: { lineHeight: 22 },
  date: { marginTop: Spacing.four, textAlign: 'center' },
});
