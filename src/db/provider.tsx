import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { openDatabase, type Database } from './client';

const DbContext = createContext<Database | null>(null);

/** Access the migrated database. Must be used under a ready DatabaseProvider. */
export function useDatabase(): Database {
  const db = useContext(DbContext);
  if (!db) {
    throw new Error('useDatabase must be used within <DatabaseProvider>');
  }
  return db;
}

/**
 * Opens the database (applying migrations) and provides it via context. Mount
 * near the app root so the schema is ready before any screen queries the db.
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    openDatabase()
      .then((opened) => {
        if (!cancelled) setDb(opened);
      })
      .catch((err) => {
        if (!cancelled) setError(err as Error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Database error: {error.message}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b00020', padding: 24, textAlign: 'center' },
});
