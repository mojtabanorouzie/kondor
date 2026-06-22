import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { openDatabase, type Database } from './client';
import migrations from './migrations/migrations';

const DbContext = createContext<Database | null>(null);

/** Access the migrated database. Must be used under a ready DatabaseProvider. */
export function useDatabase(): Database {
  const db = useContext(DbContext);
  if (!db) {
    throw new Error('useDatabase must be used within <DatabaseProvider>');
  }
  return db;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

/** Runs migrations on an open db, then provides it to the tree. */
function MigrationGate({
  db,
  children,
}: {
  db: Database;
  children: React.ReactNode;
}) {
  const { success, error } = useMigrations(
    db as unknown as ExpoSQLiteDatabase,
    migrations,
  );

  if (error) {
    return (
      <Centered>
        <Text style={styles.error}>Migration error: {error.message}</Text>
      </Centered>
    );
  }
  if (!success) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

/**
 * Opens the database asynchronously, applies migrations, and provides it via
 * context. Mount near the app root so the schema is ready before any query.
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [openError, setOpenError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    openDatabase()
      .then((opened) => {
        if (!cancelled) setDb(opened);
      })
      .catch((err) => {
        if (!cancelled) setOpenError(err as Error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (openError) {
    return (
      <Centered>
        <Text style={styles.error}>Database error: {openError.message}</Text>
      </Centered>
    );
  }
  if (!db) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  return <MigrationGate db={db}>{children}</MigrationGate>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b00020', padding: 24, textAlign: 'center' },
});
