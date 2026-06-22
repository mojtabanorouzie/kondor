import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo', // generates migrations bundled for expo-sqlite
} satisfies Config;
