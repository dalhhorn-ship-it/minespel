import { describe, expect, it } from 'vitest';
import { MAX_WORDS } from '../format';
import { validateBundle } from '../validate';
import { REKENEN_SKILLS, rekenenBundle, skillsOfTopic } from './module';

describe('built in Rekenen module', () => {
  it('passes the validator with the built in rules', () => {
    expect(validateBundle(rekenenBundle, { builtIn: true })).toEqual({ ok: true, problems: [] });
  });

  it('uses the generator and has the four topics in order', () => {
    expect(rekenenBundle.module.generator).toBe('rekenen-basis');
    expect(rekenenBundle.module.topics).toEqual(['optellen', 'aftrekken', 'tafels', 'delen']);
    expect(rekenenBundle.topics.map((t) => t.id)).toEqual(rekenenBundle.module.topics);
    expect(rekenenBundle.module.levels).toEqual(['M6', 'E6', 'M7', 'E7']);
    expect(rekenenBundle.topics.every((t) => t.items.length === 0)).toBe(true);
  });

  it('has four Rekentoets exams of 20 questions, 20 minutes, 70 percent', () => {
    const exams = rekenenBundle.module.exams;
    expect(exams.map((e) => e.title)).toEqual(['Rekentoets M6', 'Rekentoets E6', 'Rekentoets M7', 'Rekentoets E7']);
    expect(new Set(exams.map((e) => e.id)).size).toBe(4);
    exams.forEach((e, i) => {
      expect(e.levels).toEqual([rekenenBundle.module.levels[i]]);
      expect(e.questionCount).toBe(20);
      expect(e.timeLimitMinutes).toBe(20);
      expect(e.passPercent).toBe(70);
      expect(e.mix).toEqual({ optellen: 1, aftrekken: 1, tafels: 1, delen: 1 });
    });
  });

  it('has skills as in the architecture table', () => {
    expect(REKENEN_SKILLS.tafels.M6).toEqual(['tafel-1', 'tafel-2', 'tafel-3', 'tafel-4', 'tafel-5', 'tafel-10']);
    expect(REKENEN_SKILLS.tafels.E6).toEqual(['tafel-6', 'tafel-7', 'tafel-8', 'tafel-9']);
    expect(REKENEN_SKILLS.delen.M6).toContain('deel-10');
    expect(REKENEN_SKILLS.delen.E6).toEqual(['deel-6', 'deel-7', 'deel-8', 'deel-9']);
    expect(skillsOfTopic('optellen')).toEqual(['plus']);
    expect(skillsOfTopic('aftrekken')).toEqual(['min']);
    expect(skillsOfTopic('tafels').slice(-2)).toEqual(['tientallen-keer', 'twee-cijfers-keer']);
    expect(skillsOfTopic('delen').slice(-2)).toEqual(['tientallen-delen', 'drie-cijfers-delen']);
  });

  it('has 2 to 4 lesson pages per topic, and page skills exist in the topic', () => {
    for (const t of rekenenBundle.topics) {
      expect(t.lesson.pages.length).toBeGreaterThanOrEqual(2);
      expect(t.lesson.pages.length).toBeLessThanOrEqual(4);
      const skills = skillsOfTopic(t.id as 'optellen');
      for (const p of t.lesson.pages) {
        if (p.skill !== undefined) expect(skills).toContain(p.skill);
      }
    }
  });

  it('keeps lesson sentences short for young readers', () => {
    const limit = MAX_WORDS.M6 ?? 15;
    for (const t of rekenenBundle.topics) {
      for (const p of t.lesson.pages) {
        const sentences = [p.text, p.tip ?? ''].flatMap((s) => s.split(/(?<=[.?!:])\s+/));
        for (const s of sentences) expect(s.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(limit + 5);
      }
    }
  });
});
