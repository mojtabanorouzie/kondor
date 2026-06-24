import type { SyncBackend, SyncSnapshot } from '../types';

/**
 * Reference backend for a real server. `GET {url}` returns the stored snapshot
 * (or 404 when none), `PUT {url}` stores it. Point it at any endpoint — e.g. a
 * thin Supabase Edge Function — to get real multi-device sync. An optional
 * bearer token is sent for auth.
 */
export function restSyncBackend(url: string, token?: string): SyncBackend {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return {
    async pull() {
      const res = await fetch(url, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Sync pull failed (${res.status})`);
      const text = await res.text();
      return text ? (JSON.parse(text) as SyncSnapshot) : null;
    },
    async push(snapshot) {
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(snapshot),
      });
      if (!res.ok) throw new Error(`Sync push failed (${res.status})`);
    },
  };
}
