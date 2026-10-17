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
  /** Net points really applied during this session, malus and bonus included. */
  earned: number;
  /** Point total at the end. */
  pointsTotal: number;
  /** AC116: nothing right, show "Dit was lastig". */
  hard: boolean;
}

export interface SessionState {
  mode: SessionMode;
  /** Effective local day, "2026-10-18", for the Extra oefenen cap. */
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
  /** Last cap message ("Genoeg geoefend voor vandaag...") or null. */
  message: string | null;
  summary: SessionSummary | null;
  endReason: EndReason | null;
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
      correct: boolean;
      response: Response;
      /** Time on screen for this try, ms, never negative. */
      ms: number;
      at: number;
    }
  /** New SRS box after the first try only (never on a retry). Not emitted in preview. */
  | { type: 'box'; itemId: string; box: number; due: string }
  /** A points change. Not emitted in preview or when nothing changed. */
  | { type: 'points'; delta: number; applied: number; total: number; reason: 'answer' | 'bonus'; message: string | null }
  /** Open question logged as "niet beantwoord", no box change (AC95). Not emitted in preview. */
  | { type: 'unanswered'; itemId: string }
  /** The session is over. */
  | { type: 'end'; reason: EndReason; at: number };

export interface SessionConfig {
  mode: SessionMode;
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
    message: null,
    summary: null,
    endReason: null,
  };
  if (config.entries.length === 0) {
    // AC39: friendly message, 10 seconds, no points, no malus.
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
  const r = applyPoints(state.economy, state.mode, delta, state.day);
  if (r.applied !== 0 || r.message) {
    effects.push({ type: 'points', delta, applied: r.applied, total: r.economy.points, reason, message: r.message });
  }
  return {
    ...state,
    economy: r.economy,
    earned: state.earned + r.applied,
    bonus: reason === 'bonus' ? state.bonus + r.applied : state.bonus,
    message: r.message ?? state.message,
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
  };
  return { ...s, phase: 'summary', summary };
}

function advance(state: SessionState, at: number, effects: SessionEffect[]): SessionState {
  if (state.index + 1 >= state.entries.length) return toSummary(state, effects);
  return { ...state, phase: 'question', index: state.index + 1, try: 1, shownAt: at };
}

function onAnswer(state: SessionState, ev: Extract<SessionEvent, { type: 'answer' }>): StepResult {
  const entry = currentEntry(state);
  if (state.phase !== 'question' || !entry) return same(state);
  if (ev.q !== undefined && ev.q !== state.index) return same(state);
  const effects: SessionEffect[] = [];
  const correct = checkAnswer(entry.item, ev.response, entry.numeric === true);
  const tries = state.try;
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
    s = applyDelta(s, answerPoints(outcome), 'answer', effects);
    return { state: s, effects };
  }
  if (tries === 1) {
    // AC30: same question again, input cleared by the screen, no answer shown.
    return { state: { ...state, try: 2, shownAt: ev.at }, effects };
  }
  let s: SessionState = { ...state, phase: 'teach', results: setResult(state.results, state.index, 'teach') };
  s = applyDelta(s, answerPoints('teach'), 'answer', effects);
  return { state: s, effects };
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
