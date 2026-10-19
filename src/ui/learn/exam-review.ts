// Exam review (AC153 view part): one page per mistake, in the teach moment card style.
// Each page shows the question, the kid's answer (or "niet beantwoord"), the right answer and the explain text.
// "Volgende" goes on, the last page has "Klaar". No points, no malus. Render only, no storage.
import '../../styles/mc-menu.css';
import '../../styles/lesson.css';
import '../../styles/exam.css';
import { el } from '../dom';
import { onTap } from '../tap';

/** One mistake as plain data. `given` is null for a question left open. */
export interface ExamReviewPage {
  prompt: string;
  given: string | null;
  right: string;
  explain: string;
}

export interface ExamReviewOptions {
  pages: readonly ExamReviewPage[];
  /** Klaar on the last page. */
  onDone: () => void;
  now?: () => number;
}

export interface ExamReview {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createExamReview(options: ExamReviewOptions): ExamReview {
  const { pages } = options;
  const root = el('section', { class: 'exam-review teach-moment', attrs: { 'aria-label': 'Bekijk je fouten' } });
  const scroll = el('div', { class: 'teach-scroll scrollable' });
  const footer = el('div', { class: 'teach-footer' });
  root.append(scroll, footer);

  let page = 0;
  let off: (() => void) | null = null;

  function show() {
    off?.();
    const p = pages[page];
    if (!p) return;
    const last = page === pages.length - 1;
    scroll.replaceChildren(
      el('h2', { class: 'teach-heading', text: `Fout ${page + 1} van ${pages.length}` }),
      el('p', { class: 'exam-review-prompt', text: p.prompt }),
      el('p', { class: 'exam-review-given', text: `Jouw antwoord: ${p.given === null ? 'niet beantwoord' : p.given}` }),
      el('p', { class: 'teach-answer exam-review-right', text: `Goed antwoord: ${p.right}` }),
      el('p', { class: 'teach-explain', text: p.explain }),
    );
    const btn = el('button', {
      class: 'teach-done exam-review-btn',
      text: last ? 'Klaar' : 'Volgende',
      attrs: { type: 'button', 'data-testid': last ? 'exam-review-done' : 'exam-review-next' },
    });
    footer.replaceChildren(btn);
    let acted = false;
    off = onTap(
      btn,
      () => {
        if (acted) return;
        acted = true;
        if (last) options.onDone();
        else {
          page += 1;
          show();
        }
      },
      { now: options.now },
    );
  }
  show();

  return {
    element: root,
    destroy() {
      off?.();
      off = null;
      root.remove();
    },
  };
}
