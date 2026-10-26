// Learning progress stats for the parent Voortgang screen (decision 115): a week report, a 12 week trend,
// learning and play time per day, every topic with its trend, and the hardest questions.
// Pure: it only reads the logs it is given. No DOM, no storage, no clock.
import { addDays, daysBetween } from '../core/clock';
import type { AnswerRecord, BreakRecord, ExamRecord, LedgerRecord } from '../storage/log-store';
import type { StatsRecord } from '../storage/schema';

/** A known Monday. Weeks run Monday to Sunday, as at Dutch schools. */
const MONDAY = '2024-01-01';
/** A topic needs this many first answers in a period before it counts as strong, weak or changed. */
export const MIN_FOR_TREND = 5;
/** Percent points a topic must move between two periods to count as better or lower. */
export const TREND_STEP = 10;
export const WEEKS_SHOWN = 12;
export const DAYS_SHOWN = 14;
export const HARD_SHOWN = 10;

export interface ProgressInput {
  answers: readonly AnswerRecord[];
  breaks: readonly BreakRecord[];
  exams: readonly ExamRecord[];
  ledger: readonly LedgerRecord[];
  stats: StatsRecord;
  /** The local calendar day of today, "2026-10-26". */
  today: string;
  /** "Module: topic" for a topic id, for labels. */
  topicLabel?: (moduleId: string, topic: string) => string;
  /** The question text and the explanation with the right answer, when the item is known. */
  itemText?: (moduleId: string, itemId: string) => { prompt: string; explain: string } | null;
}

export interface WeekNumbers {
  /** Monday of the week. */
  start: string;
  /** Questions answered: first tries. */
  questions: number;
  firstTryRight: number;
  /** Percent right on the first try, null without questions. */
  pct: number | null;
  breaks: number;
  exams: number;
  examsPassed: number;
  learnMs: number;
  playMs: number;
  pointsEarned: number;
  pointsSpent: number;
  /** Days with any question or play time. */
  daysActive: number;
}

export interface TopicStats {
  moduleId: string;
  topic: string;
  label: string;
  answered: number;
  pctAll: number | null;
  /** Last 30 days. */
  pct30: number | null;
  /** The last 14 days against the 14 before. Null when either has fewer than MIN_FOR_TREND answers. */
  trend: 'beter' | 'lager' | 'gelijk' | null;
}

export interface HardQuestion {
  moduleId: string;
  itemId: string;
  label: string;
  prompt: string;
  explain: string;
  wrong: number;
  lastGiven: string;
}

export interface DayTime {
  day: string;
  learnMs: number;
  playMs: number;
}

export interface WeekReport {
  thisWeek: WeekNumbers;
  lastWeek: WeekNumbers;
  /** Best topic this week by first try percent, at least MIN_FOR_TREND answers. */
  strongest: TopicStats | null;
  /** Weakest topic this week, at least MIN_FOR_TREND answers and below 80 percent. */
  weakest: TopicStats | null;
  /** Short Dutch sentences for the parent. */
  lines: string[];
}

export interface ProgressStats {
  report: WeekReport;
  weeks: WeekNumbers[];
  days: DayTime[];
  topics: TopicStats[];
  hard: HardQuestion[];
  /** First answers ever. */
  totalQuestions: number;
}

/** Monday of the week of a day. */
export function weekStart(day: string): string {
  const n = daysBetween(MONDAY, day);
  return addDays(day, -(((n % 7) + 7) % 7));
}

export function pct(right: number, total: number): number | null {
  return total > 0 ? Math.round((right / total) * 100) : null;
}

const inRange = (day: string, from: string, to: string) => day >= from && day <= to;
const firstTries = (answers: readonly AnswerRecord[]) => answers.filter((a) => a.try === 1);
const topicKey = (a: Pick<AnswerRecord, 'moduleId' | 'topic'>) => `${a.moduleId}\u0000${a.topic}`;

