// "Examen stoppen?" card (T51c, AC157, AC158). Shown on the parent layer after the right PIN
// from the exam lock. It is the only thing the parent can reach from that route.

import '../../styles/parent.css';
import { el } from '../dom';
import { onTap } from '../tap';

export interface ExamStopCardOptions {
  onStop: () => void;
  onBack: () => void;
  now?: () => number;
}

export interface ExamStopCard {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createExamStopCard(options: ExamStopCardOptions): ExamStopCard {
  const stopBtn = el('button', {
    class: 'parent-btn parent-btn-danger',
    text: 'Stoppen',
    attrs: { type: 'button', 'data-testid': 'exam-stop-confirm' },
  });
  const backBtn = el('button', {
    class: 'parent-btn parent-btn-primary',
    text: 'Terug naar het examen',
    attrs: { type: 'button', 'data-testid': 'exam-stop-back' },
  });
  const cleanups = [
    onTap(stopBtn, options.onStop, { now: options.now }),
    onTap(backBtn, options.onBack, { now: options.now }),
  ];
  const root = el(
    'div',
    {
      class: 'parent parent-exam-stop',
      attrs: { role: 'dialog', 'aria-label': 'Examen stoppen', 'data-testid': 'exam-stop-card' },
    },
    [
      el('div', { class: 'parent-card parent-exam-stop-card' }, [
        el('h2', { class: 'parent-section-title', text: 'Examen stoppen?' }),
        el('p', { text: 'Het examen wordt gestopt en er komt geen gouden ei.' }),
        el('div', { class: 'parent-btn-row' }, [stopBtn, backBtn]),
      ]),
    ],
  );
  return {
    element: root,
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
