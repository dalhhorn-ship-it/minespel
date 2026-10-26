// Exam session (T39, PRD 4.11, AC64 to AC72, AC125, AC153). Pure: no DOM, no storage, no clock.
// Like break-session.ts it returns effects for the caller (the exam flow) to write to the stores.
// The state is a plain object and survives a JSON round trip (AC71).
//
// Phases: start -> questions -> end. One try per question, no feedback, no retry, no going back.
// Points never change. The review (AC153) is a view of the end state, see `reviewPages`.

import type { Catalog } from '../content/catalog';
import { isGeneratedModule } from '../content/catalog';
import type { Exam, Item } from '../content/format';
import { generateExamItems } from '../content/rekenen/generator';
import { createRng, shuffle } from '../core/rng';
import type { ExamInput, ExamQuestionLog } from '../storage/log-store';
import { checkAnswer, type Response } from './answer-check';
import { applyFirstTry } from './srs';

export const NOT_ANSWERED = 'niet beantwoord';

export type ExamPhase = 'start' | 'questions' | 'end';
/** complete: last answer given. time: time ran out. parent: stopped through the gate. */
export type ExamEndReason = 'complete' | 'time' | 'parent';

/** Planned questions of one topic. */
export interface ExamTopicPlan {
  topicId: string;
  /** After largest remainder rounding on the `mix` weights. */
  wanted: number;
  /** Items of the topic at the exam levels. Infinity for generated sums. */
  available: number;
  /** min(wanted, available). */
  real: number;
}

export interface ExamPlan {
  moduleId: string;
  examId: string;
  title: string;
  wanted: number;
  /** Real count: the sum of `real` per topic (decision 66). */
  real: number;
  /** True when `real` is less than `wanted` (AC72). */
  short: boolean;
  timeLimitMinutes: number | null;
  passPercent: number;
  topics: ExamTopicPlan[];
}

export interface ExamEntry {
  item: Item;
  /** The item's SRS box before the exam (0 = new). */
  box: number;
  /** Rekenen: compare typed answers as decimals (AC58). */
  numeric?: boolean;
}

/** What happened to one question. `response` is null when it stayed open. */
export interface ExamAnswer {
  response: Response | null;
  correct: boolean;
  at: number;
}

export interface ExamState {
  moduleId: string;
  examId: string;
  title: string;
  phase: ExamPhase;
  /** Index of the question on screen. */
  index: number;
  /** The picked items, kept as full objects so a resume needs no catalog lookups. */
  entries: ExamEntry[];
  /** Per entry: null until answered or closed out by time out or stop. */
  answers: (ExamAnswer | null)[];
  /** Effective local day, for the box due days. */
  day: string;
  /** The questions the exam wanted before a short topic cut them. */
  wanted: number;
  timeLimitMinutes: number | null;
  passPercent: number;
  startedAt: number;
  /** When the question on screen appeared, for response times. */
  shownAt: number;
  endedAt: number | null;
  endReason: ExamEndReason | null;
}

export type ExamEffect =
  /** Log one answer (context `exam`). One try only. */
  | {
      type: 'answer';
      itemId: string;
      try: 1;
      correct: boolean;
      response: Response;
      ms: number;
      at: number;
    }
  /** New box after the one try. Not emitted for open or unreached questions (decision 67). */
  | { type: 'box'; itemId: string; box: number; due: string }
  | { type: 'end'; reason: ExamEndReason; at: number };

export interface ExamStep {
  state: ExamState;
  effects: ExamEffect[];
}

export interface ExamResult {
  total: number;
  right: number;
  wrong: number;
  /** Open at time out or not reached when stopped. */
  unanswered: number;
  /** 0 to 100, not rounded. */
  percent: number;
  /** Always false for a stopped exam (AC70). */
  passed: boolean;
  status: 'done' | 'gestopt';
  endReason: ExamEndReason | null;
}

