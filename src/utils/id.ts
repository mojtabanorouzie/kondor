/**
 * Generate a RFC4122 v4 UUID. Uses the platform crypto when available
 * (Hermes/modern browsers/Node), falling back to a Math.random implementation.
 * Local-only ids, so the fallback's weaker entropy is acceptable.
 */
export function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
