// The Rekenen generator (PRD 4.10, ARCHITECTURE "Built in Rekenen"). Items are not stored.
// The id describes the sum, so the item can be rebuilt from the id: tafels:7x8, delen:56:7,
// tafels:30x7, optellen:47+38, aftrekken:83-47 and optellen:d34+57 (3,4 + 5,7, in tenths).
// Items are TypeItems with a plain numeric answer, checked with checkAnswer(item, response, true).
// Everything is seeded with createRng, so a failing test can be replayed. No sum is negative.
import { formatNumber, formatTenths } from '../../core/numbers';
import { shuffle, type Rng } from '../../core/rng';
import type { TypeItem } from '../format';
import { REKENEN_LEVELS, REKENEN_TOPICS } from './module';
import type { RekenenTopicId } from './module';
import { answerOf, workedExample } from './worked-example';
import type { Sum, WorkedExample } from './worked-example';

export type RekenenLevel = (typeof REKENEN_LEVELS)[number];

const TABLES_M6 = [1, 2, 3, 4, 5, 10];
const TABLES_E6 = [6, 7, 8, 9];

const isLevel = (v: string): v is RekenenLevel => (REKENEN_LEVELS as readonly string[]).includes(v);
const isTopic = (v: string): v is RekenenTopicId => (REKENEN_TOPICS as readonly string[]).includes(v);

// ---------- ids ----------

/** A parsed id: the sum plus the topic. Level and skill come from `levelOf` and `skillOf`. */
interface Parsed {
  topic: RekenenTopicId;
  sum: Sum;
}

/** "07" or "1e3" are not canonical numbers, so they are refused. */
function whole(text: string | undefined): number | null {
  if (text === undefined || !/^\d+$/.test(text)) return null;
  const n = Number(text);
  return String(n) === text ? n : null;
}

function parseId(id: string): Parsed | null {
  let m = /^optellen:(d?)(\d+)\+(\d+)$/.exec(id);
  if (m) {
    const a = whole(m[2]);
    const b = whole(m[3]);
    return a === null || b === null ? null : { topic: 'optellen', sum: { kind: 'plus', a, b, decimal: m[1] === 'd' } };
  }
  m = /^aftrekken:(d?)(\d+)-(\d+)$/.exec(id);
  if (m) {
    const a = whole(m[2]);
    const b = whole(m[3]);
    if (a === null || b === null || b > a) return null;
    return { topic: 'aftrekken', sum: { kind: 'min', a, b, decimal: m[1] === 'd' } };
  }
  m = /^tafels:(\d+)x(\d+)$/.exec(id);
  if (m) {
    const a = whole(m[1]);
    const b = whole(m[2]);
    return a === null || b === null ? null : { topic: 'tafels', sum: { kind: 'keer', a, b } };
  }
  m = /^delen:(\d+):(\d+)$/.exec(id);
  if (m) {
    const n = whole(m[1]);
    const d = whole(m[2]);
    if (n === null || d === null || d === 0 || n % d !== 0) return null;
    return { topic: 'delen', sum: { kind: 'deel', n, d } };
  }
  return null;
}

/** The id of a sum. */
export function idOf(topic: RekenenTopicId, sum: Sum): string {
  switch (sum.kind) {
    case 'plus':
      return `optellen:${sum.decimal ? 'd' : ''}${sum.a}+${sum.b}`;
    case 'min':
      return `aftrekken:${sum.decimal ? 'd' : ''}${sum.a}-${sum.b}`;
    case 'keer':
      return `${topic}:${sum.a}x${sum.b}`;
    case 'deel':
      return `${topic}:${sum.n}:${sum.d}`;
  }
}

/** The level of a tafels or delen fact, or null when the numbers are not in any level. */
function factLevel(sum: Sum): RekenenLevel | null {
  if (sum.kind === 'keer') {
    const { a, b } = sum;
    if (a >= 1 && a <= 10 && b >= 1 && b <= 10) {
      if (TABLES_M6.includes(a)) return 'M6';
      if (TABLES_E6.includes(a)) return 'E6';
      return null;
    }
    if (a >= 20 && a <= 90 && a % 10 === 0 && b >= 2 && b <= 9) return 'M7';
    if (a >= 11 && a <= 99 && a % 10 !== 0 && b >= 2 && b <= 9) return 'E7';
    return null;
  }
  if (sum.kind !== 'deel') return null;
  const { n, d } = sum;
  const q = n / d;
  if (d >= 1 && d <= 10 && q >= 1 && q <= 10) {
    if (TABLES_M6.includes(d)) return 'M6';
    if (TABLES_E6.includes(d)) return 'E6';
    return null;
  }
  if (d >= 2 && d <= 9 && q >= 20 && q <= 90 && q % 10 === 0) return 'M7';
  if (d >= 2 && d <= 9 && n >= 100 && n <= 999 && q % 10 !== 0) return 'E7';
  return null;
}

