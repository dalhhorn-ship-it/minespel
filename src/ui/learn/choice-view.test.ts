import { describe, expect, it } from 'vitest';
import type { ChoiceItem } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { createChoiceView } from './choice-view';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
function tap(target: Element, id = 1) {
  target.dispatchEvent(ptr('pointerdown', id));
  target.dispatchEvent(ptr('pointerup', id));
}

const item: ChoiceItem = {
  id: 'c1', type: 'choice', level: 'M6', skill: 's', prompt: 'Kies <b>goed</b>', explain: 'x',
  sentence: 'Ik <i>ben</i> blij.', options: ['a', '<img src=x>', 'c'], answer: 1,
};

describe('choice view', () => {
  it('shows one button per option and plain text only (AC53, AC88)', () => {
    const v = createChoiceView({ item, onAnswer: () => {} });
    expect(v.element.querySelectorAll('button')).toHaveLength(3);
    expect(v.element.querySelector('img')).toBeNull();
    expect(v.element.querySelector('b')).toBeNull();
    expect(v.element.querySelector('.q-prompt')?.textContent).toBe('Kies <b>goed</b>');
    expect(v.element.querySelector('.q-sentence')?.textContent).toBe('Ik <i>ben</i> blij.');
  });

  it('reports the tapped index', () => {
    const got: Response[] = [];
    const v = createChoiceView({ item, onAnswer: (r) => got.push(r) });
    tap(v.element.querySelectorAll('button')[2]!);
    expect(got).toEqual([{ type: 'choice', index: 2 }]);
  });

  it('reports only the first answer for a double tap and for two fingers (AC117)', () => {
    const got: Response[] = [];
    const v = createChoiceView({ item, onAnswer: (r) => got.push(r) });
    const [a, b] = v.element.querySelectorAll('button');
    tap(a!);
    tap(a!);
    tap(b!, 2);
    expect(got).toEqual([{ type: 'choice', index: 0 }]);
  });

  it('has no sentence box when the item has none', () => {
    const v = createChoiceView({ item: { ...item, sentence: undefined }, onAnswer: () => {} });
    expect(v.element.querySelector('.q-sentence')).toBeNull();
  });

  it('destroy stops answers', () => {
    const got: Response[] = [];
    const v = createChoiceView({ item, onAnswer: (r) => got.push(r) });
    const b = v.element.querySelector('button')!;
    v.destroy();
    tap(b);
    expect(got).toEqual([]);
  });
});