/** Learning time per day: whole breaks and exams, plus the answer time of Extra oefenen and the village. */
function learnMsPerDay(input: ProgressInput): Map<string, number> {
  const out = new Map<string, number>();
  const add = (day: string, ms: number) => {
    if (Number.isFinite(ms) && ms > 0) out.set(day, (out.get(day) ?? 0) + ms);
  };
  for (const b of input.breaks) add(b.day, b.end - b.start);
  for (const e of input.exams) add(e.day, e.end - e.start);
  for (const a of input.answers) {
    if (a.context === 'practice' || a.context === 'dorp') add(a.day, Math.min(a.ms, 120_000));
  }
  return out;
}

function weekNumbers(input: ProgressInput, start: string, learn: Map<string, number>): WeekNumbers {
  const end = addDays(start, 6);
  const first = firstTries(input.answers).filter((a) => inRange(a.day, start, end));
  const right = first.filter((a) => a.correct).length;
  const exams = input.exams.filter((e) => inRange(e.day, start, end) && e.status === 'done');
  const ledger = input.ledger.filter((l) => inRange(l.day, start, end));
  const active = new Set<string>(first.map((a) => a.day));
  let learnMs = 0;
  let playMs = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    learnMs += learn.get(day) ?? 0;
    const play = input.stats.playMsPerDay?.[day] ?? 0;
    if (play > 0) {
      playMs += play;
      active.add(day);
    }
  }
  return {
    start,
    questions: first.length,
    firstTryRight: right,
    pct: pct(right, first.length),
    breaks: input.breaks.filter((b) => inRange(b.day, start, end)).length,
    exams: exams.length,
    examsPassed: exams.filter((e) => e.passed).length,
    learnMs,
    playMs,
    pointsEarned: ledger.filter((l) => l.delta > 0 && l.reason !== 'tradein').reduce((s, l) => s + l.delta, 0),
    pointsSpent: -ledger.filter((l) => l.delta < 0 && l.reason === 'shop').reduce((s, l) => s + l.delta, 0),
    daysActive: active.size,
  };
}

function topicStats(input: ProgressInput, from?: string, to?: string): TopicStats[] {
  const groups = new Map<string, AnswerRecord[]>();
  for (const a of firstTries(input.answers)) {
    if (from && to && !inRange(a.day, from, to)) continue;
    const k = topicKey(a);
    const list = groups.get(k);
    if (list) list.push(a);
    else groups.set(k, [a]);
  }
  const t = input.today;
  const d30 = addDays(t, -29);
  const d14 = addDays(t, -13);
  const d28 = addDays(t, -27);
  const out: TopicStats[] = [];
  for (const list of groups.values()) {
    const { moduleId, topic } = list[0]!;
    const rate = (xs: AnswerRecord[]) => pct(xs.filter((a) => a.correct).length, xs.length);
    const recent = list.filter((a) => inRange(a.day, d14, t));
    const before = list.filter((a) => inRange(a.day, d28, addDays(d14, -1)));
    let trend: TopicStats['trend'] = null;
    if (recent.length >= MIN_FOR_TREND && before.length >= MIN_FOR_TREND) {
      const diff = (rate(recent) ?? 0) - (rate(before) ?? 0);
      trend = diff >= TREND_STEP ? 'beter' : diff <= -TREND_STEP ? 'lager' : 'gelijk';
    }
    out.push({
      moduleId,
      topic,
      label: input.topicLabel?.(moduleId, topic) ?? `${moduleId}: ${topic}`,
      answered: list.length,
      pctAll: rate(list),
      pct30: rate(list.filter((a) => inRange(a.day, d30, t))),
      trend,
    });
  }
  return out.sort((a, b) => b.answered - a.answered || a.label.localeCompare(b.label));
}

