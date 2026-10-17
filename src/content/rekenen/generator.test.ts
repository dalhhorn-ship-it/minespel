import { describe, expect, it } from 'vitest';
import { numberMatches } from '../../core/numbers';
import { createRng } from '../../core/rng';
import { checkAnswer } from '../../learning/answer-check';
import { generateExamItems, generateItem, generateItems, factIds, itemFromId, levelOfId, workedExampleOf } from './generator';
import { REKENEN_LEVELS, REKENEN_SKILLS, REKENEN_TOPICS } from './module';
import type { RekenenTopicId } from './module';
import { workedExample } from './worked-example';

const MAX_WHOLE: Record<string, number> = { M6: 100, E6: 1000, M7: 10000 };

/** The numbers in an id, for range checks. */
function numbersOf(id: string): number[] {
  return (id.split(':').slice(1).join(':').match(/\d+/g) ?? []).map(Number);
}

describe('AC61: 1000 questions per skill and level', () => {
  for (const topic of REKENEN_TOPICS) {
    for (const level of REKENEN_LEVELS) {
      for (const skill of REKENEN_SKILLS[topic][level] ?? []) {
        it(`${topic} ${level} ${skill}`, () => {
          const rng = createRng(61);
          for (let i = 0; i < 1000; i++) {
            const item = generateItem(topic, level, rng, [skill]);
            expect(item.type).toBe('type');
            expect(item.level).toBe(level);
            expect(item.skill).toBe(skill);
            expect(item.id.startsWith(`${topic}:`)).toBe(true);
            expect(item.explain.length).toBeGreaterThan(10);
            // The answer is a plain, non negative number and the checker accepts it.
            const answer = item.answer[0] as string;
            expect(answer).toMatch(/^\d+(,\d)?$/);
            expect(checkAnswer(item, { type: 'type', text: answer }, true)).toBe(true);
            expect(checkAnswer(item, { type: 'type', text: answer + '1' }, true)).toBe(false);
            // Rebuilt from the id alone.
            expect(itemFromId(item.id, level)).toEqual(item);
            // Worked example ends with the answer.
            const we = workedExampleOf(item.id, level);
            expect(we).not.toBeNull();
            const last = (we?.steps.at(-1)?.sum ?? '').replaceAll('\u202F', '');
            expect(last.endsWith(`= ${answer}`)).toBe(true);
            expect(numberMatches(we?.answer ?? '', answer)).toBe(true);
            expect(we?.steps.length).toBeGreaterThan(0);
            // Ranges.
            const nums = numbersOf(item.id);
            if (topic === 'optellen' || topic === 'aftrekken') {
              const [a, b] = nums as [number, number];
              const top = topic === 'optellen' ? a + b : a;
              if (level === 'E7') {
                expect(item.id).toContain(':d');
                expect(top).toBeLessThanOrEqual(1000); // tenths, so up to 100
              } else {
                expect(top).toBeLessThanOrEqual(MAX_WHOLE[level] as number);
              }
              if (topic === 'aftrekken') expect(b).toBeLessThan(a);
              expect(b).toBeGreaterThan(0);
            }
            if (topic === 'delen') {
              const [n, d] = nums as [number, number];
              expect(n % d).toBe(0);
              expect(Number(answer)).toBe(n / d);
            }
            if (topic === 'tafels') {
              const [a, b] = nums as [number, number];
              expect(Number(answer)).toBe(a * b);
            }
          }
        });
      }
    }
  }
});

describe('M6 crossing the ten', () => {
  it('plus and minus at M6 cross a ten', () => {
    const rng = createRng(6);
    for (let i = 0; i < 300; i++) {
      const p = numbersOf(generateItem('optellen', 'M6', rng).id);
      expect(((p[0] as number) % 10) + ((p[1] as number) % 10)).toBeGreaterThanOrEqual(10);
      const m = numbersOf(generateItem('aftrekken', 'M6', rng).id);
      expect((m[0] as number) % 10).toBeLessThan((m[1] as number) % 10);
    }
  });
});

