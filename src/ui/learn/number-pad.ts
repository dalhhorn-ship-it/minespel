// The number pad for Rekenen: digits, one comma, backspace and Klaar. No dot, minus or space (AC121).
import '../../styles/keyboard.css';
import { el } from '../dom';
import { onTap } from '../tap';
import { noFocus, onKeyTap } from './kid-keyboard';

export interface NumberPadOptions {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onDone: () => void;
}

export interface NumberPad {
  el: HTMLElement;
  setDoneEnabled(enabled: boolean): void;
  destroy(): void;
}

export const PAD_KEYS: readonly string[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0'];

export function createNumberPad(options: NumberPadOptions): NumberPad {
  const cleanups: Array<() => void> = [];
  const makeKey = (label: string, cls: string, handler: () => void, once = false): HTMLButtonElement => {
    const button = el('button', { class: `kb-key ${cls}`, text: label, attrs: { type: 'button' } });
    noFocus(button);
    cleanups.push(once ? onTap(button, handler) : onKeyTap(button, handler));
    return button;
  };

  const keys = PAD_KEYS.map((k) => makeKey(k, 'kb-char', () => options.onChar(k)));
  const back = makeKey('⌫', 'kb-back', () => options.onBackspace());
  back.setAttribute('aria-label', 'Wis');
  const done = makeKey('Klaar', 'kb-done', () => {
    if (!done.disabled) options.onDone();
  }, true);
  done.disabled = true;

  const root = el('div', { class: 'number-pad', attrs: { role: 'group', 'aria-label': 'Cijfers' } }, [...keys, back, done]);
  return {
    el: root,
    setDoneEnabled(enabled) {
      done.disabled = !enabled;
    },
    destroy() {
      for (const c of cleanups) c();
      cleanups.length = 0;
    },
  };
}
