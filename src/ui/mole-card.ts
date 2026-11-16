// The Monstermol warning card (v16, AC244): shows when the kid mines a Waarschuwsteen. Plain text, one big OK button
// (at least 56 x 56 points). Boot shows it through `screens.showKidOverlay`, so the loop and the play timer stop
// until OK is tapped.
import '../styles/mole-card.css';
import { el } from './dom';
import { onTap } from './tap';

export const MOLE_CARD_TEXT = 'Niet verder graven! Onder de streep slaapt de Monstermol.';

export interface MoleCard {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createMoleCard(options: { onOk: () => void; now?: () => number; doc?: Document }): MoleCard {
  const text = el('p', { class: 'mole-text', text: MOLE_CARD_TEXT, attrs: { 'data-testid': 'mole-text' } }, [], options.doc);
  const ok = el('button', { class: 'mole-ok', text: 'OK', attrs: { type: 'button', 'data-testid': 'mole-ok' } }, [], options.doc);
  const cleanup = onTap(ok, () => options.onOk(), { now: options.now });
  const card = el(
    'div',
    { class: 'mole-card', attrs: { role: 'dialog', 'aria-label': 'Monstermol', 'data-testid': 'mole-card' } },
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
