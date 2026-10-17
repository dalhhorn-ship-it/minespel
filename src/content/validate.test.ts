import { describe, expect, it } from 'vitest';
import { APP_NAME, FORMAT_VERSION } from './format';
import type { ModuleBundle } from './format';
import { validateBundle } from './validate';

const files = import.meta.glob('../../tests/fixtures/modules/good/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>;

/** A fresh copy of the good fixture bundle (2 topics, 6 items each, level M6). */
function good(): ModuleBundle {
  const get = (name: string) => files[`../../tests/fixtures/modules/good/${name}.json`]!;
  const module = get('module') as unknown as ModuleBundle['module'];
  const bundle: ModuleBundle = {
    app: APP_NAME,
    kind: 'module',
    formatVersion: FORMAT_VERSION,
    createdAt: '2026-10-17T00:00:00.000Z',
    module,
    topics: module.topics.map((id) => get(id) as unknown as ModuleBundle['topics'][number]),
  };
  return structuredClone(bundle);
}

const check = (b: unknown) => validateBundle(b, { builtIn: true });

describe('validateBundle accepts', () => {
  it('the good fixture', () => {
    expect(check(good())).toEqual({ ok: true, problems: [] });
  });

  it('a short custom module without the 6 items rule', () => {
    const b = good();
    b.topics[0]!.items.pop();
    expect(check(b).ok).toBe(false);
    expect(validateBundle(b).ok).toBe(true);
  });

  it('a 20 word sentence at M7 that is too long at M6', () => {
    const b = good();
    const item = b.topics[0]!.items[0]!;
    if (item.type !== 'choice') throw new Error('fixture changed');
    item.sentence = Array(17).fill('woord').join(' ');
    expect(check(b).ok).toBe(false);
    b.module.levels = ['M6', 'M7'];
    item.level = 'M7';
    expect(validateBundle(b).ok).toBe(true);
  });

  it('a generator module with no items', () => {
    const b = good();
    b.module.generator = 'rekenen-basis';
    for (const t of b.topics) t.items = [];
    expect(check(b).ok).toBe(true);
  });
});

describe('validateBundle rejects bad content with Dutch messages', () => {
  it('two equal options in a choice item', () => {
    const b = good();
    const item = b.topics[0]!.items[0]!;
    if (item.type !== 'choice') throw new Error('fixture changed');
    item.options = ['snel', 'snel', 'snelt'];
    const r = check(b);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toContain('twee antwoorden zijn gelijk');
    expect(r.problems.join('\n')).toContain(item.id);
  });

  it('the same prompt and sentence in two topics', () => {
    const b = good();
    const a = b.topics[0]!.items[0]!;
    const c = b.topics[1]!.items[0]!;
    if (a.type !== 'choice' || c.type !== 'choice') throw new Error('fixture changed');
    c.prompt = a.prompt;
    c.sentence = a.sentence;
    const r = check(b);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toContain('dezelfde vraagtekst en zin');
  });

  it('the same prompt with the same words in two topics (find-error)', () => {
    const b = good();
    const a = b.topics[0]!.items[1]!;
    const c = b.topics[1]!.items[1]!;
    if (a.type !== 'find-error' || c.type !== 'find-error') throw new Error('fixture changed');
    c.words = [...a.words];
    c.prompt = a.prompt;
    expect(check(b).ok).toBe(false);
  });

  it('a type item without an answer', () => {
    const b = good();
    const item = b.topics[0]!.items[2]!;
    if (item.type !== 'type') throw new Error('fixture changed');
    item.answer = [];
    const r = check(b);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toContain('typevraag');
    item.answer = [' '];
    expect(check(b).ok).toBe(false);
  });

  it('a sentence over 15 words at M6 (and E6), over 20 at M7 (and E7)', () => {
    for (const [level, limit] of [['M6', 15], ['E6', 15], ['M7', 20], ['E7', 20]] as const) {
      const b = good();
      b.module.levels = [level];
      b.module.exams[0]!.levels = [level];
      for (const t of b.topics) for (const it of t.items) it.level = level;
      const item = b.topics[0]!.items[0]!;
      if (item.type !== 'choice') throw new Error('fixture changed');
      item.sentence = Array(limit).fill('woord').join(' ');
      expect(check(b).ok, `${level} with ${limit} words`).toBe(true);
      item.sentence = Array(limit + 1).fill('woord').join(' ');
      const r = check(b);
      expect(r.ok, `${level} with ${limit + 1} words`).toBe(false);
      expect(r.problems.join('\n')).toContain('woorden');
    }
  });

  it('long options when the options are the sentences', () => {
    const b = good();
    const item = b.topics[0]!.items[0]!;
    if (item.type !== 'choice') throw new Error('fixture changed');
    delete item.sentence;
    item.options = ['kort', Array(16).fill('woord').join(' ')];
    expect(check(b).ok).toBe(false);
  });

  it('an empty lesson page skill', () => {
    const b = good();
    b.topics[0]!.lesson.pages[0]!.skill = '  ';
    const r = check(b);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toContain('skill mag niet leeg zijn');
  });

  it('a lesson page without a skill is fine', () => {
    const b = good();
    delete b.topics[0]!.lesson.pages[0]!.skill;
    expect(check(b).ok).toBe(true);
  });

  it('duplicate ids, a missing topic, too few items and a too big exam', () => {
    const dupId = good();
    dupId.topics[1]!.items[0]!.id = dupId.topics[0]!.items[0]!.id;
    expect(check(dupId).problems.join('\n')).toContain('keer gebruikt');

    const missing = good();
    missing.topics.pop();
    expect(check(missing).problems.join('\n')).toContain('het onderwerp ontbreekt');

    const few = good();
    few.topics[0]!.items.pop();
    expect(check(few).problems.join('\n')).toContain('minstens 6');

    const exam = good();
    exam.module.exams[0]!.questionCount = 40;
    expect(check(exam).problems.join('\n')).toContain('Examen ex');
  });

  it('things that are not a module, without throwing', () => {
    for (const junk of [null, 5, 'x', [], {}, { module: 3 }, { module: {}, topics: 'x' }]) {
      expect(check(junk).ok).toBe(false);
    }
    const b = good();
    (b.topics[0]!.items as unknown[])[0] = 'kapot';
    expect(check(b).ok).toBe(false);
  });
});
