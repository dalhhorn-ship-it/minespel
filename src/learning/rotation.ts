// Module rotation (T16, AC38, AC46). Pure functions over plain, serializable state.
// The state is the `rotation` kv record. It is saved after every break, so it must survive a restart.
//
// weights:       smooth weighted round robin, the running score per module id.
// topicPointers: per module id, the index in its topic list where the next search starts.
// lessonsSeen:   "moduleId/topicId" keys of lessons already shown.

import type { RotationRecord } from '../storage/schema';

export type RotationState = RotationRecord;

export interface ModuleCandidate {
  id: string;
  /** Parent weight. 0 or less means the module is off. */
  weight: number;
  /** False when the module has no switched on items to ask. Its turn goes to the next module. */
  usable: boolean;
}

export interface TopicCandidate {
  id: string;
  /** True when the topic is switched on and still has new items. */
  hasNew: boolean;
}

export function emptyRotation(): RotationState {
  return { weights: {}, topicPointers: {}, lessonsSeen: [] };
}

function clone(s: RotationState): RotationState {
  return {
    weights: { ...s.weights },
    topicPointers: { ...s.topicPointers },
    lessonsSeen: [...s.lessonsSeen],
  };
}

/**
 * Smooth weighted round robin. Modules that are not usable are skipped and their score is reset,
 * so they do not build up a debt. Ties go to the earlier module in the list.
 * Returns moduleId null when nothing can be asked (AC39).
 */
export function pickModule(
  state: RotationState,
  candidates: readonly ModuleCandidate[],
): { moduleId: string | null; state: RotationState } {
  const next = clone(state);
  const eligible = candidates.filter((c) => c.usable && c.weight > 0);
  const eligibleIds = new Set(eligible.map((c) => c.id));
  for (const id of Object.keys(next.weights)) {
    if (!eligibleIds.has(id)) delete next.weights[id];
  }
  if (eligible.length === 0) return { moduleId: null, state: next };

  let total = 0;
  let best: ModuleCandidate | null = null;
  let bestScore = -Infinity;
  for (const c of eligible) {
    const score = (next.weights[c.id] ?? 0) + c.weight;
    next.weights[c.id] = score;
    total += c.weight;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (!best) return { moduleId: null, state: next };
  next.weights[best.id] = bestScore - total;
  return { moduleId: best.id, state: next };
}

/**
 * Next topic for a module: the first topic with new items, searching from the pointer in teaching
 * order and wrapping once. The pointer then moves past the chosen topic (AC46).
 * Returns topicId null when no topic has new items.
 */
export function pickTopic(
  state: RotationState,
  moduleId: string,
  topics: readonly TopicCandidate[],
): { topicId: string | null; state: RotationState } {
  const next = clone(state);
  const n = topics.length;
  if (n === 0) return { topicId: null, state: next };
  const raw = next.topicPointers[moduleId] ?? 0;
  const start = Number.isInteger(raw) && raw > 0 ? raw % n : 0;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const t = topics[i];
    if (t && t.hasNew) {
      next.topicPointers[moduleId] = (i + 1) % n;
      return { topicId: t.id, state: next };
    }
  }
  return { topicId: null, state: next };
}

export function lessonKey(moduleId: string, topicId: string): string {
  return `${moduleId}/${topicId}`;
}

export function hasSeenLesson(state: RotationState, moduleId: string, topicId: string): boolean {
  return state.lessonsSeen.includes(lessonKey(moduleId, topicId));
}

/** Idempotent. Returns a new state. */
export function markLessonSeen(
  state: RotationState,
  moduleId: string,
  topicId: string,
): RotationState {
  if (hasSeenLesson(state, moduleId, topicId)) return state;
  const next = clone(state);
  next.lessonsSeen.push(lessonKey(moduleId, topicId));
  return next;
}
