// The app's own keyboard (AC57). Buttons only: no input element, so the iPad keyboard never opens.
// Laid out like the iPad: letters, then accent key, wide space and Klaar on the bottom row.
// The accent key swaps the letter area for é è ë ï ö ü ' - and back (abc). One tap types one character. Shift is one shot: it capitalises the next letter, then switches off.
import '../../styles/mc-menu.css';
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
  /** True while the accent panel shows instead of the letters. */
  isAccentPanel(): boolean;
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
  let accents = false;

  const makeKey = (label: string, cls: string, handler: () => void, once = false): HTMLButtonElement => {
    const button = el('button', { class: `kb-key ${cls}`, text: label, attrs: { type: 'button' } });
    noFocus(button);
    cleanups.push(once ? onTap(button, handler) : onKeyTap(button, handler));
    return button;
  };

  const shiftKeys: HTMLButtonElement[] = [];
  const refresh = () => {
    for (const k of charKeys) k.button.textContent = shift ? k.base.toUpperCase() : k.base;
    for (const s of shiftKeys) s.setAttribute('aria-pressed', String(shift));
  };

  const charKey = (base: string, backToLetters = false): HTMLButtonElement => {
    const button = makeKey(base, 'kb-char', () => {
      const out = shift ? base.toUpperCase() : base;
      if (shift) {
        shift = false;
        refresh();
      }
      if (backToLetters) showAccents(false);
      options.onChar(out);
    });
    charKeys.push({ button, base });
    return button;
  };

  const shiftKey = (): HTMLButtonElement => {
    const key = makeKey('⇧', 'kb-wide kb-shift', () => {
      shift = !shift;
      refresh();
    });
    key.setAttribute('aria-label', 'Hoofdletter');
    key.setAttribute('aria-pressed', 'false');
    shiftKeys.push(key);
    return key;
  };

  const backKey = (): HTMLButtonElement => {
    const key = makeKey('⌫', 'kb-wide kb-back', () => options.onBackspace());
    key.setAttribute('aria-label', 'Wis');
    return key;
  };

  const space = makeKey('spatie', 'kb-space', () => options.onChar(' '));
  space.setAttribute('aria-label', 'Spatie');
  const done = makeKey(options.doneLabel ?? 'Klaar', 'kb-done', () => {
    if (!done.disabled) options.onDone();
  }, true);
  done.disabled = true;

  // Letter panel: three rows. Accent panel: the same height, so the keyboard never jumps.
  const letterRows = LETTER_ROWS.map((letters, i) => {
    const keys = [...letters].map((c) => charKey(c));
    if (i === LETTER_ROWS.length - 1) {
      keys.unshift(shiftKey());
      keys.push(backKey());
    }
    return el('div', { class: 'kb-row' }, keys);
  });
  const half = SPECIAL_KEYS.length / 2;
  const accentRows = [
    el('div', { class: 'kb-row' }, SPECIAL_KEYS.slice(0, half).map((c) => charKey(c, true))),
    el('div', { class: 'kb-row' }, SPECIAL_KEYS.slice(half).map((c) => charKey(c, true))),
    el('div', { class: 'kb-row kb-row-accent-ends' }, [shiftKey(), backKey()]),
  ];
  const letterPanel = el('div', { class: 'kb-panel kb-letters' }, letterRows);
  const accentPanel = el('div', { class: 'kb-panel kb-accents' }, accentRows);
  accentPanel.hidden = true;

  const accentKey = makeKey('é ë', 'kb-wide kb-accent', () => showAccents(!accents));
  accentKey.setAttribute('aria-label', 'Letters met streepjes');
  accentKey.setAttribute('aria-pressed', 'false');
  function showAccents(on: boolean): void {
    accents = on;
    letterPanel.hidden = on;
    accentPanel.hidden = !on;
    accentKey.textContent = on ? 'abc' : 'é ë';
    accentKey.setAttribute('aria-label', on ? 'Terug naar letters' : 'Letters met streepjes');
    accentKey.setAttribute('aria-pressed', String(on));
  }

  const bottom = el('div', { class: 'kb-row kb-bottom' }, [accentKey, space, done]);
  const rows: HTMLElement[] = [letterPanel, accentPanel, bottom];

  const root = el('div', { class: 'kid-keyboard', attrs: { role: 'group', 'aria-label': 'Toetsenbord' } }, rows);

  return {
    el: root,
    setDoneEnabled(enabled) {
      done.disabled = !enabled;
    },
    isShift: () => shift,
    isAccentPanel: () => accents,
    destroy() {
      for (const c of cleanups) c();
      cleanups.length = 0;
    },
  };
}
