// Exam session state machine (T39). Runs one practice exam (PRD 4.11).
// Pure reducer: `reduce(state, event)` returns a new state plus effects for the caller (exam flow)
// to write to the stores. No DOM, no storage, no clock reads: time comes in on events.
// The state is a plain object and survives a JSON round trip (AC71).
//
// Phases: question -> end -> review -> end -> done. One try per question, no feedback, no way
// back, no points and no malus (AC65). First (and only) answers do move the SRS boxes (PRD 4.6).
// Input that does not fit the phase is ignored, which guards against double taps.

import type { Exam, Item } from "../content/format";
import type { Rng } from "../core/rng";
import { checkAnswer, type Response } from "./answer-check";
import { applyFirstTry } from "./srs";

export type ExamPhase = "question" | "end" | "review" | "done";
export type ExamStatus = "done" | "gestopt";
export type ExamEndReason = "complete" | "stopped";

/** One question of the exam. `box` is the item's SRS box before the exam (0 = new). */
export interface ExamEntry {
  item: Item;
  box: number;
  topic: string;
  /** Rekenen: compare typed answers as decimals (AC58). */
  numeric?: boolean;
}

/** One line of the saved result (AC69). `given` is null for a question left open. */
export interface ExamQuestionResult {
  itemId: string;
  topic: string;
  given: Response | null;
  correct: boolean;
}

/** The record for the `exams` store (AC69, AC70). */
export interface ExamResult {
  status: ExamStatus;
  moduleId: string;
  examId: string;
  startedAt: number;
  endedAt: number;
  /** Right answers. */
  score: number;
  total: number;
  /** Whole percent, rounded down, for display. */
  percent: number;
  /** Always false when stopped. */
  passed: boolean;
  /** Right and total per topic. */
  byTopic: Record<string, { right: number; total: number }>;
  questions: ExamQuestionResult[];
}

export interface ExamState {
  moduleId: string;
  examId: string;
  /** Effective local day, for the box due dates. */
  day: string;
  passPercent: number;
  /** null for no time limit. */
  timeLimitMs: number | null;
  /** Time left as last reported by a tick, null without a limit. */
  msLeft: number | null;
  entries: ExamEntry[];
  /** Per entry: the given answer, null while open. */
  responses: (Response | null)[];
  /** Per entry: right or wrong, null while open. */
  correct: (boolean | null)[];
  phase: ExamPhase;
  index: number;
  startedAt: number;
  /** When the current question was put on screen (ms). */
  shownAt: number;
  /** Typed or marked but not yet sent with Klaar, for the current question. */
  draft: Response | null;
  /** Review page, while phase is "review". */
  reviewPage: number;
  result: ExamResult | null;
  endReason: ExamEndReason | null;
}

export type ExamEvent =
  /** The kid typed or marked something. null clears it. Checked as given if time runs out (AC67). */
  | { type: "draft"; at: number; response: Response | null; q?: number }
  /** "Klaar" on a question. */
  | { type: "answer"; at: number; response: Response; q?: number }
  /** Time passes. `msLeft` comes from the exam timer; null without a limit. */
  | { type: "tick"; at: number; msLeft: number | null }
  /** "Bekijk je fouten". */
  | { type: "review"; at: number }
  /** "Volgende" in the review. */
  | { type: "reviewNext"; at: number }
  /** "Klaar" in the review: back to the end screen. */
  | { type: "reviewClose"; at: number }
  /** The kid leaves the end screen. */
  | { type: "finish"; at: number }
  /** The parent stops a running exam through the gate (AC70). */
  | { type: "stop"; at: number };

export type ExamEffect =
  /** Log one answer (context exam). Only for questions that got an answer. */
  | {
      type: "answer";
      itemId: string;
      try: 1;
      correct: boolean;
      response: Response;
      ms: number;
      at: number;
    }
  /** New SRS box for an answered question. */
  | { type: "box"; itemId: string; box: number; due: string }
  /** Question left open: logged as "niet beantwoord", no box change. */
  | { type: "unanswered"; itemId: string }
  /** Save this in the `exams` store. Emitted once, when the exam ends or is stopped. */
  | { type: "result"; result: ExamResult }
  /** Passed: the golden egg waits for the kid back in the world (AC68). Not emitted when stopped. */
  | { type: "goldenEgg" }
  /** The exam is over, the flow can close the screen. */
  | { type: "end"; reason: ExamEndReason; at: number };

export interface ExamConfig {
  moduleId: string;
  exam: Pick<Exam, "id" | "timeLimitMinutes" | "passPercent">;
  entries: ExamEntry[];
  day: string;
  at: number;
  /** Time left to continue with, or omit to use the full limit. */
  msLeft?: number | null;
}

export interface ExamStep {
  state: ExamState;
  effects: ExamEffect[];
}

// ---- picking the questions (AC64) ----

/**
 * How many questions each topic gets: largest remainder rounding over the mix weights.
 * Topics with weight 0 or less get none. Ties go to the earlier topic. The counts add up to `count`.
 */
