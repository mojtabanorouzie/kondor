import type { SyncBackend, SyncSnapshot } from '../types';

/** In-memory backend — used by tests to simulate a shared remote. */
export function memoryBackend(initial: SyncSnapshot | null = null): SyncBackend {
  let store = initial;
  return {
    async pull() {
      return { snapshot: store, seq: 0 };
    },
    async push(snapshot) {
      store = snapshot;
      return 0;
    },
  };
}
