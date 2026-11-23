/**
 * The API uses ISO local date-times without time zone (2030-01-31T10:00:00).
 * `<input type="datetime-local">` produces the same format minus seconds.
 */

const MINUTES_PER_DAY = 24 * 60;

/** Value suitable for a datetime-local input / the API, minutes precision. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** API date-time (with seconds) -> datetime-local input value. */
export function apiToInputValue(value: string): string {
  return value.slice(0, 16);
}

/** datetime-local input value -> API date-time. */
export function inputToApiValue(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

/** Mirrors the backend pricing rule: each started 24h period counts as a full day, minimum one. */
export function billableDays(pickup: string, dropoff: string): number {
  const minutes = (new Date(dropoff).getTime() - new Date(pickup).getTime()) / 60_000;
  return Math.max(1, Math.ceil(minutes / MINUTES_PER_DAY));
}
