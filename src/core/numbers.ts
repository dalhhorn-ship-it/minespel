// Rekenen numbers: parsing what a kid typed, comparing exactly, and showing Dutch style. Pure.
// No floating point is used for comparing, so 0,1 + 0,2 is exactly 0,3 (AC58).

export const THIN_SPACE = '\u202F'; // narrow no-break space, so a number never wraps

interface Decimal {
  negative: boolean;
  /** Digits without leading zeros ("0" for zero). */
  int: string;
  /** Digits without trailing zeros, "" when whole. */
  frac: string;
}

function build(negative: boolean, intRaw: string, fracRaw: string): Decimal {
  const int = intRaw.replace(/^0+(?=\d)/, '');
  const frac = fracRaw.replace(/0+$/, '');
  const zero = int === '0' && frac === '';
  return { negative: negative && !zero, int, frac };
}

/**
 * What the kid typed. Trim spaces, comma is the decimal mark, a digit is needed
 * on both sides of the comma. Dots, inner spaces, signs and letters are refused.
 * Returns null when it is not a complete number (Klaar stays grey).
 */
function parseTyped(input: string): Decimal | null {
  const m = /^(\d+)(?:,(\d+))?$/.exec(input.trim());
  if (!m) return null;
  return build(false, m[1] as string, m[2] ?? '');
}

/** An expected answer from content or a generator: a number, or a string with a dot or comma. */
function parseExpected(value: number | string): Decimal | null {
  const s = typeof value === 'number' ? numberToPlain(value) : value.trim().replace(',', '.');
  if (s === null) return null;
  const m = /^(-)?(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  return build(m[1] === '-', m[2] as string, m[3] ?? '');
}

function numberToPlain(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  // Absorbs float noise like 0.30000000000000004. Tenths and hundredths are far below 1e-9.
  const s = n.toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/** True when the typed text is a complete number. Used to enable the Klaar button (AC58). */
export function isCompleteNumber(input: string): boolean {
  return parseTyped(input) !== null;
}

/** The typed text as a plain JS number, or null when incomplete. For display only, never for comparing. */
export function parseNumberInput(input: string): number | null {
  const d = parseTyped(input);
  return d ? Number(`${d.int}${d.frac ? '.' + d.frac : ''}`) : null;
}

/** AC58: "3,5", "3,50" and "03,5" match 3.5; "35" does not. Incomplete input never matches. */
export function numberMatches(input: string, expected: number | string): boolean {
  const a = parseTyped(input);
  const b = parseExpected(expected);
  if (!a || !b) return false;
  return a.negative === b.negative && a.int === b.int && a.frac === b.frac;
}

// Whole tenths, for exact decimal sums.

/** 0.3 or "0,3" as the whole number 3. Null when it has more than one decimal or is not a number. */
export function toTenths(value: number | string): number | null {
  const d = parseExpected(value);
  if (!d || d.frac.length > 1) return null;
  const t = Number(d.int) * 10 + Number(d.frac || '0');
  return d.negative ? -t : t;
}

/** The whole number 3 as the string "0,3"; 35 as "3,5"; 30 as "3". */
export function formatTenths(tenths: number): string {
  if (!Number.isInteger(tenths)) throw new RangeError(`Not whole tenths: ${tenths}`);
  const neg = tenths < 0;
  const abs = Math.abs(tenths);
  const whole = Math.floor(abs / 10);
  const tenth = abs % 10;
  return formatNumber(`${neg ? '-' : ''}${whole}${tenth ? '.' + tenth : ''}`);
}

/**
 * Dutch display (AC121): comma decimals, a thin space between thousands, never a dot.
 * 10000 is "10 000", 3.5 is "3,5". Numbers below 1000 get no separator.
 */
export function formatNumber(value: number | string): string {
  const d = parseExpected(value);
  if (!d) throw new RangeError(`Cannot format ${String(value)}`);
  const grouped = d.int.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  return `${d.negative ? '-' : ''}${grouped}${d.frac ? ',' + d.frac : ''}`;
}
