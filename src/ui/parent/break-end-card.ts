// "Pauze beëindigen?" card (T55b, AC199). Shown on the parent layer after the right PIN
// from the break lock. It is the only thing the parent can reach from that route.

import '../../styles/parent.css';
import { el } from '../dom';
import { onTap } from '../tap';

export interface BreakEndCardOptions {
  onEnd: () => void;
  onBack: () => void;
  now?: () => number;
}

export interface BreakEndCard {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createBreakEndCard(options: BreakEndCardOptions): BreakEndCard {
  const endBtn = el('button', {
    class: 'parent-btn parent-btn-danger',
    text: 'Pauze nu beëindigen',
    attrs: { type: 'button', 'data-testid': 'break-end-confirm' },
  });
  const backBtn = el('button', {
    class: 'parent-btn parent-btn-primary',
    text: 'Terug naar de pauze',
    attrs: { type: 'button', 'data-testid': 'break-end-back' },
  });
  const cleanups = [
    onTap(endBtn, options.onEnd, { now: options.now }),
    onTap(backBtn, options.onBack, { now: options.now }),
  ];
  const root = el(
    'div',
    {
      class: 'parent parent-exam-stop',
      attrs: { role: 'dialog', 'aria-label': 'Pauze beëindigen', 'data-testid': 'break-end-card' },
    },
    [
      el('div', { class: 'parent-card parent-exam-stop-card' }, [
        el('h2', { class: 'parent-section-title', text: 'Pauze beëindigen?' }),
        el('p', { text: 'De pauze stopt nu en je gaat terug naar de wereld.' }),
        el('div', { class: 'parent-btn-row' }, [endBtn, backBtn]),
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
