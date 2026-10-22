// Teach moment card (AC146 view part): "Zo zit het:", the right answer, the explain text,
// teaching (a lesson page or a worked example) and "Ik snap het".
// The point change itself is done by the caller. This only shows the card.
import '../../styles/mc-menu.css';
import '../../styles/lesson.css';
import type { Lesson, LessonPage } from '../../content/format';
import { el } from '../dom';
import { onTap } from '../tap';
import { renderLessonPage } from './lesson-view';

/** A worked example as plain data: a title and one string per step. */
export interface WorkedExampleView {
  title: string;
  steps: string[];
}

export type Teaching = { kind: 'page'; page: LessonPage } | { kind: 'example'; example: WorkedExampleView };

/** The page linked to the skill, else the first page, else undefined for an empty lesson. */
export function pickLessonPage(lesson: Lesson, skill: string): LessonPage | undefined {
  return lesson.pages.find((p) => p.skill === skill) ?? lesson.pages[0];
}

export interface TeachMomentOptions {
  /** The right answer as text. */
  answer: string;
  explain: string;
  /** Undefined shows no teaching block (for example a topic without pages). */
  teaching?: Teaching;
  onDone: () => void;
  now?: () => number;
}

export interface TeachMoment {
  element: HTMLElement;
  destroy(): void;
}

export function createTeachMoment(options: TeachMomentOptions): TeachMoment {
  const root = el('section', { class: 'teach-moment', attrs: { 'aria-label': 'Zo zit het' } });
  // The text part scrolls on its own (.scrollable lets the finger scroll, see lockdown.ts).
  // The footer with "Ik snap het" always stays in view (F5).
  const scroll = el('div', { class: 'teach-scroll scrollable' });
  scroll.append(el('h2', { class: 'teach-heading', text: 'Zo zit het:' }));
  scroll.append(el('p', { class: 'teach-answer', text: options.answer }));
  scroll.append(el('p', { class: 'teach-explain', text: options.explain }));

  const t = options.teaching;
  if (t?.kind === 'page') {
    const box = el('div', { class: 'teach-lesson' }, [renderLessonPage(t.page)]);
    scroll.append(box);
  } else if (t?.kind === 'example') {
    const list = el('ol', { class: 'teach-steps' });
    for (const step of t.example.steps) list.append(el('li', { text: step }));
    scroll.append(el('div', { class: 'teach-lesson teach-worked' }, [el('h3', { class: 'lesson-title', text: t.example.title }), list]));
  }

  const button = el('button', { class: 'teach-done', text: 'Ik snap het', attrs: { type: 'button' } });
  const footer = el('div', { class: 'teach-footer' }, [button]);
  root.append(scroll, footer);

  let done = false;
  const off = onTap(
    button,
    () => {
      if (done) return;
      done = true;
      options.onDone();
    },
    { now: options.now },
  );
  return { element: root, destroy: off };
}