describe('ids describe the sum', () => {
  it('rebuilds the examples from the architecture', () => {
    expect(itemFromId('tafels:7x8')).toMatchObject({ skill: 'tafel-7', level: 'E6', prompt: '7 × 8 = ?', answer: ['56'] });
    expect(itemFromId('delen:56:7')).toMatchObject({ skill: 'deel-7', level: 'E6', answer: ['8'] });
    expect(itemFromId('tafels:30x7')).toMatchObject({ skill: 'tientallen-keer', level: 'M7', answer: ['210'] });
    expect(itemFromId('tafels:34x6')).toMatchObject({ skill: 'twee-cijfers-keer', level: 'E7', answer: ['204'] });
    expect(itemFromId('delen:210:7')).toMatchObject({ skill: 'tientallen-delen', level: 'M7', answer: ['30'] });
    expect(itemFromId('delen:252:6')).toMatchObject({ skill: 'drie-cijfers-delen', level: 'E7', answer: ['42'] });
    expect(itemFromId('optellen:47+38')).toMatchObject({ skill: 'plus', level: 'M6', answer: ['85'] });
    expect(itemFromId('optellen:47+38', 'E6')).toMatchObject({ level: 'E6' });
    expect(itemFromId('aftrekken:83-47')).toMatchObject({ skill: 'min', answer: ['36'] });
  });

  it('AC58: 0,1 + 0,2 is exactly 0,3', () => {
    const item = itemFromId('optellen:d1+2');
    expect(item).toMatchObject({ level: 'E7', prompt: '0,1 + 0,2 = ?', answer: ['0,3'] });
    expect(checkAnswer(item as never, { type: 'type', text: '0,3' }, true)).toBe(true);
    expect(itemFromId('optellen:d34+57')?.answer).toEqual(['9,1']);
    expect(itemFromId('aftrekken:d91-57')?.answer).toEqual(['3,4']);
  });

  it('shows thousands with a thin space but answers plain', () => {
    const item = itemFromId('optellen:4700+3800', 'M7');
    expect(item?.prompt).toBe('4 700 + 3 800 = ?');
    expect(item?.answer).toEqual(['8500']);
    expect(checkAnswer(item as never, { type: 'type', text: '8500' }, true)).toBe(true);
  });

  it('refuses ids that are not a valid sum', () => {
    for (const id of [
      'tafels:0x5', 'tafels:7x11', 'tafels:7x', 'tafels:07x8', 'tafels:40x10', 'delen:57:7', 'delen:5:0',
      'delen:10:7', 'aftrekken:5-9', 'optellen:5+', 'nonsense', 'taal:abc', 'optellen:d900+900',
    ]) {
      expect(itemFromId(id), id).toBeNull();
    }
    expect(itemFromId('tafels:7x8', 'M6')).toBeNull();
    expect(itemFromId('optellen:47+38', 'X1')).toBeNull();
    expect(levelOfId('tafels:3x4')).toBe('M6');
    expect(levelOfId('optellen:d1+2')).toBe('E7');
    expect(levelOfId('nope')).toBeNull();
  });
});

describe('fixed sets', () => {
  it('counts the facts per level', () => {
    expect(factIds('tafels', 'M6')).toHaveLength(60);
    expect(factIds('tafels', 'E6')).toHaveLength(40);
    expect(factIds('delen', 'M6')).toHaveLength(60);
    expect(factIds('delen', 'E6')).toHaveLength(40);
    expect(factIds('tafels', 'M7')).toHaveLength(64);
    expect(factIds('delen', 'M7')).toHaveLength(64);
    expect(factIds('tafels', 'E7')).toHaveLength(81 * 8);
    expect(factIds('optellen', 'M6')).toHaveLength(0);
  });

  it('every fact id rebuilds at its own level with the right skill', () => {
    for (const topic of ['tafels', 'delen'] as RekenenTopicId[]) {
      for (const level of REKENEN_LEVELS) {
        for (const id of factIds(topic, level)) {
          const item = itemFromId(id, level);
          expect(item, id).not.toBeNull();
          expect(REKENEN_SKILLS[topic][level]).toContain(item?.skill);
          expect(levelOfId(id)).toBe(level);
        }
      }
    }
  });
});

