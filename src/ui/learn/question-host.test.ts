// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, PunctuateItem, TypeItem } from '../../content/format';
import { createQuestionHost } from './question-host';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
const tap = (el: Element) => {
  el.dispatchEvent(ptr('pointerdown', 1));
  el.dispatchEvent(ptr('pointerup', 1));
};

const choice: ChoiceItem = { id: 'c', type: 'choice', level: 'M6', skill: 's', prompt: 'k', explain: 'x', options: ['a', 'b'], answer: 0 };
const typeItem: TypeItem = { id: 't', type: 'type', level: 'M6', skill: 's', prompt: 'p', explain: 'x', answer: ['hond'] };
const punct: PunctuateItem = { id: 'p', type: 'punctuate', level: 'M6', skill: 's', prompt: 'p', explain: 'x', mark: ',', words: ['a', 'b', 'c'], answer: [0] };

describe('question host getDraft', () => {
  it('is null for a choice question', () => {
    expect(createQuestionHost({ item: choice, onAnswer: () => {} }).getDraft()).toBeNull();
  });
  it('is the typed text for a type question, null when empty', () => {
    const h = createQuestionHost({ item: typeItem, onAnswer: () => {} });
    document.body.append(h.element);
    expect(h.getDraft()).toBeNull();
    tap([...h.element.querySelectorAll('button')].find((b) => b.textContent === 'h')!);
    expect(h.getDraft()).toEqual({ type: 'type', text: 'h' });
  });
  it('is the typed number for a numeric question', () => {
    const h = createQuestionHost({ item: typeItem, numeric: true, onAnswer: () => {} });
    document.body.append(h.element);
    expect(h.getDraft()).toBeNull();
    tap([...h.element.querySelectorAll('button')].find((b) => b.textContent === '7')!);
    expect(h.getDraft()).toEqual({ type: 'type', text: '7' });
  });
  it('is the marked gaps for a punctuate question, null with none', () => {
    const h = createQuestionHost({ item: punct, onAnswer: () => {} });
    expect(h.getDraft()).toBeNull();
    tap(h.element.querySelectorAll('.q-gap')[1]!);
    expect(h.getDraft()).toEqual({ type: 'punctuate', gaps: [1] });
  });
});
