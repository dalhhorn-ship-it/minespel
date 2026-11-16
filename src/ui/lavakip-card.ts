// The order card of the Lavakip-bar (v23, decision 144): Bestel, the count, the greyed states, the `sis` sizzle and
// "Alsjeblieft, een warme lavakip!". It goes in the kid overlay, so the loop and the play timer stop while it is open.
// V22a holds the type and an empty dialog; V23b draws it.
import { el } from './dom';

export interface LavakipCardOptions {
  /** Lavakip carried now, and the points of the kid. */
  carried: () => number;
  points: () => number;
  /** Bestel: orders one lavakip. */
  onOrder: () => Promise<unknown> | unknown;
  onClose: () => void;
  now?: () => number;
}

export interface LavakipCard {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createLavakipCard(options: LavakipCardOptions): LavakipCard {
  void options;
  const root = el('div', { class: 'lavakip-backdrop', attrs: { role: 'dialog', 'aria-label': 'Lavakip-bar', 'data-testid': 'lavakip-card' } });
  return {
    element: root,
    destroy() {
      root.remove();
    },
  };
}
