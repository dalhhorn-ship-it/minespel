// Dino naming screen using the app's own kid keyboard (T45, AC18, AC57).
// Max 12 characters, only keyboard characters allowed, placeholder "Bedenk een leuke dinonaam".

import '../styles/dino-menu.css';
import { cleanName, NAME_MAX_LENGTH } from '../render/name-tag';
import { el } from './dom';
import {
  createKidKeyboard,
  LETTER_ROWS,
  SPECIAL_KEYS,
} from './learn/kid-keyboard';
import { onTap } from './tap';

const ALLOWED_CHARS = new Set<string>([
  ...LETTER_ROWS.join(''),
  ...LETTER_ROWS.join('').toUpperCase(),
  ...SPECIAL_KEYS,
  ' ',
]);

/** Filters a string to allowed kid-keyboard characters and caps at 12 characters (AC18). */
export function filterDinoNameDraft(input: string): string {
  const chars: string[] = [];
  for (const ch of Array.from(input)) {
    if (!ALLOWED_CHARS.has(ch)) continue;
    chars.push(ch);
    if (chars.length >= NAME_MAX_LENGTH) break;
  }
  return chars.join('');
}

export interface NameScreenOptions {
  initialName?: string;
  speciesName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  now?: () => number;
}

export interface NameScreen {
  readonly element: HTMLElement;
  getValue(): string;
  destroy(): void;
}

export const NAME_PROMPT_TEXT = 'Bedenk een leuke dinonaam';

export function createNameScreen(options: NameScreenOptions): NameScreen {
  let draft = filterDinoNameDraft(options.initialName ?? '');

  const valueEl = el('span', {
    class: 'name-screen-value',
    attrs: { 'data-testid': 'dino-name-display' },
  });
  const placeholderEl = el('span', {
    class: 'name-screen-placeholder',
    text: NAME_PROMPT_TEXT,
  });
  const counterEl = el('span', {
    class: 'name-screen-counter',
  });

  const displayBox = el('div', { class: 'name-screen-box' }, [
    valueEl,
    placeholderEl,
    counterEl,
  ]);

  const keyboard = createKidKeyboard({
    doneLabel: 'Opslaan',
    onChar: (ch) => {
      if (!ALLOWED_CHARS.has(ch)) return;
      if (Array.from(draft).length >= NAME_MAX_LENGTH) return;
      draft = filterDinoNameDraft(draft + ch);
      render();
    },
    onBackspace: () => {
      const chars = Array.from(draft);
      chars.pop();
      draft = chars.join('');
      render();
    },
    onDone: () => {
      const cleaned = cleanName(filterDinoNameDraft(draft));
      if (cleaned.length > 0) {
        options.onSave(cleaned);
      }
    },
  });

  const cancelBtn = el('button', {
    class: 'dino-menu-btn',
    text: 'Terug',
    attrs: { type: 'button' },
  });
  const offCancel = onTap(cancelBtn, () => options.onCancel(), { now: options.now });

  const header = el('div', { class: 'dino-menu-header' }, [
    el('h2', {
      class: 'dino-menu-title',
      text: options.speciesName ? `Naam geven aan ${options.speciesName}` : 'Naam geven',
    }),
    cancelBtn,
  ]);

  const subtitle = el('p', {
    class: 'name-screen-subtitle',
    text: NAME_PROMPT_TEXT,
  });

  const card = el(
    'div',
    {
      class: 'dino-menu-card dino-menu-card-wide',
      attrs: { role: 'dialog', 'aria-label': 'Naam geven' },
    },
    [header, subtitle, displayBox, keyboard.el],
  );
  const root = el('div', { class: 'dino-menu-backdrop' }, [card]);

  function render() {
    const len = Array.from(draft).length;
    valueEl.textContent = draft;
    valueEl.hidden = len === 0;
    placeholderEl.hidden = len > 0;
    counterEl.textContent = `${len} / ${NAME_MAX_LENGTH}`;
    keyboard.setDoneEnabled(cleanName(draft).length > 0);
  }

  render();

  return {
    element: root,
    getValue: () => cleanName(filterDinoNameDraft(draft)),
    destroy() {
      offCancel();
      keyboard.destroy();
      root.remove();
    },
  };
}