export interface ReviewPage {
  itemId: string;
  prompt: string;
  /** The kid's answer, or "niet beantwoord". */
  given: string;
  right: string;
  explain: string;
  unanswered: boolean;
}

/** Largest remainder rounding: counts that add up to `count`, ties go to the earlier topic. */
export function largestRemainder(weights: readonly number[], count: number): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || count <= 0) return weights.map(() => 0);
  const quotas = weights.map((w) => (count * w) / total);
  const out = quotas.map((q) => Math.floor(q));
  let left = count - out.reduce((s, n) => s + n, 0);
  const order = quotas
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0 && order.length > 0; k = (k + 1) % order.length, left--) {
    const slot = order[k] as { i: number };
    out[slot.i] = (out[slot.i] as number) + 1;
  }
  return out;
}

function examOf(catalog: Catalog, moduleId: string, examId: string): Exam | null {
  if (!catalog.getModule(moduleId)) return null;
  return catalog.getExam(moduleId, examId) ?? null;
}

/** Plan an exam: how many questions per topic and how many there really are (AC64, AC72). */
export function planExam(catalog: Catalog, moduleId: string, examId: string): ExamPlan | null {
  const exam = examOf(catalog, moduleId, examId);
  if (!exam) return null;
  const topicIds = Object.keys(exam.mix).filter((t) => (exam.mix[t] ?? 0) > 0);
  const wantedPer = largestRemainder(
    topicIds.map((t) => exam.mix[t] as number),
    exam.questionCount,
  );
  const topics: ExamTopicPlan[] = topicIds.map((topicId, i) => {
    const wanted = wantedPer[i] as number;
    const available = catalog.isOpenTopic(moduleId, topicId)
      ? Number.POSITIVE_INFINITY
      : catalog.fixedItems(moduleId, topicId, { levels: exam.levels }).length;
    return { topicId, wanted, available, real: Math.min(wanted, available) };
  });
  const real = topics.reduce((s, t) => s + t.real, 0);
  return {
    moduleId,
    examId,
    title: exam.title,
    wanted: exam.questionCount,
    real,
    short: real < exam.questionCount,
    timeLimitMinutes: exam.timeLimitMinutes,
    passPercent: exam.passPercent,
    topics,
  };
}

/**
 * Pick the exam items with a seed: same seed, same questions (AC125). Taal takes fixed items per
 * topic, Rekentoets goes through `generateExamItems` (no repeats). Parent switches are ignored.
 */
export function pickExamItems(catalog: Catalog, plan: ExamPlan, seed: number): Item[] {
  const exam = examOf(catalog, plan.moduleId, plan.examId);
  const bundle = catalog.getModule(plan.moduleId);
  if (!exam || !bundle) return [];
  const rng = createRng(seed);
  if (isGeneratedModule(bundle)) {
    const level = exam.levels[0] ?? 'M6';
    return generateExamItems(level, plan.real, rng, exam.mix);
  }
  const picked: Item[] = [];
  for (const t of plan.topics) {
    const pool = catalog.fixedItems(plan.moduleId, t.topicId, { levels: exam.levels });
    picked.push(...shuffle(pool, rng).slice(0, t.real));
  }
  return shuffle(picked, rng);
}

export interface CreateExamOptions {
  catalog: Catalog;
  moduleId: string;
  examId: string;
  seed: number;
  /** Effective local day, "2026-10-19". */
  day: string;
  at: number;
  /** Box of each item before the exam, by item id. Missing means new (0). */
  boxes?: Readonly<Record<string, number>>;
}