export function splitByMix(
  count: number,
  mix: Readonly<Record<string, number>>,
): Record<string, number> {
  const topics = Object.keys(mix).filter((t) => (mix[t] as number) > 0);
  const out: Record<string, number> = {};
  const total = topics.reduce((s, t) => s + (mix[t] as number), 0);
  if (topics.length === 0 || count <= 0) return out;
  const exact = topics.map((t) => (count * (mix[t] as number)) / total);
  topics.forEach((t, i) => (out[t] = Math.floor(exact[i] as number)));
  let left = count - topics.reduce((s, t) => s + (out[t] as number), 0);
  const order = topics
    .map((t, i) => ({
      t,
      rem: (exact[i] as number) - Math.floor(exact[i] as number),
      i,
    }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--)
    out[(order[k] as { t: string }).t]!++;
  return out;
}

function shuffled<T>(list: readonly T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * Picks the exam questions from stored items. `pools` holds, per topic, the items at the exam
 * levels (the caller ignores all parent switches, AC64). Each topic gets its largest remainder
 * share, no item twice, and the order is mixed. If a topic has too few items, the missing
 * slots go to the other topics that still have items. `short` is true when the exam got fewer
 * questions than asked, so the parent warning (AC72) can show the real count.
 */
export function pickExamItems(
  pools: Readonly<Record<string, readonly Item[]>>,
  exam: Pick<Exam, "questionCount" | "mix">,
  rng: Rng,
): { picked: { topic: string; item: Item }[]; short: boolean } {
  const share = splitByMix(exam.questionCount, exam.mix);
  const rest: Record<string, Item[]> = {};
  const picked: { topic: string; item: Item }[] = [];
  const seen = new Set<string>();
  let missing = 0;
  for (const topic of Object.keys(share)) {
    const pool = shuffled(pools[topic] ?? [], rng).filter((it) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    const take = share[topic] as number;
    pool.slice(0, take).forEach((item) => picked.push({ topic, item }));
    rest[topic] = pool.slice(take);
    missing += Math.max(0, take - pool.length);
  }
  for (let again = true; missing > 0 && again; ) {
    again = false;
    for (const topic of Object.keys(share)) {
      const next = rest[topic]?.shift();
      if (next && missing > 0) {
        picked.push({ topic, item: next });
        missing--;
        again = true;
      }
    }
  }
  return {
    picked: shuffled(picked, rng),
    short: picked.length < exam.questionCount,
  };
}

// ---- the machine ----

export function startExam(config: ExamConfig): ExamStep {
  const limit = config.exam.timeLimitMinutes;
  const timeLimitMs = limit !== null && limit > 0 ? limit * 60_000 : null;
  const base: ExamState = {
    moduleId: config.moduleId,
    examId: config.exam.id,
    day: config.day,
    passPercent: config.exam.passPercent,
    timeLimitMs,
    msLeft: timeLimitMs === null ? null : (config.msLeft ?? timeLimitMs),
    entries: config.entries.map((e) => ({ ...e })),
    responses: config.entries.map(() => null),
    correct: config.entries.map(() => null),
    phase: "question",
    index: 0,
    startedAt: config.at,
    shownAt: config.at,
    draft: null,
    reviewPage: 0,
    result: null,
    endReason: null,
  };
  // An exam without questions cannot be taken: it ends at once, not passed.
  if (config.entries.length === 0) return finishExam(base, config.at, []);
  return { state: base, effects: [] };
}

/** The entry on screen, or null when there is none. */
export function currentEntry(state: ExamState): ExamEntry | null {
  return state.phase === "question"
    ? (state.entries[state.index] ?? null)
    : null;
}

/** "Vraag 7 van 30": the number is index + 1. */
export function questionNumber(state: ExamState): number {
  return Math.min(state.index + 1, state.entries.length);
}

/** Indexes of the questions to review: wrong or left open (AC153). */
export function reviewIndexes(state: ExamState): number[] {
  return state.entries
    .map((_, i) => i)
    .filter((i) => state.correct[i] !== true);
}

/**
 * After a restart: closed during the review means the end screen shows again (PRD 4.11).
 * Other phases come back as they were.
 */
export function restoreExam(state: ExamState): ExamState {
  return state.phase === "review"
    ? { ...state, phase: "end", reviewPage: 0 }
    : state;
}

const same = (state: ExamState): ExamStep => ({ state, effects: [] });

function buildResult(
  state: ExamState,
  status: ExamStatus,
  at: number,
): ExamResult {
  const total = state.entries.length;
  const score = state.correct.filter((c) => c === true).length;
  const byTopic: Record<string, { right: number; total: number }> = {};
  state.entries.forEach((e, i) => {
    const t = (byTopic[e.topic] ??= { right: 0, total: 0 });
    t.total++;
    if (state.correct[i] === true) t.right++;
  });
  return {
    status,
    moduleId: state.moduleId,
    examId: state.examId,
    startedAt: state.startedAt,
    endedAt: at,
    score,
    total,
    percent: total === 0 ? 0 : Math.floor((score * 100) / total),
    passed:
      status === "done" &&
      total > 0 &&
      score * 100 >= state.passPercent * total,
    byTopic,
    questions: state.entries.map((e, i) => ({
      itemId: e.item.id,
      topic: e.topic,
      given: state.responses[i] ?? null,
      correct: state.correct[i] === true,
    })),
  };
}

/** Marks every open question as wrong ("niet beantwoord") and moves to the end screen. */
function finishExam(
  state: ExamState,
  at: number,
  effects: ExamEffect[],
): ExamStep {
  const out = [...effects];
  const correct = state.correct.map((c) => c ?? false);
  state.entries.forEach((e, i) => {
    if (state.correct[i] === null)
      out.push({ type: "unanswered", itemId: e.item.id });
  });
  const s: ExamState = {
    ...state,
    correct,
    phase: "end",
    draft: null,
    reviewPage: 0,
  };
  const result = buildResult(s, "done", at);
  out.push({ type: "result", result });
  if (result.passed) out.push({ type: "goldenEgg" });
  return { state: { ...s, result }, effects: out };
}

function set<T>(list: T[], i: number, v: T): T[] {
  const copy = [...list];
  copy[i] = v;
  return copy;
}

/** Checks and logs the answer for the current question. */
function record(
  state: ExamState,
  response: Response,
  at: number,
  effects: ExamEffect[],
): ExamState {
  const entry = state.entries[state.index] as ExamEntry;
  const correct = checkAnswer(entry.item, response, entry.numeric === true);
  effects.push({
    type: "answer",
    itemId: entry.item.id,
    try: 1,
    correct,
    response,
    ms: Math.max(0, at - state.shownAt),
    at,
  });
  const b = applyFirstTry(entry.box, correct, state.day);
  effects.push({ type: "box", itemId: entry.item.id, box: b.box, due: b.due });
  return {
    ...state,
    responses: set(state.responses, state.index, response),
    correct: set(state.correct, state.index, correct),
    draft: null,
  };
}

function onAnswer(
  state: ExamState,
  ev: Extract<ExamEvent, { type: "answer" }>,
): ExamStep {
  if (state.phase !== "question" || !state.entries[state.index])
    return same(state);
  if (ev.q !== undefined && ev.q !== state.index) return same(state);
  const effects: ExamEffect[] = [];
  const s = record(state, ev.response, ev.at, effects);
  if (s.index + 1 >= s.entries.length) return finishExam(s, ev.at, effects);
  return { state: { ...s, index: s.index + 1, shownAt: ev.at }, effects };
}

function onTick(
  state: ExamState,
  ev: Extract<ExamEvent, { type: "tick" }>,
): ExamStep {
  if (
    state.phase !== "question" ||
    state.timeLimitMs === null ||
    ev.msLeft === null
  )
    return same(state);
  const msLeft = Math.max(0, ev.msLeft);
  if (msLeft > 0)
    return msLeft === state.msLeft ? same(state) : same({ ...state, msLeft });
  // Time is up (AC67): an answer typed or marked but not sent is checked as given.
  const effects: ExamEffect[] = [];
  let s: ExamState = { ...state, msLeft: 0 };
  if (s.draft) s = record(s, s.draft, ev.at, effects);
  return finishExam(s, ev.at, effects);
}

function onStop(state: ExamState, at: number): ExamStep {
  if (state.phase !== "question") return same(state);
  const effects: ExamEffect[] = [];
  state.entries.forEach((e, i) => {
    if (state.correct[i] === null)
      effects.push({ type: "unanswered", itemId: e.item.id });
  });
  const result = buildResult(
    { ...state, correct: state.correct.map((c) => c ?? false) },
    "gestopt",
    at,
  );
  effects.push({ type: "result", result });
  effects.push({ type: "end", reason: "stopped", at });
  return {
    state: {
      ...state,
      phase: "done",
      draft: null,
      result,
      endReason: "stopped",
    },
    effects,
  };
}

export function reduce(state: ExamState, ev: ExamEvent): ExamStep {
  switch (ev.type) {
    case "draft": {
      if (
        state.phase !== "question" ||
        (ev.q !== undefined && ev.q !== state.index)
      )
        return same(state);
      return same({ ...state, draft: ev.response });
    }
    case "answer":
      return onAnswer(state, ev);
    case "tick":
      return onTick(state, ev);
    case "review":
      return state.phase === "end" && reviewIndexes(state).length > 0
        ? same({ ...state, phase: "review", reviewPage: 0 })
        : same(state);
    case "reviewNext":
      return state.phase === "review" &&
        state.reviewPage + 1 < reviewIndexes(state).length
        ? same({ ...state, reviewPage: state.reviewPage + 1 })
        : same(state);
    case "reviewClose":
      return state.phase === "review"
        ? same({ ...state, phase: "end", reviewPage: 0 })
        : same(state);
    case "finish":
      return state.phase === "end"
        ? {
            state: { ...state, phase: "done", endReason: "complete" },
            effects: [{ type: "end", reason: "complete", at: ev.at }],
          }
        : same(state);
    case "stop":
      return onStop(state, ev.at);
  }
}
