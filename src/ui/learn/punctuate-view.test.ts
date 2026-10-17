import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PunctuateItem } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { createPunctuateView } from './punctuate-view';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
function tap(target: Element, id = 1) {
  target.dispatchEvent(ptr('pointerdown', id));
  target.dispatchEvent(ptr('pointerup', id));
}

const item: PunctuateItem = {
  id: 'p1', type: 'punctuate', level: 'M6', skill: 's', prompt: 'Zet de komma', explain: 'x', mark: ',',
  words: ['Ik', 'ren', 'en', 'jij', 'fietst'], answer: [2],
};

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => vi.restoreAllMocks());

function setup(it: PunctuateItem = item) {
  const got: Response[] = [];
  const v = createPunctuateView({ item: it, onAnswer: (r) => got.push(r) });
  const gaps = () => [...v.element.querySelectorAll('.q-gap')];
  const done = v.element.querySelector('.q-done')!;
  return { v, got, gaps, done };
}

describe('punctuate view', () => {
  it('has a gap between words (not after the last) and a Klaar button (AC55)', () => {
    const { v, gaps, done } = setup();
    expect(v.element.querySelectorAll('.q-text-word')).toHaveLength(5);
    expect(gaps()).toHaveLength(4);
    expect(done.textContent).toBe('Klaar');
  });

  it('toggles a gap on and off and shows the mark', () => {
    const { gaps } = setup();
    const g = gaps()[1]!;
    tap(g);
    expect(g.textContent).toBe(',');
    expect(g.getAttribute('aria-pressed')).toBe('true');
    now += 1000; // a second real tap, after the repeat window
    tap(g);
    expect(g.textContent).toBe('');
    expect(g.getAttribute('aria-pressed')).toBe('false');
  });

  it('reports sorted marked gaps on Klaar', () => {
    const { gaps, done, got } = setup();
    tap(gaps()[2]!);
    tap(gaps()[0]!);
    tap(done);
    expect(got).toEqual([{ type: 'punctuate', gaps: [0, 2] }]);
  });

  it('reports an empty list when nothing is marked', () => {
    const { done, got } = setup({ ...item, answer: [] });
    tap(done);
    expect(got).toEqual([{ type: 'punctuate', gaps: [] }]);
  });

  it('answers once on a double tap of Klaar and ignores gaps afterwards (AC117)', () => {
    const { gaps, done, got } = setup();
    tap(gaps()[2]!);
    tap(done);
    tap(done);
    tap(gaps()[0]!);
    tap(done, 2);
    expect(got).toEqual([{ type: 'punctuate', gaps: [2] }]);
    expect(gaps()[0]!.getAttribute('aria-pressed')).toBe('false');
  });
});
