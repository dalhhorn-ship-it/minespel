// Type question view: shows the prompt sentence, what was typed so far, and the kid keyboard.
// It only collects the answer and calls onAnswer. Checking is done elsewhere.
import type { TypeItem } from '../../content/format';
import { normalizeTyped } from '../../learning/answer-check';
import { el } from '../dom';
import { onTap } from '../tap';
import { createKidKeyboard } from './kid-keyboard';

export const TYPE_MAX_LENGTH = 40;

export interface TypeViewOptions {
  item: TypeItem;
  onAnswer: (text: string) => void;
  maxLength?: number;
}

export interface TypeView {
  el: HTMLElement;
  getText(): string;
  destroy(): void;
}

export function createTypeView(options: TypeViewOptions): TypeView {
  const max = options.maxLength ?? TYPE_MAX_LENGTH;
  let text = '';
  let answered = false;

  const shown = el('span', { class: 'type-text' });
  const caret = el('span', { class: 'type-caret', attrs: { 'aria-hidden': 'true' } });
  const field = el('div', { class: 'type-field', attrs: { role: 'textbox', 'aria-readonly': 'true', 'aria-label': 'Jouw antwoord' } }, [shown, caret]);

  const keyboard = createKidKeyboard({
    onChar: (c) => {
      if (answered || [...text].length >= max) return;
      text += c;
      refresh();
    },
    onBackspace: () => {
      if (answered) return;
      text = [...text].slice(0, -1).join('');
      refresh();
    },
    onDone: () => {
      if (answered || normalizeTyped(text) === '') return;
      answered = true;
      options.onAnswer(text);
    },
  });

  function refresh() {
    shown.textContent = text;
    keyboard.setDoneEnabled(normalizeTyped(text) !== '');
  }

  const children: Node[] = [];
  if (options.item.sentence) children.push(el('p', { class: 'type-sentence', text: options.item.sentence }));
  children.push(field, keyboard.el);
  const root = el('div', { class: 'type-view' }, children);
  // Taps on the field do nothing; they must not select text or open the system keyboard.
  const stop = onTap(field, () => {});

  return {
    el: root,
    getText: () => text,
    destroy() {
      stop();
      keyboard.destroy();
    },
  };
}
