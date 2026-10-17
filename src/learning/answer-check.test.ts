import { describe, expect, it } from 'vitest';
import type { ChoiceItem, FindErrorItem, PunctuateItem, TypeItem } from '../content/format';
import { checkAnswer, checkChoice, checkFindError, checkPunctuate, checkType, normalizeTyped } from './answer-check';

const base = { level: 'M6', skill: 's', prompt: 'p', explain: 'e' };

const choice: ChoiceItem = { ...base, id: 'c', type: 'choice', options: ['a', 'b', 'c'], answer: 1 };
const find: FindErrorItem = { ...base, id: 'f', type: 'find-error', words: ['ik', 'fietsde'], answer: 1, correction: 'fietste' };
const noError: FindErrorItem = { ...base, id: 'f2', type: 'find-error', words: ['ik', 'fietste'], answer: -1, correction: null };
const typed: TypeItem = { ...base, id: 't', type: 'type', answer: ['fietste'] };
const punct: PunctuateItem = { ...base, id: 'p', type: 'punctuate', mark: ',', words: ['a', 'b', 'c', 'd'], answer: [0, 2] };
const noPunct: PunctuateItem = { ...punct, id: 'p2', answer: [] };

describe('choice (AC53)', () => {
  it('is right only at the answer index', () => {
    expect(checkChoice(choice, 1)).toBe(true);
    expect(checkChoice(choice, 0)).toBe(false);
    expect(checkChoice(choice, 2)).toBe(false);
    expect(checkChoice(choice, -1)).toBe(false);
    expect(checkChoice(choice, NaN)).toBe(false);
  });
});

describe('find-error (AC54)', () => {
  it('right word is right, others wrong, Geen fout wrong', () => {
    expect(checkFindError(find, 1)).toBe(true);
    expect(checkFindError(find, 0)).toBe(false);
    expect(checkFindError(find, -1)).toBe(false);
  });
  it('Geen fout (-1) is right when there is no mistake', () => {
    expect(checkFindError(noError, -1)).toBe(true);
    expect(checkFindError(noError, 1)).toBe(false);
  });
});

describe('punctuate (AC55)', () => {
  it('needs the same set of gaps, any order', () => {
    expect(checkPunctuate(punct, [0, 2])).toBe(true);
    expect(checkPunctuate(punct, [2, 0])).toBe(true);
    expect(checkPunctuate(punct, [2, 0, 2])).toBe(true);
    expect(checkPunctuate(punct, [0])).toBe(false);
    expect(checkPunctuate(punct, [0, 2, 3])).toBe(false);
    expect(checkPunctuate(punct, [0, 1])).toBe(false);
    expect(checkPunctuate(punct, [])).toBe(false);
  });
  it('empty answer is right only with no marked gap', () => {
    expect(checkPunctuate(noPunct, [])).toBe(true);
    expect(checkPunctuate(noPunct, [1])).toBe(false);
  });
});

describe('type (AC56)', () => {
  it('forgives spaces only', () => {
    expect(checkType(typed, 'fietste')).toBe(true);
    expect(checkType(typed, ' fietste ')).toBe(true);
    expect(checkType(typed, ' fietste ')).toBe(true);
    expect(checkType(typed, 'Fietste')).toBe(false);
    expect(checkType(typed, 'fietsde')).toBe(false);
    expect(checkType(typed, 'fiets te')).toBe(false);
    expect(checkType(typed, '')).toBe(false);
    expect(checkType(typed, '   ')).toBe(false);
  });
  it('accepts any listed answer and collapses inner spaces', () => {
    const t: TypeItem = { ...typed, answer: ['de  hond', 'een hond'] };
    expect(checkType(t, 'de hond')).toBe(true);
    expect(checkType(t, 'een  hond')).toBe(true);
    expect(checkType(t, 'De hond')).toBe(false);
  });
  it('is strict on punctuation and accents', () => {
    const t: TypeItem = { ...typed, answer: ['reëel', "auto's", 'ja,'] };
    expect(checkType(t, 'reëel')).toBe(true);
    expect(checkType(t, 'reeel')).toBe(false);
    expect(checkType(t, "autos")).toBe(false);
    expect(checkType(t, 'ja')).toBe(false);
    expect(checkType(t, 'reëel')).toBe(true);
  });
  it('compares numerically for Rekenen (AC58)', () => {
    const t: TypeItem = { ...typed, answer: ['3,5'] };
    for (const s of ['3,5', '3,50', '03,5', ' 3,5 ']) expect(checkType(t, s, true)).toBe(true);
    for (const s of ['35', '3,', ',5', '']) expect(checkType(t, s, true)).toBe(false);
  });
  it('normalizeTyped', () => {
    expect(normalizeTyped('  a \n b ')).toBe('a b');
  });
});

describe('checkAnswer', () => {
  it('dispatches by type', () => {
    expect(checkAnswer(choice, { type: 'choice', index: 1 })).toBe(true);
    expect(checkAnswer(find, { type: 'find-error', index: 1 })).toBe(true);
    expect(checkAnswer(typed, { type: 'type', text: 'fietste' })).toBe(true);
    expect(checkAnswer(punct, { type: 'punctuate', gaps: [0, 2] })).toBe(true);
    expect(checkAnswer({ ...typed, answer: ['3,5'] }, { type: 'type', text: '03,50' }, true)).toBe(true);
  });
  it('a response of the wrong type is wrong', () => {
    expect(checkAnswer(choice, { type: 'find-error', index: 1 })).toBe(false);
    expect(checkAnswer(typed, { type: 'choice', index: 0 })).toBe(false);
  });
});
