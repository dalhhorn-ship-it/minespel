// Break session state machine (T31). Runs a break, an Extra oefenen round or a Probeer preview.
// Pure reducer: `reduce(state, event)` returns a new state plus effects for the caller (T43) to
// write to the stores. No DOM, no storage, no clock reads: time comes in on events (`at`, ms).
// The state is a plain object and survives a JSON round trip (AC37).
//
// Phases: lesson -> question (try 1, try 2) -> feedback | teach -> ... -> summary -> done.
// An empty break shows `empty` for 10 seconds, then ends. Input that does not fit the current
// phase is ignored, which is the guard against double taps (AC117). There is no time limit
// on a question (AC31).

import type { Item } from '../content/format';
import type { EconomyRecord } from '../storage/schema';
import { checkAnswer, type Response } from './answer-check';
import {
  answerPoints,
  applyPoints,
  bonusPoints,
  type AnswerOutcome,
  type PointsMode,
  type SessionMode,
} from '../core/economy';
import { applyFirstTry } from './srs';

export const EMPTY_BREAK_MS = 10_000;

export type { SessionMode, AnswerOutcome };
export type SessionPhase = 'lesson' | 'question' | 'feedback' | 'teach' | 'summary' | 'empty' | 'done';
export type EndReason = 'complete' | 'parent' | 'empty';

/** One question of the session. `box` is the item's SRS box before this session (0 = new). */
export interface SessionEntry {
  item: Item;
  box: number;
  /** Rekenen: compare typed answers as decimals (AC58). */
  numeric?: boolean;
}

export interface SessionSummary {
  total: number;
  /** Right on the first try or on the retry (AC34). */
  right: number;
  firstTryRight: number;
  /** Plus points of the +3 bonus (0 outside breaks). */
  bonus: number;
  /** Net points really applied during this session, plus, minus and bonus; equals the change in the total (AC176). */
  earned: number;
  /** Point total at the end. */
  pointsTotal: number;
  /** v25: questions right on a repeat ("En N alsnog goed!"). Missing in older saves, read as 0. */
  repeatRight?: number;
  /** AC116: nothing right, show "Dit was lastig". */
  hard: boolean;
}

/** v25 (AC338 to AC348): the repeat line. Items are indexes into `entries`. */
export interface RepeatState {
  /** True from the first repeat on (the repeat part). */
  on: boolean;
  /** Teach moment questions waiting for a repeat, in order. While a repeat is on screen its question is first. */
  line: number[];
  /** Per entry: repeats answered so far. */
  counts: number[];
  /** Questions right on a repeat. */
  right: number;
}

/** The most repeats one question gets (AC341). */
export const MAX_REPEATS = 3;

export interface SessionState {
  mode: SessionMode;
  /** Started with Nu oefenen (decision 56). It pays like any break since v10. Missing in older saves. */
  early?: boolean;
  /** Punten setting for this session (v10). Missing in older saves, read as 'normaal'. */
  pointsMode?: PointsMode;
  /** Effective local day, "2026-10-18". */
  day: string;
  entries: SessionEntry[];
  /** Per entry: how it ended, null while open. */
  results: (AnswerOutcome | null)[];
  phase: SessionPhase;
  /** Index of the current question. */
  index: number;
  /** 1 or 2. */
  try: 1 | 2;
  /** When the current question was put on screen (ms), for response times. */
  shownAt: number;
  /** Empty break: when it ends (ms). */
  emptyUntil: number | null;
  /** Economy as the session sees it, updated with every points change. */
  economy: EconomyRecord;
  earned: number;
  bonus: number;
  /** Points the last answer really changed, plus or minus (0 when nothing was taken). Missing in older saves and in preview. */
  lastApplied?: number;
  summary: SessionSummary | null;
  endReason: EndReason | null;
  /** v25: the repeat line. Missing in older saves and in preview. */
  repeat?: RepeatState;
}

