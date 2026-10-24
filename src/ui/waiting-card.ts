// The one "Even geduld..." card for taps before the app is ready (R1b, decision 83).
// Plain text only. A big Terug button always brings the kid back.

import '../styles/waiting-card.css';
import { el } from './dom';
import { onTap } from './tap';

export const WAITING_TEXT = 'Even geduld...';
export const FAILED_TEXT = 'Je spullen laden niet. Sluit de app en open hem opnieuw.';

export interface WaitingCardOptions {
  onBack: () => void;
  /** Show the "cannot load" text from the start. */
  failed?: boolean;
  now?: () => number;
}

export interface WaitingCard {
  readonly element: HTMLElement;
  /** Changes the text to the friendly "cannot load" words. */
  showFailure(): void;
  destroy(): void;
}

export function createWaitingCard(options: WaitingCardOptions): WaitingCard {
  const text = el('p', {
    class: 'waiting-text',
    text: options.failed ? FAILED_TEXT : WAITING_TEXT,
    attrs: { 'data-testid': 'waiting-text', 'aria-live': 'polite' },
  });
  const back = el('button', {
    class: 'waiting-back',
    text: 'Terug',
    attrs: { type: 'button', 'data-testid': 'waiting-back' },
  });
  const cleanup = onTap(back, () => options.onBack(), { now: options.now });
  const card = el(
    'div',
    { class: 'waiting-card', attrs: { role: 'dialog', 'aria-label': 'Even geduld', 'data-testid': 'waiting-card' } },
    [text, back],
  );
  const root = el('div', { class: 'waiting-backdrop' }, [card]);
  return {
    element: root,
    showFailure() {
      text.textContent = FAILED_TEXT;
    },
    destroy() {
      cleanup();
      root.remove();
    },
  };
}
