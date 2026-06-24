import type { SyncBackend, SyncSnapshot } from '../types';

const KEY = 'kondor-sync-snapshot';

/**
 * Browser-storage backend. A no-server stand-in "cloud" so the user can try
 * sync end-to-end on web; the snapshot survives reloads in localStorage.
 */
export function localStorageBackend(): SyncBackend {
  return {
    async pull() {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as SyncSnapshot) : null;
    },
    async push(snapshot) {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEY, JSON.stringify(snapshot));
    },
  };
}