/** Make the session in phase `start`. Null when the module or exam does not exist. */
export function createExamSession(options: CreateExamOptions): ExamState | null {
  const plan = planExam(options.catalog, options.moduleId, options.examId);
  if (!plan) return null;
  const bundle = options.catalog.getModule(options.moduleId);
  const numeric = bundle ? isGeneratedModule(bundle) : false;
  const items = pickExamItems(options.catalog, plan, options.seed);
  return {
    moduleId: plan.moduleId,
    examId: plan.examId,
    title: plan.title,
    phase: 'start',
    index: 0,
    entries: items.map((item) => ({
      item,
      box: options.boxes?.[item.id] ?? 0,
      ...(numeric ? { numeric: true } : {}),
    })),
    answers: items.map(() => null),
    day: options.day,
    wanted: plan.wanted,
    timeLimitMinutes: plan.timeLimitMinutes,
    passPercent: plan.passPercent,
    startedAt: options.at,
    shownAt: options.at,
    endedAt: null,
    endReason: null,
  };
}

const same = (state: ExamState): ExamStep => ({ state, effects: [] });

/** The entry on screen, or null. */
export function currentExamEntry(state: ExamState): ExamEntry | null {
  return state.phase === 'questions' ? (state.entries[state.index] ?? null) : null;
}

/** The kid taps "Begin": the clock for the first question starts. */
export function beginExam(state: ExamState, at: number): ExamStep {
  if (state.phase !== 'start') return same(state);
  if (state.entries.length === 0) {
    return {
      state: { ...state, phase: 'end', startedAt: at, shownAt: at, endedAt: at, endReason: 'complete' },
      effects: [{ type: 'end', reason: 'complete', at }],
    };
  }
  return same({ ...state, phase: 'questions', startedAt: at, shownAt: at });
}

function gradeEffects(state: ExamState, i: number, response: Response, at: number): { answer: ExamAnswer; effects: ExamEffect[] } {
  const entry = state.entries[i] as ExamEntry;
  const correct = checkAnswer(entry.item, response, entry.numeric === true);
  const b = applyFirstTry(entry.box, correct, state.day);
  return {
    answer: { response, correct, at },
    effects: [
      {
        type: 'answer',
        itemId: entry.item.id,
        try: 1,
        correct,
        response,
        ms: Math.max(0, at - state.shownAt),
        at,
      },
      { type: 'box', itemId: entry.item.id, box: b.box, due: b.due },
    ],
  };
}

function withAnswer(answers: (ExamAnswer | null)[], i: number, a: ExamAnswer): (ExamAnswer | null)[] {
  const copy = [...answers];
  copy[i] = a;
  return copy;
}

/**
 * The kid taps Klaar. One try: no feedback, no retry. Moves to the next question or ends the exam.
 * `q` (optional) guards against a double tap on an old screen.
 */
export function answerCurrent(state: ExamState, response: Response, at: number, q?: number): ExamStep {
  if (state.phase !== 'questions') return same(state);
  if (q !== undefined && q !== state.index) return same(state);
  if (!state.entries[state.index] || state.answers[state.index] !== null) return same(state);
  const graded = gradeEffects(state, state.index, response, at);
  const answers = withAnswer(state.answers, state.index, graded.answer);
  if (state.index + 1 >= state.entries.length) {
    return {
      state: { ...state, answers, phase: 'end', endedAt: at, endReason: 'complete' },
      effects: [...graded.effects, { type: 'end', reason: 'complete', at }],
    };
  }
  return { state: { ...state, answers, index: state.index + 1, shownAt: at }, effects: graded.effects };
}

/** Time ran out (AC67): the open draft is checked as given, every later question is "niet beantwoord". */
export function timeOut(state: ExamState, draft: Response | null, at: number): ExamStep {
  if (state.phase !== 'questions') return same(state);
  const effects: ExamEffect[] = [];
  let answers = state.answers;
  const hasDraft =
    draft !== null && !(draft.type === 'type' && draft.text.trim() === '') && state.answers[state.index] === null;
  if (hasDraft && state.entries[state.index]) {
    const graded = gradeEffects(state, state.index, draft, at);
    answers = withAnswer(answers, state.index, graded.answer);
    effects.push(...graded.effects);
  }
  effects.push({ type: 'end', reason: 'time', at });
  return { state: { ...state, answers, phase: 'end', endedAt: at, endReason: 'time' }, effects };
}

