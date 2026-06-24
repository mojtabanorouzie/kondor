import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { appSettings } from '../schema';

export const settingsRepository = {
  /** Load all settings as a plain key/value map. */
  async getAll(db: Database): Promise<Record<string, string>> {
    const rows = await db.select().from(appSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  /** Upsert a single setting. */
  async set(db: Database, key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  },

  async remove(db: Database, key: string): Promise<void> {
    await db.delete(appSettings).where(eq(appSettings.key, key));
  },
};
