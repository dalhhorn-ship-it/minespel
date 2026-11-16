// The tap card of a caught mole (v22, decision 144, AC298): "Zzz... de Monstermol slaapt in zijn hok." with one big OK
// (at least 56 x 56 points). It goes in the kid overlay, so the loop and the play timer stop until OK. V22a holds the
// card and the wiring (the monster system never calls it yet); V22c adds its stylesheet and tests.
import { el } from './dom';
import { onTap } from './tap';

export const MOLE_TAP_TEXT = 'Zzz... de Monstermol slaapt in zijn hok.';

export interface MoleTapCard {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createMoleTapCard(options: { onOk: () => void; now?: () => number; doc?: Document }): MoleTapCard {
  const text = el('p', { class: 'mole-text', text: MOLE_TAP_TEXT, attrs: { 'data-testid': 'mole-tap-text' } }, [], options.doc);
  const ok = el('button', { class: 'mole-ok', text: 'OK', attrs: { type: 'button', 'data-testid': 'mole-tap-ok' } }, [], options.doc);
  const cleanup = onTap(ok, () => options.onOk(), { now: options.now });
  const card = el(
    'div',
    { class: 'mole-card', attrs: { role: 'dialog', 'aria-label': 'Monstermol', 'data-testid': 'mole-tap-card' } },
    [text, ok],
    options.doc,
  );
  const root = el('div', { class: 'mole-backdrop' }, [card], options.doc);
  return {
    element: root,
    destroy() {
      cleanup();
      root.remove();
    },
  };
}
