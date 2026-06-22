import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { db } from './client';
import migrations from './migrations/migrations';

/**
 * Applies pending migrations before rendering children. Mount this near the
 * root of the app so the schema is ready before any screen queries the db.
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { success, error } = useMigrations(
    db as unknown as ExpoSQLiteDatabase,
    migrations,
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Database error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b00020', padding: 24, textAlign: 'center' },
});
