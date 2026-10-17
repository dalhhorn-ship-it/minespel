import { describe, expect, it, vi } from 'vitest';
import type { Item } from '../../content/format';
import { createQuestionHost } from './question-host';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
let n = 1;
function tap(t: Element | undefined) {
  const id = n++;
  t?.dispatchEvent(ptr('pointerdown', id));
  t?.dispatchEvent(ptr('pointerup', id));
}
const base = { id: 'x', level: 'M6', skill: 's', prompt: 'Vraag?', explain: 'e' };

describe('question host', () => {
  it('uses the choice view and reports a choice response', () => {
    const onAnswer = vi.fn();
    const item: Item = { ...base, type: 'choice', options: ['a', 'b'], answer: 0 };
    const h = createQuestionHost({ item, onAnswer });
    tap(h.element.querySelectorAll('.q-option')[1]);
    expect(onAnswer).toHaveBeenCalledWith({ type: 'choice', index: 1 });
    h.destroy();
  });
  it('uses the find-error view', () => {
    const onAnswer = vi.fn();
    const item: Item = { ...base, type: 'find-error', words: ['ik', 'bint'], answer: 1, correction: 'bent' };
    const h = createQuestionHost({ item, onAnswer });
    tap(h.element.querySelectorAll('.q-word')[1]);
    expect(onAnswer).toHaveBeenCalledWith({ type: 'find-error', index: 1 });
  });
  it('shows the prompt above typed views and uses the letter keyboard or the number pad', () => {
    const item: Item = { ...base, type: 'type', answer: ['5'] };
    const letters = createQuestionHost({ item, onAnswer: () => {} });
    expect(letters.element.querySelector('.q-prompt')?.textContent).toBe('Vraag?');
    expect(letters.element.querySelector('.number-view')).toBeNull();
    const numbers = createQuestionHost({ item, numeric: true, onAnswer: () => {} });
    expect(numbers.element.querySelector('.number-view')).not.toBeNull();
    expect(numbers.element.querySelector('.q-prompt')?.textContent).toBe('Vraag?');
  });
  it('reports typed text from the number pad as a type response', () => {
    const onAnswer = vi.fn();
    const item: Item = { ...base, type: 'type', answer: ['5'] };
    const h = createQuestionHost({ item, numeric: true, onAnswer });
    const btn = (t: string) => [...h.element.querySelectorAll('button')].find((b) => b.textContent === t);
    tap(btn('5'));
    tap(btn('Klaar'));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'type', text: '5' });
    h.destroy();
    expect(h.element.isConnected).toBe(false);
  });
  it('uses the punctuate view', () => {
    const item: Item = { ...base, type: 'punctuate', mark: ',', words: ['a', 'b'], answer: [0] };
    expect(createQuestionHost({ item, onAnswer: () => {} }).element.querySelector('.q-line')).not.toBeNull();
  });
});