export type SessionEvent =
  | { type: 'lessonDone'; at: number }
  | { type: 'answer'; at: number; response: Response; q?: number }
  /** "Verder" after a right answer. */
  | { type: 'next'; at: number; q?: number }
  /** "Ik snap het" after the teach moment. */
  | { type: 'understood'; at: number; q?: number }
  /** "Terug naar de wereld". */
  | { type: 'finish'; at: number }
  /** "Pauze nu beeindigen" by a parent (AC95). */
  | { type: 'parentEnd'; at: number }
  /** Time passes. Only the empty break reacts. */
  | { type: 'tick'; at: number };

export type SessionEffect =
  /** Log one answer. Not emitted in preview. */
  | {
      type: 'answer';
      itemId: string;
      try: 1 | 2;
      /** v25: 1 to 3 for a repeat. Such a row is no first try, no retry and no teach moment. */
      repeat?: 1 | 2 | 3;
      correct: boolean;
      response: Response;
      /** Time on screen for this try, ms, never negative. */
      ms: number;
      at: number;
    }
  /** New SRS box after the first try only (never on a retry). Not emitted in preview. */
  | { type: 'box'; itemId: string; box: number; due: string }
  /** A points change. Not emitted in preview or when nothing changed. */
  | { type: 'points'; delta: number; applied: number; total: number; reason: 'answer' | 'bonus' }
  /** Open question logged as "niet beantwoord", no box change (AC95). Not emitted in preview. */
  | { type: 'unanswered'; itemId: string }
  /** The session is over. */
  | { type: 'end'; reason: EndReason; at: number };

export interface SessionConfig {
  mode: SessionMode;
  /** True for a break started with Nu oefenen (decision 56). */
  early?: boolean;
  /** The Punten setting (v10). Default 'normaal'. */
  pointsMode?: PointsMode;
  entries: SessionEntry[];
  economy: EconomyRecord;
  day: string;
  /** Show the lesson first (new topic items). */
  lessonFirst?: boolean;
  at: number;
}

export interface StepResult {
  state: SessionState;
  effects: SessionEffect[];
}

export function startSession(config: SessionConfig): StepResult {
  const base: SessionState = {
    mode: config.mode,
    ...(config.early ? { early: true } : {}),
    pointsMode: config.pointsMode ?? 'normaal',
    day: config.day,
    entries: config.entries.map((e) => ({ ...e })),
    results: config.entries.map(() => null),
    phase: 'question',
    index: 0,
    try: 1,
    shownAt: config.at,
    emptyUntil: null,
    economy: { ...config.economy },
    earned: 0,
    bonus: 0,
    summary: null,
    endReason: null,
  };
  if (config.entries.length === 0) {
    // AC39: friendly message, 10 seconds, no points.
    return { state: { ...base, phase: 'empty', emptyUntil: config.at + EMPTY_BREAK_MS }, effects: [] };
  }
  return { state: { ...base, phase: config.lessonFirst ? 'lesson' : 'question' }, effects: [] };
}

/** The entry on screen, or null when there is none. */
export function currentEntry(state: SessionState): SessionEntry | null {
  return state.entries[state.index] ?? null;
}

/** How many questions are done (for the progress dots, AC28). */
export function doneCount(state: SessionState): number {
  return state.results.filter((r) => r !== null).length;
}

const same = (state: SessionState): StepResult => ({ state, effects: [] });

function applyDelta(
  state: SessionState,
  delta: number,
  reason: 'answer' | 'bonus',
  effects: SessionEffect[],
): SessionState {
  if (state.mode === 'preview') return state;
  const r = applyPoints(state.economy, state.mode, delta);
  if (r.applied !== 0) {
    effects.push({ type: 'points', delta, applied: r.applied, total: r.economy.points, reason });
  }
  return {
    ...state,
    economy: r.economy,
    earned: state.earned + r.applied,
    bonus: reason === 'bonus' ? state.bonus + r.applied : state.bonus,
    ...(reason === 'answer' ? { lastApplied: r.applied } : {}),
  };
}

function setResult(results: (AnswerOutcome | null)[], i: number, r: AnswerOutcome): (AnswerOutcome | null)[] {
  const copy = [...results];
  copy[i] = r;
  return copy;
}

