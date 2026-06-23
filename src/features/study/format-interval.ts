/** Format a future interval (in ms from now) as a compact label like 10m, 1d, 3mo. */
export function formatInterval(ms: number): string {
  if (ms <= 0) return 'now';

  const minutes = ms / 60_000;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;

  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;

  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo`;

  return `${(days / 365).toFixed(1)}y`;
}