describe('AC125: no repeats and seedable', () => {
  it('same seed gives the same questions, another seed differs', () => {
    const a = generateExamItems('E6', 20, createRng(125)).map((i) => i.id);
    const b = generateExamItems('E6', 20, createRng(125)).map((i) => i.id);
    const c = generateExamItems('E6', 20, createRng(126)).map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('an exam of 20 has no duplicate and an equal mix, at every level', () => {
    for (const level of REKENEN_LEVELS) {
      for (let seed = 1; seed <= 25; seed++) {
        const items = generateExamItems(level, 20, createRng(seed));
        expect(items).toHaveLength(20);
        expect(new Set(items.map((i) => i.id)).size).toBe(20);
        for (const topic of REKENEN_TOPICS) {
          expect(items.filter((i) => i.id.startsWith(`${topic}:`))).toHaveLength(5);
        }
        expect(items.every((i) => i.level === level)).toBe(true);
      }
    }
  });

  it('a break has no repeats, respects skills and exclude', () => {
    const rng = createRng(3);
    const items = generateItems('tafels', 'E6', 10, rng, { skills: ['tafel-7'] });
    expect(items).toHaveLength(10);
    expect(new Set(items.map((i) => i.id)).size).toBe(10);
    expect(items.every((i) => i.skill === 'tafel-7')).toBe(true);
    // Only 10 facts exist for one table: asking for more gives all of them, once.
    expect(generateItems('tafels', 'E6', 30, createRng(3), { skills: ['tafel-7'] })).toHaveLength(10);
    const excluded = new Set(items.slice(0, 4).map((i) => i.id));
    const rest = generateItems('tafels', 'E6', 10, createRng(3), { skills: ['tafel-7'], exclude: excluded });
    expect(rest).toHaveLength(6);
    expect(rest.some((i) => excluded.has(i.id))).toBe(false);
    const open = generateItems('optellen', 'M6', 50, createRng(4));
    expect(new Set(open.map((i) => i.id)).size).toBe(50);
  });

  it('rejects an unknown level', () => {
    expect(() => generateItem('tafels', 'Z9', createRng(1))).toThrow();
  });
});

describe('worked examples', () => {
  it('tafels use a trick and end with the answer', () => {
    const we = workedExample({ kind: 'keer', a: 7, b: 8 });
    expect(we.steps.map((s) => s.sum)).toEqual(['8 = 4 + 4', '7 × 4 = 28', '28 + 28 = 56']);
    expect(we.answer).toBe('56');
  });

  it('plus crosses the ten', () => {
    const we = workedExample({ kind: 'plus', a: 47, b: 38, decimal: false });
    expect(we.steps.map((s) => s.sum)).toEqual(['38 = 30 + 8', '47 + 30 = 77', '77 + 8 = 85']);
    expect(we.steps[2]?.text).toContain('Via de tien');
  });

  it('delen goes backwards from keer', () => {
    const we = workedExample({ kind: 'deel', n: 56, d: 7 });
    expect(we.steps.map((s) => s.sum)).toEqual(['7 × ? = 56', '7 × 8 = 56', '56 : 7 = 8']);
    const big = workedExample({ kind: 'deel', n: 252, d: 6 });
    expect(big.steps.map((s) => s.sum)).toEqual(['6 × 40 = 240', '252 - 240 = 12', '12 : 6 = 2', '40 + 2 = 42']);
  });

  it('decimals work in tenths', () => {
    const we = workedExample({ kind: 'plus', a: 34, b: 57, decimal: true });
    expect(we.steps.at(-1)?.sum).toBe('91 tienden = 9,1');
    expect(we.answer).toBe('9,1');
  });
});