/** Up to HARD_SHOWN questions most often wrong on the first try in the last 30 days. */
function hardest(input: ProgressInput): HardQuestion[] {
  const from = addDays(input.today, -29);
  const byItem = new Map<string, { a: AnswerRecord; wrong: number }>();
  for (const a of firstTries(input.answers)) {
    if (a.correct || !inRange(a.day, from, input.today)) continue;
    const k = `${a.moduleId}\u0000${a.itemId}`;
    const seen = byItem.get(k);
    if (!seen) byItem.set(k, { a, wrong: 1 });
    else {
      seen.wrong++;
      if (a.ts >= seen.a.ts) seen.a = a;
    }
  }
  return [...byItem.values()]
    .sort((x, y) => y.wrong - x.wrong || y.a.ts - x.a.ts)
    .slice(0, HARD_SHOWN)
    .map(({ a, wrong }) => {
      const text = input.itemText?.(a.moduleId, a.itemId) ?? null;
      return {
        moduleId: a.moduleId,
        itemId: a.itemId,
        label: input.topicLabel?.(a.moduleId, a.topic) ?? `${a.moduleId}: ${a.topic}`,
        prompt: text?.prompt ?? a.itemId,
        explain: text?.explain ?? '',
        wrong,
        lastGiven: a.given,
      };
    });
}

export function minutes(ms: number): number {
  return Math.round(ms / 60_000);
}

function changeWord(now: number, before: number, unit: string): string {
  if (before === 0 && now === 0) return '';
  const diff = now - before;
  if (diff === 0) return ` (net als vorige week)`;
  return ` (${diff > 0 ? '+' : ''}${diff}${unit} t.o.v. vorige week)`;
}

function reportLines(w: WeekNumbers, last: WeekNumbers, strongest: TopicStats | null, weakest: TopicStats | null): string[] {
  if (w.questions === 0 && w.playMs === 0) {
    return ['Deze week is er nog niet gespeeld of geleerd.'];
  }
  const lines: string[] = [];
  lines.push(
    `Deze week ${w.questions} ${w.questions === 1 ? 'vraag' : 'vragen'} beantwoord op ${w.daysActive} ${w.daysActive === 1 ? 'dag' : 'dagen'}` +
      `${changeWord(w.questions, last.questions, '')}.`,
  );
  if (w.pct !== null) {
    const was = last.pct !== null ? changeWord(w.pct, last.pct, ' procentpunt') : '';
    lines.push(`${w.pct}% was meteen goed${was}.`);
  }
  lines.push(`${minutes(w.learnMs)} minuten geleerd en ${minutes(w.playMs)} minuten gespeeld.`);
  if (w.exams > 0) lines.push(`${w.exams} ${w.exams === 1 ? 'examen' : 'examens'} gedaan, ${w.examsPassed} gehaald.`);
  if (strongest) lines.push(`Sterk deze week: ${strongest.label} (${strongest.pct30 ?? strongest.pctAll}% goed).`);
  if (weakest) lines.push(`Kan nog wat oefening gebruiken: ${weakest.label} (${weakest.pct30 ?? weakest.pctAll}% goed).`);
  return lines;
}

export function computeProgress(input: ProgressInput): ProgressStats {
  const learn = learnMsPerDay(input);
  const thisStart = weekStart(input.today);
  const thisWeek = weekNumbers(input, thisStart, learn);
  const lastWeek = weekNumbers(input, addDays(thisStart, -7), learn);

  // Strong and weak use this week's answers only, with each topic's own week percent in pct30.
  const week = topicStats(input, thisStart, addDays(thisStart, 6))
    .filter((t) => t.answered >= MIN_FOR_TREND)
    .map((t) => ({ ...t, pct30: t.pctAll }));
  const byPct = [...week].sort((a, b) => (b.pctAll ?? 0) - (a.pctAll ?? 0) || b.answered - a.answered);
  const strongest = byPct[0] ?? null;
  const low = byPct[byPct.length - 1] ?? null;
  const weakest = low && low !== strongest && (low.pctAll ?? 100) < 80 ? low : null;

  const weeks: WeekNumbers[] = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) weeks.push(weekNumbers(input, addDays(thisStart, -7 * i), learn));
  const days: DayTime[] = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const day = addDays(input.today, -i);
    days.push({ day, learnMs: learn.get(day) ?? 0, playMs: input.stats.playMsPerDay?.[day] ?? 0 });
  }

  return {
    report: { thisWeek, lastWeek, strongest, weakest, lines: reportLines(thisWeek, lastWeek, strongest, weakest) },
    weeks,
    days,
    topics: topicStats(input),
    hard: hardest(input),
    totalQuestions: firstTries(input.answers).length,
  };
}