/** The biggest number of a level, in tenths for E7. */
const MAX: Readonly<Record<RekenenLevel, number>> = { M6: 100, E6: 1000, M7: 10000, E7: 1000 };

/** The level of an open (plus or minus) sum by size. A guess: the caller can pass the real level. */
function openLevel(sum: Sum): RekenenLevel | null {
  if (sum.kind !== 'plus' && sum.kind !== 'min') return null;
  if (sum.decimal) return sum.a <= MAX.E7 && sum.b <= MAX.E7 && sum.a + (sum.kind === 'plus' ? sum.b : 0) <= MAX.E7 ? 'E7' : null;
  const top = sum.kind === 'plus' ? sum.a + sum.b : sum.a;
  if (top <= MAX.M6) return 'M6';
  if (top <= MAX.E6) return 'E6';
  if (top <= MAX.M7) return 'M7';
  return null;
}

/** The level of an id. Facts know their own level. Plus and minus sums are guessed by size. */
export function levelOfId(id: string): RekenenLevel | null {
  const p = parseId(id);
  return p ? (factLevel(p.sum) ?? openLevel(p.sum)) : null;
}

/** The skill of a sum at a level. */
function skillOf(sum: Sum, level: RekenenLevel): string {
  if (sum.kind === 'plus' || sum.kind === 'min') return sum.kind;
  if (sum.kind === 'keer') {
    if (level === 'M7') return 'tientallen-keer';
    if (level === 'E7') return 'twee-cijfers-keer';
    return `tafel-${sum.a}`;
  }
  if (sum.kind !== 'deel') return sum.kind;
  if (level === 'M7') return 'tientallen-delen';
  if (level === 'E7') return 'drie-cijfers-delen';
  return `deel-${sum.d}`;
}

// ---------- items ----------

const SIGN: Readonly<Record<string, string>> = { plus: '+', min: '-', keer: '×', deel: ':' };

function show(sum: Sum, n: number): string {
  return 'decimal' in sum && sum.decimal ? formatTenths(n) : formatNumber(n);
}

/** The sum as text, for example "7 × 8" or "3,4 + 5,7". */
export function sumText(sum: Sum): string {
  switch (sum.kind) {
    case 'plus':
    case 'min':
      return `${show(sum, sum.a)} ${SIGN[sum.kind]} ${show(sum, sum.b)}`;
    case 'keer':
      return `${formatNumber(sum.a)} × ${formatNumber(sum.b)}`;
    case 'deel':
      return `${formatNumber(sum.n)} : ${formatNumber(sum.d)}`;
  }
}

const HINT: Readonly<Record<string, string>> = {
  plus: 'Splits het tweede getal en tel stap voor stap.',
  min: 'Splits het tweede getal en haal stap voor stap eraf.',
  keer: 'Splits de som in stukjes die je al kent.',
  deel: 'Delen is omgekeerd keer.',
};

function buildItem(topic: RekenenTopicId, sum: Sum, level: RekenenLevel): TypeItem {
  const answer = answerOf(sum);
  const shown = sum.kind === 'plus' || sum.kind === 'min' ? answerShown(sum, answer) : formatNumber(answer);
  return {
    id: idOf(topic, sum),
    type: 'type',
    level,
    skill: skillOf(sum, level),
    prompt: `${sumText(sum)} = ?`,
    explain: `${sumText(sum)} = ${shown}. ${HINT[sum.kind]}`,
    answer: [answer],
  };
}

function answerShown(sum: Sum, answer: string): string {
  return 'decimal' in sum && sum.decimal ? answer : formatNumber(answer);
}

/**
 * Rebuild an item from its id alone. Plus and minus ids do not say their level, so pass it
 * (it is saved in the progress record); without it the level is guessed by size.
 * Returns null for an id that is not a Rekenen sum, a sum outside its level or a wrong level.
 */