/** The parent stops the exam through the gate (AC70). Answers so far stay, the rest is open. No egg, no review. */
export function stopByParent(state: ExamState, at: number): ExamStep {
  if (state.phase === 'end') return same(state);
  return {
    state: { ...state, phase: 'end', endedAt: at, endReason: 'parent' },
    effects: [{ type: 'end', reason: 'parent', at }],
  };
}

/** Score and pass at `passPercent`. Open questions count as wrong. */
export function examResult(state: ExamState): ExamResult {
  const total = state.entries.length;
  const right = state.answers.filter((a) => a?.correct === true).length;
  const unanswered = state.answers.filter((a) => a === null || a.response === null).length;
  const stopped = state.endReason === 'parent';
  const percent = total === 0 ? 0 : (right / total) * 100;
  return {
    total,
    right,
    wrong: total - right - unanswered,
    unanswered,
    percent,
    passed: !stopped && total > 0 && right * 100 >= state.passPercent * total,
    status: stopped ? 'gestopt' : 'done',
    endReason: state.endReason,
  };
}

/** The answer as text for the review and the saved record. */
export function givenText(item: Item, response: Response | null): string {
  if (response === null) return NOT_ANSWERED;
  switch (response.type) {
    case 'choice':
      return (item.type === 'choice' ? item.options[response.index] : undefined) ?? String(response.index);
    case 'find-error':
      if (response.index === -1) return 'geen fout';
      return (item.type === 'find-error' ? item.words[response.index] : undefined) ?? String(response.index);
    case 'type':
      return response.text.trim() === '' ? NOT_ANSWERED : response.text;
    case 'punctuate':
      return item.type === 'punctuate' ? sentenceWithMarks(item.words, item.mark, response.gaps) : response.gaps.join(',');
  }
}

function sentenceWithMarks(words: readonly string[], mark: string, gaps: readonly number[]): string {
  const marked = new Set(gaps);
  return words.map((w, i) => (marked.has(i) ? `${w}${mark}` : w)).join(' ');
}

/** The right answer as text. */
export function rightText(item: Item): string {
  switch (item.type) {
    case 'choice':
      return item.options[item.answer] ?? '';
    case 'find-error':
      return item.answer === -1 ? 'geen fout' : (item.words[item.answer] ?? '');
    case 'type':
      return item.answer[0] ?? '';
    case 'punctuate':
      return sentenceWithMarks(item.words, item.mark, item.answer);
  }
}

function questionLog(entry: ExamEntry, answer: ExamAnswer | null): ExamQuestionLog {
  const response = answer?.response ?? null;
  return {
    itemId: entry.item.id,
    prompt: entry.item.prompt,
    given: givenText(entry.item, response),
    right: rightText(entry.item),
    correct: answer?.correct === true,
  };
}

/** One page per wrong or open question, in exam order (AC153). Empty when everything was right. */
export function reviewPages(state: ExamState): ReviewPage[] {
  const pages: ReviewPage[] = [];
  state.entries.forEach((entry, i) => {
    const answer = state.answers[i] ?? null;
    if (answer?.correct === true) return;
    const given = givenText(entry.item, answer?.response ?? null);
    pages.push({
      itemId: entry.item.id,
      prompt: entry.item.prompt,
      given,
      right: rightText(entry.item),
      explain: entry.item.explain,
      unanswered: given === NOT_ANSWERED,
    });
  });
  return pages;
}

/** The record for `saveExam` (AC69). Call when the phase is `end`. */
export function toExamInput(state: ExamState): ExamInput {
  const result = examResult(state);
  return {
    start: state.startedAt,
    end: state.endedAt ?? state.startedAt,
    day: state.day,
    moduleId: state.moduleId,
    examId: state.examId,
    questions: state.entries.map((e, i) => questionLog(e, state.answers[i] ?? null)),
    score: result.right,
    passed: result.passed,
    status: result.status,
  };
}
