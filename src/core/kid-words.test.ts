import { describe, expect, it } from 'vitest';
import { BANNED_WORDS, findBannedWords, hasBannedWord } from './kid-words';

describe('kid words (AC228)', () => {
  it('AC228: whole words only, any case: "Au!" fails, "auto" passes', () => {
    expect(hasBannedWord('Au!')).toBe(true);
    expect(hasBannedWord('AU')).toBe(true);
    expect(hasBannedWord('auto')).toBe(false);
    expect(hasBannedWord('Dat was een engel')).toBe(false);
    expect(hasBannedWord('Ik ben ENG.')).toBe(true);
    expect(hasBannedWord('bangerik')).toBe(false);
    expect(hasBannedWord('Ridder tot je dienst!')).toBe(false);
  });
  it('AC228: every banned word is caught alone, in a sentence and in capitals', () => {
    for (const w of BANNED_WORDS) {
      expect(findBannedWords(w), w).toEqual([w]);
      expect(hasBannedWord(`Kijk, ${w.toUpperCase()}, nee!`), w).toBe(true);
    }
  });
  it('AC228: the list is the PRD list', () => {
    expect(BANNED_WORDS).toHaveLength(16);
  });
});
