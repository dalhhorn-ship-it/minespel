// The app's own keyboard (AC57). Buttons only: no input element, so the iPad keyboard never opens.
// One tap types one character. Shift is one shot: it capitalises the next letter, then switches off.
import '../../styles/keyboard.css';
import { el } from '../dom';
import { onTap, TAP_MOVE_LIMIT } from '../tap';

export const LETTER_ROWS: readonly string[] = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
/** Characters Dutch spelling needs besides a to z. */
export const SPECIAL_KEYS: readonly string[] = ['é', 'è', 'ë', 'ï', 'ö', 'ü', "'", '-'];

export interface KidKeyboardOptions {
  onChar: (char: string) => void;
  onBackspace: () => void;
  /** Klaar. */
  onDone: () => void;
  doneLabel?: string;
}

export interface KidKeyboard {
  el: HTMLElement;
  /** Klaar grey (false) or ready (true). */
  setDoneEnabled(enabled: boolean): void;
  isShift(): boolean;
  destroy(): void;
}

/**
 * A tap for typing keys: every completed tap (pointerdown then pointerup, moved less than
 * TAP_MOVE_LIMIT) counts, with no repeat window, so "ee" types two letters. One pointer fires once.
 * Click events are not listened to, so a ghost click after touchend does nothing.
 */
export function onKeyTap(target: HTMLElement, handler: () => void): () => void {
  let activeId: number | null = null;
  let startX = 0;
  let startY = 0;
  const down = (e: PointerEvent) => {
    if (activeId !== null) return;
    activeId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_MOVE_LIMIT) return;
    handler();
  };
  const cancel = (e: PointerEvent) => {
    if (e.pointerId === activeId) activeId = null;
  };
  target.addEventListener('pointerdown', down);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', cancel);
  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', cancel);
  };
}

/** Stop the button from taking focus, so nothing can pop up the system keyboard. */
export function noFocus(button: HTMLElement): void {
  button.tabIndex = -1;
  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('focus', () => button.blur());
}

export function createKidKeyboard(options: KidKeyboardOptions): KidKeyboard {
  const cleanups: Array<() => void> = [];
  let shift = false;
  const charKeys: Array<{ button: HTMLButtonElement; base: string }> = [];

  const makeKey = (label: string, cls: string, handler: () => void, once = false): HTMLButtonElement => {
    const button = el('button', { class: `kb-key ${cls}`, text: label, attrs: { type: 'button' } });
    noFocus(button);
    cleanups.push(once ? onTap(button, handler) : onKeyTap(button, handler));
    return button;
  };

  const refresh = () => {
    for (const k of charKeys) k.button.textContent = shift ? k.base.toUpperCase() : k.base;
    shiftKey.setAttribute('aria-pressed', String(shift));
  };

  const charKey = (base: string): HTMLButtonElement => {
    const button = makeKey(base, 'kb-char', () => {
      const out = shift ? base.toUpperCase() : base;
      if (shift) {
        shift = false;
        refresh();
      }
      options.onChar(out);
    });
    charKeys.push({ button, base });
    return button;
  };

  const shiftKey = makeKey('⇧', 'kb-wide kb-shift', () => {
    shift = !shift;
    refresh();
  });
  shiftKey.setAttribute('aria-label', 'Hoofdletter');
  shiftKey.setAttribute('aria-pressed', 'false');

  const back = makeKey('⌫', 'kb-wide kb-back', () => options.onBackspace());
  back.setAttribute('aria-label', 'Wis');

  const space = makeKey('spatie', 'kb-space', () => options.onChar(' '));
  const done = makeKey(options.doneLabel ?? 'Klaar', 'kb-done', () => {
    if (!done.disabled) options.onDone();
  }, true);
  done.disabled = true;

  const rows: HTMLElement[] = [];
  LETTER_ROWS.forEach((letters, i) => {
    const keys = [...letters].map(charKey);
    if (i === LETTER_ROWS.length - 1) keys.unshift(shiftKey);
    if (i === LETTER_ROWS.length - 1) keys.push(back);
    rows.push(el('div', { class: 'kb-row' }, keys));
  });
  rows.push(el('div', { class: 'kb-row' }, SPECIAL_KEYS.map(charKey)));
  rows.push(el('div', { class: 'kb-row' }, [space, done]));

  const root = el('div', { class: 'kid-keyboard', attrs: { role: 'group', 'aria-label': 'Toetsenbord' } }, rows);

  return {
    el: root,
    setDoneEnabled(enabled) {
      done.disabled = !enabled;
    },
    isShift: () => shift,
    destroy() {
      for (const c of cleanups) c();
      cleanups.length = 0;
    },
  };
}
