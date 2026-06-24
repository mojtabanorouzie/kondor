import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Simple key/value store for app preferences (language, theme, …). */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type AppSettingRow = typeof appSettings.$inferSelect;
