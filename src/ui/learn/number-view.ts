// Number question view (Rekenen): shows the question, what was typed, and the number pad.
// Klaar is grey until the text is a complete number, so "3," and ",5" stay grey (AC58).
import type { TypeItem } from '../../content/format';
import { isCompleteNumber } from '../../core/numbers';
import { el } from '../dom';
import { createNumberPad } from './number-pad';

export const NUMBER_MAX_LENGTH = 12;

export interface NumberViewOptions {
  item: TypeItem;
  onAnswer: (text: string) => void;
  maxLength?: number;
}

export interface NumberView {
  el: HTMLElement;
  getText(): string;
  destroy(): void;
}

export function createNumberView(options: NumberViewOptions): NumberView {
  const max = options.maxLength ?? NUMBER_MAX_LENGTH;
  let text = '';
  let answered = false;

  const shown = el('span', { class: 'type-text' });
  const caret = el('span', { class: 'type-caret', attrs: { 'aria-hidden': 'true' } });
  const field = el('div', { class: 'type-field number-field', attrs: { role: 'textbox', 'aria-readonly': 'true', 'aria-label': 'Jouw antwoord' } }, [shown, caret]);

  const pad = createNumberPad({
    onChar: (c) => {
      if (answered || text.length >= max) return;
      if (c === ',' && text.includes(',')) return;
      text += c;
      refresh();
    },
    onBackspace: () => {
      if (answered) return;
      text = text.slice(0, -1);
      refresh();
    },
    onDone: () => {
      if (answered || !isCompleteNumber(text)) return;
      answered = true;
      options.onAnswer(text);
    },
  });

  function refresh() {
    shown.textContent = text;
    pad.setDoneEnabled(isCompleteNumber(text));
  }

  const children: Node[] = [];
  if (options.item.sentence) children.push(el('p', { class: 'type-sentence', text: options.item.sentence }));
  children.push(field, pad.el);
  const root = el('div', { class: 'type-view number-view' }, children);

  return {
    el: root,
    getText: () => text,
    destroy: () => pad.destroy(),
  };
}
