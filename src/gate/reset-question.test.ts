import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { isRightAnswer, makeResetQuestion } from './reset-question';

describe('reset question', () => {
  it('always has a positive whole answer and Dutch words', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const q = makeResetQuestion(rng);
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThan(0);
      expect(q.text).toContain('Schrijf het antwoord in cijfers.');
      expect(q.text).not.toMatch(/\d{2}/);
    }
  });

  it('is fresh each time', () => {
    const rng = createRng(9);
    const texts = new Set<string>();
    for (let i = 0; i < 30; i++) texts.add(makeResetQuestion(rng).text);
    expect(texts.size).toBeGreaterThan(20);
  });

  it('checks answers in digits only', () => {
    const q = { text: 'x', answer: 37 };
    expect(isRightAnswer(q, '37')).toBe(true);
    expect(isRightAnswer(q, ' 37 ')).toBe(true);
    expect(isRightAnswer(q, '36')).toBe(false);
    expect(isRightAnswer(q, 'zevenendertig')).toBe(false);
    expect(isRightAnswer(q, '')).toBe(false);
    expect(isRightAnswer(q, '37.0')).toBe(false);
  });
});
