import type { SyncBackend, SyncSnapshot } from '../types';

/**
 * Backend for a self-hosted Kondor sync server. Supports the delta protocol:
 *   GET  {baseUrl}/sync?since=<seq>  → partial snapshot + X-Sync-Seq header
 *   PUT  {baseUrl}/sync              → full or partial push; X-Sync-Seq in response
 *
 * `getToken` is called before every request and should return a valid JWT access
 * token (transparently refreshed via AuthProvider.getValidToken).
 */
export function restSyncBackend(
  baseUrl: string,
  getToken: () => Promise<string | null>,
): SyncBackend {
  const syncUrl = `${baseUrl.replace(/\/+$/, '')}/sync`;

  async function makeHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  return {
    async pull(since?: number) {
      const endpoint = since !== undefined && since > 0 ? `${syncUrl}?since=${since}` : syncUrl;
      const res = await fetch(endpoint, { headers: await makeHeaders() });

      const seq = Number(res.headers.get('X-Sync-Seq') ?? 0);

      if (res.status === 204 || res.status === 404) return { snapshot: null, seq };
      if (!res.ok) throw new Error(`Sync pull failed (${res.status})`);

      const text = await res.text();
      const snapshot = text ? (JSON.parse(text) as SyncSnapshot) : null;
      return { snapshot, seq };
    },

    async push(snapshot) {
      const res = await fetch(syncUrl, {
        method: 'PUT',
        headers: await makeHeaders(),
        body: JSON.stringify(snapshot),
      });
      if (!res.ok) throw new Error(`Sync push failed (${res.status})`);
      return Number(res.headers.get('X-Sync-Seq') ?? 0);
    },
  };
}