export function itemFromId(id: string, level?: string): TypeItem | null {
  const p = parseId(id);
  if (!p) return null;
  const fixed = factLevel(p.sum);
  const guess = fixed ?? openLevel(p.sum);
  if (level !== undefined && !isLevel(level)) return null;
  const lv = (level as RekenenLevel | undefined) ?? guess;
  if (!lv) return null;
  if (fixed !== null && fixed !== lv) return null;
  if (fixed === null && !inOpenRange(p.sum, lv)) return null;
  return buildItem(p.topic, p.sum, lv);
}

function inOpenRange(sum: Sum, level: RekenenLevel): boolean {
  if (sum.kind !== 'plus' && sum.kind !== 'min') return false;
  const top = sum.kind === 'plus' ? sum.a + sum.b : sum.a;
  if (sum.decimal !== (level === 'E7')) return false;
  return top <= MAX[level];
}

/** The worked example of an item, rebuilt from its id. Null when the id is not a Rekenen sum. */
export function workedExampleOf(id: string, level?: string): WorkedExample | null {
  const item = itemFromId(id, level);
  const p = parseId(id);
  return item && p ? workedExample(p.sum) : null;
}

// ---------- fixed sets: tafels and delen ----------

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const factCache = new Map<string, readonly string[]>();

/** Every fact id of tafels or delen at a level (a fixed, enumerable set). Empty for other topics. */
export function factIds(topic: RekenenTopicId, level: RekenenLevel): readonly string[] {
  const key = `${topic}/${level}`;
  const cached = factCache.get(key);
  if (cached) return cached;
  const ids: string[] = [];
  if (topic === 'tafels' || topic === 'delen') {
    const keer = topic === 'tafels';
    if (level === 'M6' || level === 'E6') {
      for (const t of level === 'M6' ? TABLES_M6 : TABLES_E6) {
        for (const q of range(1, 10)) ids.push(keer ? `tafels:${t}x${q}` : `delen:${t * q}:${t}`);
      }
    } else if (level === 'M7') {
      for (const d of range(2, 9)) {
        for (const k of range(2, 9)) ids.push(keer ? `tafels:${k * 10}x${d}` : `delen:${d * k * 10}:${d}`);
      }
    } else if (keer) {
      for (const a of range(11, 99)) {
        if (a % 10 !== 0) for (const b of range(2, 9)) ids.push(`tafels:${a}x${b}`);
      }
    } else {
      for (const d of range(2, 9)) {
        for (const n of range(100, 999)) if (n % d === 0 && (n / d) % 10 !== 0) ids.push(`delen:${n}:${d}`);
      }
    }
  }
  factCache.set(key, ids);
  return ids;
}

const poolCache = new Map<string, readonly string[]>();

/** Fact ids of the given skills (all when none given). Cached: filtering rebuilds every item once. */
function idsOfSkills(topic: RekenenTopicId, level: RekenenLevel, skills: readonly string[] | undefined): readonly string[] {
  const all = factIds(topic, level);
  if (!skills) return all;
  const key = `${topic}/${level}/${[...skills].sort().join(',')}`;
  const cached = poolCache.get(key);
  if (cached) return cached;
  const pool = all.filter((id) => {
    const item = itemFromId(id, level);
    return item !== null && skills.includes(item.skill);
  });
  poolCache.set(key, pool);
  return pool;
}

// ---------- open sets: optellen and aftrekken ----------

function drawPlus(level: RekenenLevel, rng: Rng): Sum {
  switch (level) {
    case 'M6': {
      // Crossing the ten: the ones add up to 10 or more. The sum stays up to 100.
      const x = rng.int(1, 9);
      const y = rng.int(10 - x, 9);
      const ta = rng.int(1, 7);
      const tb = rng.int(1, 8 - ta);
      return { kind: 'plus', a: ta * 10 + x, b: tb * 10 + y, decimal: false };
    }
    case 'E6': {
      const a = rng.int(100, 900);
      return { kind: 'plus', a, b: rng.int(11, 1000 - a), decimal: false };
    }
    case 'M7': {
      const a = rng.int(1000, 9000);
      return { kind: 'plus', a, b: rng.int(101, 10000 - a), decimal: false };
    }
    case 'E7': {
      for (;;) {
        const a = rng.int(11, 989);
        const b = rng.int(11, 1000 - a);
        if (a % 10 !== 0 || b % 10 !== 0) return { kind: 'plus', a, b, decimal: true };
      }
    }
  }
}

