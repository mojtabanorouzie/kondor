import type { SyncBackend, SyncSnapshot } from '../types';

const KEY = 'kondor-sync-snapshot';

/**
 * Browser-storage backend. A no-server stand-in "cloud" so the user can try
 * sync end-to-end on web; the snapshot survives reloads in localStorage.
 */
export function localStorageBackend(): SyncBackend {
  return {
    async pull() {
      if (typeof localStorage === 'undefined') return { snapshot: null, seq: 0 };
      const raw = localStorage.getItem(KEY);
      return { snapshot: raw ? (JSON.parse(raw) as SyncSnapshot) : null, seq: 0 };
    },
    async push(snapshot) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY, JSON.stringify(snapshot));
      }
      return 0;
    },
  };
}
