import { describe, expect, it } from 'vitest';
import type { FindErrorItem } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { createFindErrorView } from './find-error-view';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
function tap(target: Element, id = 1) {
  target.dispatchEvent(ptr('pointerdown', id));
  target.dispatchEvent(ptr('pointerup', id));
}

const item: FindErrorItem = {
  id: 'f1', type: 'find-error', level: 'M6', skill: 's', prompt: 'Welk woord is fout?', explain: 'x',
  words: ['De', 'hond', '<u>blaft</u>', 'luid'], answer: 1, correction: 'hond',
};

describe('find-error view', () => {
  it('shows a button per word and Geen fout, as plain text (AC54, AC88)', () => {
    const v = createFindErrorView({ item, onAnswer: () => {} });
    expect(v.element.querySelectorAll('.q-word')).toHaveLength(4);
    expect(v.element.querySelector('.q-none')?.textContent).toBe('Geen fout');
    expect(v.element.querySelector('u')).toBeNull();
  });

  it('reports the word index', () => {
    const got: Response[] = [];
    const v = createFindErrorView({ item, onAnswer: (r) => got.push(r) });
    tap(v.element.querySelectorAll('.q-word')[3]!);
    expect(got).toEqual([{ type: 'find-error', index: 3 }]);
  });

  it('reports -1 for Geen fout', () => {
    const got: Response[] = [];
    const v = createFindErrorView({ item, onAnswer: (r) => got.push(r) });
    tap(v.element.querySelector('.q-none')!);
    expect(got).toEqual([{ type: 'find-error', index: -1 }]);
  });

  it('keeps only the first answer (AC117)', () => {
    const got: Response[] = [];
    const v = createFindErrorView({ item, onAnswer: (r) => got.push(r) });
    const words = v.element.querySelectorAll('.q-word');
    tap(words[0]!);
    tap(words[0]!);
    tap(words[1]!, 2);
    tap(v.element.querySelector('.q-none')!, 3);
    expect(got).toEqual([{ type: 'find-error', index: 0 }]);
  });
});