function drawMin(level: RekenenLevel, rng: Rng): Sum {
  switch (level) {
    case 'M6': {
      // Crossing the ten: the ones of the second number are bigger than the ones of the first.
      const x = rng.int(0, 8);
      const y = rng.int(x + 1, 9);
      const ta = rng.int(2, 9);
      const tb = rng.int(1, ta - 1);
      return { kind: 'min', a: ta * 10 + x, b: tb * 10 + y, decimal: false };
    }
    case 'E6': {
      const a = rng.int(101, 1000);
      return { kind: 'min', a, b: rng.int(11, a - 1), decimal: false };
    }
    case 'M7': {
      const a = rng.int(1001, 10000);
      return { kind: 'min', a, b: rng.int(101, a - 1), decimal: false };
    }
    case 'E7': {
      for (;;) {
        const a = rng.int(21, 1000);
        const b = rng.int(11, a - 1);
        if (a % 10 !== 0 || b % 10 !== 0) return { kind: 'min', a, b, decimal: true };
      }
    }
  }
}

function pick<T>(list: readonly T[], rng: Rng): T {
  return list[rng.int(0, list.length - 1)] as T;
}

function checkLevel(topic: RekenenTopicId, level: string): RekenenLevel {
  if (!isLevel(level) || !isTopic(topic)) throw new RangeError(`Unknown Rekenen topic or level: ${topic} ${level}`);
  return level;
}

/** One item of a topic and level. Optionally only from the given skills. */
export function generateItem(topic: RekenenTopicId, level: string, rng: Rng, skills?: readonly string[]): TypeItem {
  const lv = checkLevel(topic, level);
  if (topic === 'optellen' || topic === 'aftrekken') {
    const sum = topic === 'optellen' ? drawPlus(lv, rng) : drawMin(lv, rng);
    return buildItem(topic, sum, lv);
  }
  const pool = idsOfSkills(topic, lv, skills);
  if (pool.length === 0) throw new RangeError(`No ${topic} items for ${lv} with those skills`);
  const item = itemFromId(pick(pool, rng), lv);
  if (!item) throw new Error('unreachable: fact id did not rebuild');
  return item;
}

export interface GenerateOptions {
  /** Only these skills (tafels and delen). */
  skills?: readonly string[];
  /** Ids that must not come back (already asked, or saved as wrong). */
  exclude?: ReadonlySet<string>;
}

/**
 * `count` different items of a topic and level (AC125). Fewer come back only when the fixed set
 * of tafels or delen facts is smaller than `count`. Same seed, same items.
 */
export function generateItems(
  topic: RekenenTopicId,
  level: string,
  count: number,
  rng: Rng,
  options: GenerateOptions = {},
): TypeItem[] {
  const lv = checkLevel(topic, level);
  const exclude = options.exclude ?? new Set<string>();
  if (topic === 'tafels' || topic === 'delen') {
    const pool = shuffle(idsOfSkills(topic, lv, options.skills), rng).filter((id) => !exclude.has(id));
    return pool.slice(0, count).map((id) => itemFromId(id, lv) as TypeItem);
  }
  const seen = new Set<string>(exclude);
  const out: TypeItem[] = [];
  for (let tries = 0; out.length < count && tries < count * 100 + 100; tries++) {
    const item = generateItem(topic, lv, rng);
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * The questions of one Rekentoets: `count` items for the level, split over the topics by the
 * mix weights, no item twice, in mixed order. Skills are not filtered in an exam.
 */
export function generateExamItems(
  level: string,
  count: number,
  rng: Rng,
  mix: Readonly<Record<string, number>> = { optellen: 1, aftrekken: 1, tafels: 1, delen: 1 },
): TypeItem[] {
  const topics = REKENEN_TOPICS.filter((t) => (mix[t] ?? 0) > 0);
  const total = topics.reduce((s, t) => s + (mix[t] as number), 0);
  const share = topics.map((t) => Math.floor((count * (mix[t] as number)) / total));
  let left = count - share.reduce((s, n) => s + n, 0);
  for (let i = 0; left > 0; i = (i + 1) % topics.length, left--) share[i] = (share[i] as number) + 1;
  const items = topics.flatMap((t, i) => generateItems(t, level, share[i] as number, rng));
  return shuffle(items, rng);
}
