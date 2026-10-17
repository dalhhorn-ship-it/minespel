import { describe, expect, it } from 'vitest';
import { defaultKv } from './schema';

// Pins the settings defaults to PRD 4.17 (settings table), AC22 and AC28.
describe('settings defaults match the PRD', () => {
  const s = defaultKv('settings');

  it('time between learning breaks is 5 minutes (4.17, AC22)', () => {
    expect(s.breakEveryMinutes).toBe(5);
  });
  it('questions per break is 5 (4.17, AC28)', () => {
    expect(s.questionsPerBreak).toBe(5);
  });
  it('volume is 70 of 100 (4.17)', () => {
    expect(s.volume).toBe(70 / 100);
  });
  it('larger font is off (4.17)', () => {
    expect(s.largeFont).toBe(false);
  });
  it('new lessons and questions are on (4.17)', () => {
    expect(s.newLessonsEnabled).toBe(true);
  });
  it('break warning is on (4.17)', () => {
    expect(s.breakWarningEnabled).toBe(true);
  });
  it('sound effects are on (4.17)', () => {
    expect(s.soundEffectsEnabled).toBe(true);
  });
});
