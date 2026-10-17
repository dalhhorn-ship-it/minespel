import { describe, expect, it, vi } from 'vitest';
import type { SessionSummary } from '../../learning/break-session';
import { createSummary, MSG_EGG, MSG_HARD, pointsText } from './summary';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
const base: SessionSummary = { total: 5, right: 4, firstTryRight: 3, bonus: 0, earned: 7, pointsTotal: 17, hard: false };

describe('summary', () => {
  it('shows K van de N, earned points, total and the egg hint', () => {
    const v = createSummary({ summary: base, canBuyEgg: true, onDone: () => {} });
    const t = v.element.textContent ?? '';
    expect(t).toContain('4 van de 5 goed!');
    expect(t).toContain('7 punten');
    expect(t).toContain('Je hebt nu 17 punten');
    expect(t).toContain(MSG_EGG);
  });
  it('no egg hint when the kid cannot buy one', () => {
    expect(createSummary({ summary: base, onDone: () => {} }).element.textContent).not.toContain(MSG_EGG);
  });
  it('shows the bonus line', () => {
    expect(createSummary({ summary: { ...base, bonus: 3 }, onDone: () => {} }).element.textContent).toContain('Bonus voor alles goed: +3');
  });
  it('0 right: kind message, total, no plus points', () => {
    const v = createSummary({ summary: { ...base, right: 0, earned: -2, hard: true }, onDone: () => {} });
    const t = v.element.textContent ?? '';
    expect(t).toContain(MSG_HARD);
    expect(t).toContain('Je hebt nu 17 punten');
    expect(t).not.toContain('Verdiend');
  });
  it('Terug naar de wereld acts once on a double tap', () => {
    const onDone = vi.fn();
    const v = createSummary({ summary: base, onDone });
    const b = v.element.querySelector('button')!;
    expect(b.textContent).toBe('Terug naar de wereld');
    for (const id of [1, 2]) {
      b.dispatchEvent(ptr('pointerdown', id));
      b.dispatchEvent(ptr('pointerup', id));
    }
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('writes singular and plural', () => {
    expect(pointsText(1)).toBe('1 punt');
    expect(pointsText(0)).toBe('0 punten');
  });
});