function toSummary(state: SessionState, effects: SessionEffect[]): SessionState {
  const total = state.entries.length;
  const firstTryRight = state.results.filter((r) => r === 'first').length;
  const right = state.results.filter((r) => r === 'first' || r === 'retry').length;
  let s = state;
  const bonus = bonusPoints(state.mode, total, firstTryRight);
  if (bonus > 0) s = applyDelta(s, bonus, 'bonus', effects);
  const summary: SessionSummary = {
    total,
    right,
    firstTryRight,
    bonus: s.bonus,
    earned: s.earned,
    pointsTotal: s.economy.points,
    hard: right === 0,
    ...(state.repeat && state.repeat.right > 0 ? { repeatRight: state.repeat.right } : {}),
  };
  return { ...s, phase: 'summary', summary };
}

/** True while the repeat part is on (AC338). */
export function inRepeatPart(state: SessionState): boolean {
  return state.repeat?.on === true;
}

/** How many questions wait in the repeat line, the one on screen included while it is still in the line ("Nog N te gaan", AC342). */
export function repeatsLeft(state: SessionState): number {
  return state.repeat?.on ? state.repeat.line.length : 0;
}

function advance(state: SessionState, at: number, effects: SessionEffect[]): SessionState {
  const r = state.repeat;
  if (r?.on) {
    const next = r.line[0];
    if (next === undefined) return toSummary(state, effects);
    return { ...state, phase: 'question', index: next, try: 1, shownAt: at };
  }
  if (state.index + 1 >= state.entries.length) {
    const first = r?.line[0];
    if (r && first !== undefined) {
      return { ...state, repeat: { ...r, on: true }, phase: 'question', index: first, try: 1, shownAt: at };
    }
    return toSummary(state, effects);
  }
  return { ...state, phase: 'question', index: state.index + 1, try: 1, shownAt: at };
}

function onAnswer(state: SessionState, ev: Extract<SessionEvent, { type: 'answer' }>): StepResult {
  const entry = currentEntry(state);
  if (state.phase !== 'question' || !entry) return same(state);
  if (ev.q !== undefined && ev.q !== state.index) return same(state);
  const effects: SessionEffect[] = [];
  const correct = checkAnswer(entry.item, ev.response, entry.numeric === true);
  const tries = state.try;
  if (state.repeat?.on) return onRepeatAnswer(state, ev, entry, correct);
  const pm = state.pointsMode ?? 'normaal';
  if (state.mode !== 'preview') {
    effects.push({
      type: 'answer',
      itemId: entry.item.id,
      try: tries,
      correct,
      response: ev.response,
      ms: Math.max(0, ev.at - state.shownAt),
      at: ev.at,
    });
    if (tries === 1) {
      const b = applyFirstTry(entry.box, correct, state.day);
      effects.push({ type: 'box', itemId: entry.item.id, box: b.box, due: b.due });
    }
  }
  if (correct) {
    const outcome: AnswerOutcome = tries === 1 ? 'first' : 'retry';
    let s: SessionState = { ...state, phase: 'feedback', results: setResult(state.results, state.index, outcome) };
    s = applyDelta(s, answerPoints(outcome, pm), 'answer', effects);
    return { state: s, effects };
  }
  if (tries === 1) {
    // AC30: same question again, input cleared by the screen, no answer shown.
    // A wrong first try costs 1 on Moeilijk only (AC173).
    const retry = applyDelta({ ...state, try: 2, shownAt: ev.at }, answerPoints('miss', pm), 'answer', effects);
    return { state: retry, effects };
  }
  let s: SessionState = { ...state, phase: 'teach', results: setResult(state.results, state.index, 'teach') };
  if (state.mode !== 'preview') {
    // v25: a teach moment question gets its repeats after the last normal question (AC338).
    const r = state.repeat ?? { on: false, line: [], counts: state.entries.map(() => 0), right: 0 };
    s = { ...s, repeat: { ...r, line: [...r.line, state.index] } };
  }
  s = applyDelta(s, answerPoints('teach', pm), 'answer', effects);
  return { state: s, effects };
}

