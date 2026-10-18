// Lesson view: a lesson page by page. Swipe or tap "Volgende". The last page has "Ik snap het!" (AC49 view part).
// Text is set with textContent only (AC88). No hover, buttons act once on a double tap (AC117).
import '../../styles/mc-menu.css';
import '../../styles/lesson.css';
import type { Lesson, LessonPage } from '../../content/format';
import { el } from '../dom';
import { onTap } from '../tap';

/** A swipe must move at least this many points sideways, and more sideways than up or down. */
export const SWIPE_MIN = 50;

/** Pure page card: title, text, examples and tip. Also used by the teach moment. */
export function renderLessonPage(page: LessonPage): HTMLElement {
  const card = el('div', { class: 'lesson-page' });
  card.append(el('h2', { class: 'lesson-title', text: page.title }));
  card.append(el('p', { class: 'lesson-text', text: page.text }));
  for (const ex of page.examples) {
    const box = el('div', { class: 'lesson-example' });
    box.append(el('p', { class: 'lesson-good', text: ex.good }));
    if (ex.bad !== undefined) box.append(el('p', { class: 'lesson-bad', text: ex.bad }));
    if (ex.why !== undefined) box.append(el('p', { class: 'lesson-why', text: ex.why }));
    card.append(box);
  }
  if (page.tip !== undefined) card.append(el('p', { class: 'lesson-tip', text: page.tip }));
  return card;
}

export interface LessonViewOptions {
  lesson: Lesson;
  /** Called once when the kid taps "Ik snap het!" on the last page. */
  onDone: () => void;
  /** Clock for the double tap guard, injectable for tests. */
  now?: () => number;
}

export interface LessonView {
  element: HTMLElement;
  /** Index of the page on screen. */
  pageIndex(): number;
  next(): void;
  prev(): void;
  destroy(): void;
}

export function createLessonView(options: LessonViewOptions): LessonView {
  const pages = options.lesson.pages;
  const root = el('section', { class: 'lesson-view', attrs: { 'aria-label': 'Les' } });
  const body = el('div', { class: 'lesson-body scrollable' });
  const dots = el('div', { class: 'lesson-dots', attrs: { 'aria-hidden': 'true' } });
  const nextButton = el('button', { class: 'lesson-next', attrs: { type: 'button' } });
  root.append(body, dots, nextButton);

  let index = 0;
  let done = false;
  const isLast = () => index >= pages.length - 1;

  function show() {
    const page = pages[index];
    body.replaceChildren(page ? renderLessonPage(page) : el('p', { text: '' }));
    dots.replaceChildren(...pages.map((_, i) => el('span', { class: i === index ? 'lesson-dot on' : 'lesson-dot' })));
    nextButton.textContent = isLast() ? 'Ik snap het!' : 'Volgende';
    nextButton.classList.toggle('lesson-finish', isLast());
  }

  function next() {
    if (!isLast()) {
      index++;
      show();
    }
  }
  function prev() {
    if (index > 0) {
      index--;
      show();
    }
  }
  function press() {
    if (isLast()) {
      if (done) return;
      done = true;
      options.onDone();
    } else {
      next();
    }
  }

  const cleanups: Array<() => void> = [onTap(nextButton, press, { now: options.now })];

  // Swipe: left goes forward, right goes back. Swiping never finishes the lesson.
  let swipeId: number | null = null;
  let sx = 0;
  let sy = 0;
  const down = (e: PointerEvent) => {
    if (swipeId !== null) return;
    swipeId = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== swipeId) return;
    swipeId = null;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) next();
    else prev();
  };
  const cancel = (e: PointerEvent) => {
    if (e.pointerId === swipeId) swipeId = null;
  };
  body.addEventListener('pointerdown', down);
  body.addEventListener('pointerup', up);
  body.addEventListener('pointercancel', cancel);
  cleanups.push(() => {
    body.removeEventListener('pointerdown', down);
    body.removeEventListener('pointerup', up);
    body.removeEventListener('pointercancel', cancel);
  });

  show();
  return {
    element: root,
    pageIndex: () => index,
    next,
    prev,
    destroy: () => cleanups.forEach((c) => c()),
  };
}
