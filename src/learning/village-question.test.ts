import { describe, expect, it } from 'vitest';
import { createCatalog, REKENEN_MODULE_ID, TAAL_MODULE_ID } from '../content/catalog';
import type { ChoiceItem } from '../content/format';
import { setModuleOn, setModuleWeight } from '../content/switches';
import { createRng } from '../core/rng';
import type { ProgressRecord } from '../storage/progress-store';
import { defaultKv } from '../storage/schema';
import { emptyRotation, pickModule } from './rotation';
import {
  pickVillageQuestion,
  reduceVillage,
  startVillageCard,
  type VillageCardState,
  type VillageEffect,
  type VillageQuestion,
} from './village-question';

const catalog = createCatalog();
const taal = catalog.fixedItems(TAAL_MODULE_ID, 'ww-tegenwoordig', { levels: ['M6'] });
const tafels = catalog.fixedItems(REKENEN_MODULE_ID, 'tafels');

function seen(moduleId: string, i: number, box: number, topic: string): ProgressRecord {
  const list = moduleId === TAAL_MODULE_ID ? taal : tafels;
  const item = list[i]!;
  return { moduleId, itemId: item.id, topic, skill: item.skill, level: item.level, box, due: '2026-10-01', seen: 1 };
}
const base = (progress: ProgressRecord[], switches = defaultKv('switches')) => ({
  catalog,
  switches,
  rotation: emptyRotation(),
  progress,
  today: '2026-10-20',
  rng: createRng(5),
});

describe('pickVillageQuestion (V11d)', () => {
  it('AC183: picks one seen item, box 1 to 5, never a box 0 item', () => {
    const progress = [seen(TAAL_MODULE_ID, 0, 3, 'ww-tegenwoordig'), seen(TAAL_MODULE_ID, 1, 0, 'ww-tegenwoordig')];
    for (let i = 0; i < 20; i++) {
      const q = pickVillageQuestion({ ...base(progress), rng: createRng(i) });
      expect(q?.entry.item.id).toBe(taal[0]!.id);
      expect(q?.entry.box).toBe(3);
      expect(q?.moduleId).toBe(TAAL_MODULE_ID);
      expect(q?.topic).toBe('ww-tegenwoordig');
    }
  });

  it('AC182: with every item in box 0, or none seen, there is no question', () => {
    expect(pickVillageQuestion(base([]))).toBeNull();
    expect(pickVillageQuestion(base([seen(TAAL_MODULE_ID, 0, 0, 'ww-tegenwoordig')]))).toBeNull();
  });

  it('AC183: only switched on content, and a switched off module is never used', () => {
    const progress = [seen(TAAL_MODULE_ID, 0, 2, 'ww-tegenwoordig'), seen(REKENEN_MODULE_ID, 0, 2, 'tafels')];
    const off = setModuleOn(defaultKv('switches'), TAAL_MODULE_ID, false);
    for (let i = 0; i < 10; i++) {
      expect(pickVillageQuestion({ ...base(progress, off), rng: createRng(i) })?.moduleId).toBe(REKENEN_MODULE_ID);
    }
    const allOff = setModuleOn(off, REKENEN_MODULE_ID, false);
    expect(pickVillageQuestion(base(progress, allOff))).toBeNull();
  });

  it('AC183: the module follows the Vakverdeling weights', () => {
    const progress = [seen(TAAL_MODULE_ID, 0, 2, 'ww-tegenwoordig'), seen(REKENEN_MODULE_ID, 0, 2, 'tafels')];
    const sw = setModuleWeight(setModuleWeight(defaultKv('switches'), TAAL_MODULE_ID, 5), REKENEN_MODULE_ID, 1);
    const rng = createRng(11);
    let taalCount = 0;
    for (let i = 0; i < 300; i++) {
      if (pickVillageQuestion({ ...base(progress, sw), rng })?.moduleId === TAAL_MODULE_ID) taalCount++;
    }
    expect(taalCount / 300).toBeGreaterThan(0.7);
    expect(taalCount).toBeLessThan(300);
  });

  it('AC183: the rotation record is not changed (breaks keep their order)', () => {
    const rotation = { weights: { taal: 2 }, topicPointers: { taal: 1 }, lessonsSeen: ['taal/a'] };
    const before = JSON.stringify(rotation);
    pickVillageQuestion({ ...base([seen(TAAL_MODULE_ID, 0, 2, 'ww-tegenwoordig')]), rotation });
    expect(JSON.stringify(rotation)).toBe(before);
  });
});

describe('breaks with and without villager questions (V11d, AC183)', () => {
  it('AC183: a series of breaks gets the same modules in the same order with villager questions in between', () => {
    const cands = [
      { id: TAAL_MODULE_ID, weight: 2, usable: true },
      { id: REKENEN_MODULE_ID, weight: 1, usable: true },
    ];
    const progress = [seen(TAAL_MODULE_ID, 0, 2, 'ww-tegenwoordig'), seen(REKENEN_MODULE_ID, 0, 2, 'tafels')];
    const run = (withVillagers: boolean) => {
      let rotation = emptyRotation();
      const order: string[] = [];
      const rng = createRng(9);
      for (let i = 0; i < 12; i++) {
        if (withVillagers) pickVillageQuestion({ ...base(progress), rotation, rng });
        const r = pickModule(rotation, cands);
        rotation = r.state;
        order.push(r.moduleId as string);
      }
      return { order, rotation };
    };
    expect(run(true)).toEqual(run(false));
  });
});