/** One try, no points, no box (AC339, AC340). Right leaves the line, wrong goes to the back, at most 3 repeats. */
function onRepeatAnswer(
  state: SessionState,
  ev: Extract<SessionEvent, { type: 'answer' }>,
  entry: SessionEntry,
  correct: boolean,
): StepResult {
  const r = state.repeat as RepeatState;
  const i = state.index;
  const n = (r.counts[i] ?? 0) + 1;
  const counts = [...r.counts];
  counts[i] = n;
  const rest = r.line.filter((x) => x !== i);
  const line = correct || n >= MAX_REPEATS ? rest : [...rest, i];
  const effects: SessionEffect[] = [
    {
      type: 'answer',
      itemId: entry.item.id,
      try: 1,
      repeat: n as 1 | 2 | 3,
      correct,
      response: ev.response,
      ms: Math.max(0, ev.at - state.shownAt),
      at: ev.at,
    },
  ];
  const repeat: RepeatState = { ...r, line, counts, right: r.right + (correct ? 1 : 0) };
  return { state: { ...state, phase: correct ? 'feedback' : 'teach', repeat }, effects };
}

function onParentEnd(state: SessionState, at: number): StepResult {
  if (state.phase === 'done') return same(state);
  const effects: SessionEffect[] = [];
  if (state.mode !== 'preview') {
    // Questions without any answer yet. A question on its retry already has its first try logged.
    state.entries.forEach((e, i) => {
      const open = state.results[i] === null && !(i === state.index && state.try === 2);
      if (state.phase !== 'empty' && state.phase !== 'summary' && open) {
        effects.push({ type: 'unanswered', itemId: e.item.id });
      }
    });
  }
  effects.push({ type: 'end', reason: 'parent', at });
  return { state: { ...state, phase: 'done', endReason: 'parent' }, effects };
}

export function reduce(state: SessionState, ev: SessionEvent): StepResult {
  switch (ev.type) {
    case 'lessonDone':
      return state.phase === 'lesson' ? same({ ...state, phase: 'question', shownAt: ev.at }) : same(state);
    case 'answer':
      return onAnswer(state, ev);
    case 'next': {
      if (state.phase !== 'feedback' || (ev.q !== undefined && ev.q !== state.index)) return same(state);
      const effects: SessionEffect[] = [];
      return { state: advance(state, ev.at, effects), effects };
    }
    case 'understood': {
      if (state.phase !== 'teach' || (ev.q !== undefined && ev.q !== state.index)) return same(state);
      const effects: SessionEffect[] = [];
      return { state: advance(state, ev.at, effects), effects };
    }
    case 'finish': {
      if (state.phase !== 'summary') return same(state);
      return {
        state: { ...state, phase: 'done', endReason: 'complete' },
        effects: [{ type: 'end', reason: 'complete', at: ev.at }],
      };
    }
    case 'tick': {
      if (state.phase !== 'empty' || state.emptyUntil === null || ev.at < state.emptyUntil) return same(state);
      return {
        state: { ...state, phase: 'done', endReason: 'empty' },
        effects: [{ type: 'end', reason: 'empty', at: ev.at }],
      };
    }
    case 'parentEnd':
      return onParentEnd(state, ev.at);
  }
}

/** For the e2e hooks (v25): the state plus the repeat part, the repeat line as item ids and the repeats per item id. */
export function withRepeatView(state: SessionState): SessionState & {
  repeatPart: boolean;
  repeatLine: string[];
  repeatCounts: Record<string, number>;
} {
  const r = state.repeat;
  const counts: Record<string, number> = {};
  state.entries.forEach((e, i) => {
    const n = r?.counts[i] ?? 0;
    if (n > 0) counts[e.item.id] = n;
  });
  return {
    ...state,
    repeatPart: r?.on === true,
    repeatLine: (r?.line ?? []).map((i) => state.entries[i]?.item.id ?? ''),
    repeatCounts: counts,
  };
}
