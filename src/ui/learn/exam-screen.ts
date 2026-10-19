// Exam screens (T51a, render only, no storage): start, question, end and the review.
// Calm: no feedback, no retry, no teach moment, no back button (PRD 4.11, AC65).
// The small grey lock shows on the question screen only (AC155, AC156) and calls onLock.
// The caller (exam-flow, T51b) renders a new view when the session changes and calls
// `setTimeLeft` every tick, so the question and a typed answer are never re-rendered by the clock.
import '../../styles/mc-menu.css';
import '../../styles/break.css';
import '../../styles/exam.css';
import type { Item } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { el } from '../dom';
import { createLockIcon, type LockIcon } from '../lock-icon';
import { onTap } from '../tap';
import { createExamReview, type ExamReview, type ExamReviewPage } from './exam-review';
import { applyMcBackground } from './mc-background';
import { createQuestionHost, type Draft, type QuestionHost } from './question-host';

/** What the screen shows. Small local shape, so this file does not depend on exam-session.ts. */
export type ExamView =
  | { phase: 'start'; count: number; /** Null means no time limit. */ minutes: number | null; title?: string }
  | { phase: 'question'; index: number; count: number; item: Item; numeric?: boolean; msLeft: number | null }
  | {
      phase: 'end';
      score: number;
      total: number;
      passed: boolean;
      /** One page per wrong or unanswered question. Empty means no mistakes. */
      reviewPages: readonly ExamReviewPage[];
    };

export interface ExamScreenOptions {
  view: ExamView;
  onBegin: () => void;
  onAnswer: (response: Response, index: number) => void;
  /** The small grey lock: T51b routes this to parentFlow.openExamStop(). */
  onLock: () => void;
  /** Terug naar de wereld on the end screen. */
  onLeave: () => void;
  /** Bekijk je fouten was tapped (so the flow can save the phase). */
  onReviewOpen?: () => void;
  now?: () => number;
}

export interface ExamScreen {
  readonly element: HTMLElement;
  render(view: ExamView): void;
  /** Updates only the clock text. Null hides it. */
  setTimeLeft(ms: number | null): void;
  /** Typed text or marked gaps on the open question, for a time out. Null when none. */
  getDraft(): Draft | null;
  destroy(): void;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createExamScreen(options: ExamScreenOptions): ExamScreen {
  const root = el('div', { class: 'break-screen exam-screen', attrs: { role: 'main', 'aria-label': 'Examen' } });
  root.classList.add('scrollable');
  applyMcBackground(root);
  const body = el('div', { class: 'break-body exam-body' });
  root.append(body);

  let cleanup: (() => void) | null = null;
  let host: QuestionHost | null = null;
  let clock: HTMLElement | null = null;

  function clear() {
    cleanup?.();
    cleanup = null;
    host = null;
    clock = null;
    root.querySelector('.exam-lock')?.remove();
    body.replaceChildren();
  }

  function button(label: string, testid: string, handler: () => void, cleanups: Array<() => void>) {
    const b = el('button', {
      class: 'exam-btn',
      text: label,
      attrs: { type: 'button', 'data-testid': testid },
    });
    let acted = false;
    cleanups.push(
      onTap(
        b,
        () => {
          if (acted) return;
          acted = true;
          handler();
        },
        { now: options.now },
      ),
    );
    return b;
  }

  function renderStart(view: Extract<ExamView, { phase: 'start' }>) {
    const cleanups: Array<() => void> = [];
    const line =
      view.minutes === null
        ? `Examen: ${view.count} vragen`
        : `Examen: ${view.count} vragen, ${view.minutes} minuten`;
    body.append(
      el('section', { class: 'exam-card', attrs: { 'aria-label': 'Examen' } }, [
        ...(view.title ? [el('p', { class: 'exam-sub', text: view.title })] : []),
        el('h2', { class: 'exam-title', text: line }),
        el('p', { class: 'exam-sub', text: 'Je mag elke vraag maar één keer proberen.' }),
        button('Begin', 'exam-begin', options.onBegin, cleanups),
      ]),
    );
    cleanup = () => cleanups.forEach((c) => c());
  }

  function renderQuestion(view: Extract<ExamView, { phase: 'question' }>) {
    const q = view.index;
    clock = el('span', { class: 'exam-clock', attrs: { 'data-testid': 'exam-clock', 'aria-label': 'Tijd over' } });
    const header = el('header', { class: 'exam-header' }, [
      el('span', { class: 'exam-number', text: `Vraag ${view.index + 1} van ${view.count}`, attrs: { 'data-testid': 'exam-number' } }),
      clock,
    ]);
    host = createQuestionHost({
      item: view.item,
      numeric: view.numeric,
      onAnswer: (response) => options.onAnswer(response, q),
    });
    body.append(header, host.element);
    setTimeLeft(view.msLeft);

    const lock: LockIcon = createLockIcon({ onOpenParent: options.onLock, now: options.now });
    lock.element.classList.add('exam-lock');
    root.append(lock.element);
    const h = host;
    cleanup = () => {
      h.destroy();
      lock.destroy();
    };
  }

  function renderEnd(view: Extract<ExamView, { phase: 'end' }>) {
    const cleanups: Array<() => void> = [];
    const perfect = view.reviewPages.length === 0;
    const children: Node[] = [
      el('h2', {
        class: 'exam-title',
        text: view.passed ? 'Geslaagd!' : 'Goed geoefend!',
        attrs: { 'data-testid': 'exam-result' },
      }),
      el('p', { class: 'exam-score', text: `Je score: ${view.score} van ${view.total}`, attrs: { 'data-testid': 'exam-score' } }),
    ];
    if (!view.passed) {
      children.push(el('p', { class: 'exam-sub', text: 'De vragen die nog lastig zijn komen terug in je pauzes.' }));
    }
    if (perfect) {
      children.push(el('p', { class: 'exam-sub exam-perfect', text: 'Alles goed!' }));
    } else {
      children.push(button('Bekijk je fouten', 'exam-review-open', () => openReview(view), cleanups));
    }
    children.push(button('Terug naar de wereld', 'exam-leave', options.onLeave, cleanups));
    body.append(el('section', { class: 'exam-card', attrs: { 'aria-label': 'Resultaat' } }, children));
    cleanup = () => cleanups.forEach((c) => c());
  }

  function openReview(endView: Extract<ExamView, { phase: 'end' }>) {
    options.onReviewOpen?.();
    clear();
    const review: ExamReview = createExamReview({
      pages: endView.reviewPages,
      onDone: () => render(endView),
      now: options.now,
    });
    body.append(review.element);
    cleanup = () => review.destroy();
  }

  function setTimeLeft(ms: number | null) {
    if (!clock) return;
    clock.hidden = ms === null;
    clock.textContent = ms === null ? '' : `Tijd over: ${formatClock(ms)}`;
  }

  function render(view: ExamView) {
    clear();
    if (view.phase === 'start') renderStart(view);
    else if (view.phase === 'question') renderQuestion(view);
    else renderEnd(view);
  }

  render(options.view);

  return {
    element: root,
    render,
    setTimeLeft,
    getDraft: () => host?.getDraft() ?? null,
    destroy() {
      clear();
      root.remove();
    },
  };
}