const item: ChoiceItem = {
  id: 'x1', level: 'M6', skill: 's', prompt: 'Kies', explain: 'Zo zit het echt.', type: 'choice', options: ['a', 'b'], answer: 1,
};
const question: VillageQuestion = { moduleId: 'm', topic: 't', entry: { item, box: 2 } };
const right = { type: 'choice', index: 1 } as const;
const wrong = { type: 'choice', index: 0 } as const;
const answer = (response: typeof right | typeof wrong, roll = 0.7) =>
  ({ type: 'answer', response, ms: 900, at: 5, roll }) as const;
const types = (effects: VillageEffect[]) => effects.map((e) => e.type);

describe('village card state (V11d)', () => {
  it('AC183, AC184: right on the first try moves the box up, gives the block and a celebration', () => {
    const s0 = startVillageCard(question, 35, []);
    const r = reduceVillage(s0, answer(right, 0.7));
    expect(r.state).toMatchObject({ phase: 'right', firstTryRight: true, celebration: 'respect', alreadyFound: false });
    expect(types(r.effects)).toEqual(['answer', 'box', 'found']);
    expect(r.effects[1]).toEqual({ type: 'box', firstTryRight: true });
    expect(r.effects[2]).toEqual({ type: 'found', block: 35 });
    expect(r.effects[0]).toMatchObject({ type: 'answer', try: 1, correct: true });
    const dance = reduceVillage(s0, answer(right, 0.2));
    expect(types(dance.effects)).toEqual(['answer', 'box', 'dance', 'found']);
  });

  it('AC184: wrong first try puts the box in 1 at once, shows the retry, and a right retry never changes the box', () => {
    const s0 = startVillageCard(question, 36, []);
    const w = reduceVillage(s0, answer(wrong));
    expect(w.state).toMatchObject({ phase: 'question', try: 2, firstTryRight: false });
    expect(w.effects[1]).toEqual({ type: 'box', firstTryRight: false });
    const r = reduceVillage(w.state, answer(right));
    expect(r.state).toMatchObject({ phase: 'right', firstTryRight: false });
    expect(types(r.effects)).toContain('found');
    expect(types(r.effects)).not.toContain('box');
    expect(r.effects[0]).toMatchObject({ type: 'answer', try: 2, correct: true });
  });

  it('AC184: wrong twice shows the answer, gives no block and ends on Verder', () => {
    const s0 = startVillageCard(question, 36, []);
    const w2 = reduceVillage(reduceVillage(s0, answer(wrong)).state, answer(wrong));
    expect(w2.state.phase).toBe('wrong');
    expect(types(w2.effects)).toEqual(['answer']);
    const done = reduceVillage(w2.state, { type: 'verder' });
    expect(done.state.phase).toBe('closed');
    expect(done.effects).toEqual([]);
  });

  it('AC184: a block found before gives no found effect and no hotbar button action', () => {
    const s0 = startVillageCard(question, 35, [35, 39]);
    expect(s0.alreadyFound).toBe(true);
    const r = reduceVillage(s0, answer(right));
    expect(types(r.effects)).not.toContain('found');
    expect(reduceVillage(r.state, { type: 'hotbar' }).effects).toEqual([]);
  });

  it('AC184: In mijn hotbar gives the block and closes', () => {
    const r = reduceVillage(startVillageCard(question, 37, []), answer(right));
    const h = reduceVillage(r.state, { type: 'hotbar' });
    expect(h.state.phase).toBe('closed');
    expect(h.effects).toEqual([{ type: 'hotbar', block: 37 }]);
  });

  it('AC184: Laat maar closes without a block, and the first try already given stays counted', () => {
    const s0 = startVillageCard(question, 37, []);
    const l = reduceVillage(s0, { type: 'laatMaar' });
    expect(l.state.phase).toBe('closed');
    expect(l.effects).toEqual([]);
    const afterWrong = reduceVillage(s0, answer(wrong));
    expect(types(afterWrong.effects)).toContain('box');
    expect(types(reduceVillage(afterWrong.state, { type: 'laatMaar' }).effects)).toEqual([]);
  });

  it('AC184: a double tap acts once (a second answer, Verder or hotbar does nothing)', () => {
    const r = reduceVillage(startVillageCard(question, 37, []), answer(right));
    const again = reduceVillage(r.state, answer(right));
    expect(again.effects).toEqual([]);
    expect(again.state).toBe(r.state);
    const h = reduceVillage(r.state, { type: 'hotbar' });
    expect(reduceVillage(h.state, { type: 'hotbar' }).effects).toEqual([]);
    expect(reduceVillage(h.state, { type: 'verder' }).effects).toEqual([]);
  });

  it('AC184: with a fixed seed, 10 right answers give both the dance and Respect bruuuuu', () => {
    const rng = createRng(2026);
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const r = reduceVillage(startVillageCard(question, 35, []), answer(right, rng.next()));
      seen.add(r.state.celebration as string);
    }
    expect(seen).toEqual(new Set(['dance', 'respect']));
  });

  it('AC185: no effect ever mentions points', () => {
    let st: VillageCardState = startVillageCard(question, 35, []);
    const all: VillageEffect[] = [];
    for (const ev of [answer(wrong), answer(wrong), { type: 'verder' } as const]) {
      const r = reduceVillage(st, ev);
      st = r.state;
      all.push(...r.effects);
    }
    expect(all.map((e) => e.type).every((t) => ['answer', 'box', 'found', 'dance', 'hotbar'].includes(t))).toBe(true);
  });
});
