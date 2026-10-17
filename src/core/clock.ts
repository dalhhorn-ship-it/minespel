// Injectable clock and local calendar day helpers. Pure code never calls Date.now() itself.

export interface Clock {
  /** Milliseconds since 1970 (like Date.now()). */
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export interface FakeClock extends Clock {
  set(ms: number): void;
  advance(ms: number): void;
}

/** A clock for tests. It only moves when told to. It may also go back. */
export function createFakeClock(startMs = 0): FakeClock {
  let t = startMs;
  return {
    now: () => t,
    set: (ms) => {
      t = ms;
    },
    advance: (ms) => {
      t += ms;
    },
  };
}

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

/** Local calendar day of a time, like "2026-10-17". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(clock: Clock): string {
  return dayKey(clock.now());
}

function parseDay(day: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error(`Bad day key: ${day}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Days since an arbitrary fixed day, counted on the calendar (no time zone or DST drift). */
function dayNumber(day: string): number {
  const { y, m, d } = parseDay(day);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, n: number): string {
  const t = (dayNumber(day) + n) * 86_400_000;
  const d = new Date(t);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * The day to use for "is it due" checks. If the iPad clock was set back, we keep the latest
 * day we have seen, so due items stay due (AC118). Callers store the result as `lastSeenDay`.
 */
export function effectiveDay(clockDay: string, lastSeenDay: string | null | undefined): string {
  if (!lastSeenDay) return clockDay;
  return lastSeenDay > clockDay ? lastSeenDay : clockDay;
}

/** True when a due day has come. Never changes the stored due day. */
export function isDue(dueDay: string, effectiveToday: string): boolean {
  return dueDay <= effectiveToday;
}
