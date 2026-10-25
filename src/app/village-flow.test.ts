// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCatalog, TAAL_MODULE_ID } from '../content/catalog';
import type { ChoiceItem } from '../content/format';
import { createRng } from '../core/rng';
import { createVillagerSystem } from '../game/villager-system';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords, type Records } from '../storage/records';
import { createVillageBubble } from '../ui/village-bubble';
import { RARE_BLOCKS } from '../world/blocks';
import { World } from '../world/world';
import { createScreenManager } from './screens';
import { COOLDOWN_MS } from '../learning/village-question';
import { createVillageFlow, type VillageFlow } from './village-flow';

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const byId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

const catalog = createCatalog();
const choiceItem = catalog
  .fixedItems(TAAL_MODULE_ID, 'ww-tegenwoordig', { levels: ['M6'] })
  .find((i): i is ChoiceItem => i.type === 'choice')!;
const rightIndex = choiceItem.answer;
const wrongIndex = rightIndex === 0 ? 1 : 0;

let n = 0;
const flows: VillageFlow[] = [];
/** A stock with every rare block at 0, plus the given counts (keys are block ids as text, as saved). */
/** The same, keyed by number, as the game gets it. */
const numStock = (): Record<number, number> => Object.fromEntries(RARE_BLOCKS.map((id) => [id, 0]));
const stockOf = (counts: Record<number, number> = {}): Record<string, number> =>
  Object.fromEntries(RARE_BLOCKS.map((id) => [String(id), counts[id] ?? 0]));
afterEach(() => {
  while (flows.length) flows.pop()?.destroy();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

async function setup(opts: { seen?: boolean; db?: IDBDatabase; remaining?: number; rngSeed?: number; found?: number[]; stock?: Record<number, number>; spread?: boolean; records?: Records } = {}) {
  const db = opts.db ?? (await openDb({ name: `village-flow-${n++}` }));
  const records = opts.records ?? createRecords(db);
  const progressStore = createProgressStore(db);
  const logStore = createLogStore(db);
  if (opts.found) {
    await records.put('village', {
      found: opts.found, cooldownMs: 0, lastVillager: null, ...(opts.stock ? { stock: stockOf(opts.stock) } : {}),
    });
  }
  if (opts.seen !== false) {
    await progressStore.put({
      moduleId: TAAL_MODULE_ID, itemId: choiceItem.id, topic: 'ww-tegenwoordig', skill: choiceItem.skill,
      level: choiceItem.level, box: 2, due: '2026-01-01', seen: 1,
    });
  }
  const host = document.createElement('div');
  document.body.append(host);
  const screens = createScreenManager({ host });
  const player = { player: { x: 0, y: 12, z: 0 } };
  const villagerSystem = createVillagerSystem({ world: new World(), player, rng: createRng(1), stillMode: true });
  const villagers = villagerSystem.villagers();
  // Villages are close together; tests that look at one villager move the others far away.
  if (opts.spread !== false) villagers.forEach((v, i) => { v.x = 1000 * i; v.z = 0; v.y = 12; });
  const danceSpy = vi.spyOn(villagerSystem, 'dance');
  let tapClock = 0;
  const bubble = createVillageBubble({ onTap: () => flow.onBubbleTapped(), now: () => (tapClock += 1000) });
  host.append(bubble.element);
  const state = { running: true, remaining: opts.remaining ?? 120_000 };
  const giveToHotbar = vi.fn();
  const setFoundBlocks = vi.fn();
  const setRareStock = vi.fn();
  const flow = createVillageFlow({
    game: { player: player as never, villagerSystem, villageBubble: bubble, setFoundBlocks, giveToHotbar, setRareStock, isRunning: () => state.running },
    screens,
    timerDriver: { remainingPlayMs: () => state.remaining },
    records, progressStore, logStore,
    getCatalog: () => catalog,
    rng: createRng(opts.rngSeed ?? 3),
    clock: { now: () => 1_800_000_000_000 },
    intervalMs: 0,
  });
  flows.push(flow);
  await flow.start();
  /** Puts the player 1 block from villager i. */
  const stand = (i: number, dx = 1) => {
    const v = villagers[i]!;
    player.player.x = v.x + dx;
    player.player.y = v.y;
    player.player.z = v.z;
  };
  const look = async () => {
    flow.tick();
    await flow.flush();
    flow.tick();
  };
  return { db, records, progressStore, logStore, screens, flow, bubble, state, stand, villagers, look, giveToHotbar, setFoundBlocks, setRareStock, danceSpy, player, villagerSystem };
}

describe('village flow: the bubble (V11d)', () => {
  it('AC181: within 3 blocks the bubble shows for that villager, and farther than 6 it hides', async () => {
    const s = await setup();
    s.stand(0, 2);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state()).toMatchObject({ visible: true, villager: 'v1', text: 'Hoi! Wil je een vraag?' }); });
    s.stand(0, 5);
    s.flow.tick();
    expect(s.bubble.state().visible).toBe(true);
    s.stand(0, 7);
    s.flow.tick();
    expect(s.bubble.state().visible).toBe(false);
  });

  it('AC181: not within 3 blocks shows nothing', async () => {
    const s = await setup();
    s.stand(0, 4);
    await s.look();
    expect(s.bubble.state().visible).toBe(false);
  });

  it('AC181: with two villagers within 3 blocks only the nearest bubble shows', async () => {
    const s = await setup();
    const [a, b] = [s.villagers[0]!, s.villagers[1]!];
    // Put villager 2 next to villager 1, 1.5 blocks farther from the player.
    b.x = a.x + 1.5; b.y = a.y; b.z = a.z;
    s.stand(0, -1);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().visible).toBe(true); });
    expect(s.bubble.state().villager).toBe('v1');
    expect(document.querySelectorAll('.village-bubble:not([hidden])')).toHaveLength(1);
  });

  it('AC182: the bubble hides at once when the screen changes, without a look', async () => {
    const s = await setup();
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().visible).toBe(true); });
    s.screens.setExternalKidOverlay(true);
    expect(s.bubble.state().visible).toBe(false);
  });

  it('AC182: every screen but the world keeps the bubble away, and so does a paused game', async () => {
    const s = await setup();
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().visible).toBe(true); });
    for (const show of [
      () => s.screens.showKidOverlay(document.createElement('div')),
      () => s.screens.showLearn(document.createElement('div')),
      () => s.screens.showExam(document.createElement('div')),
      () => s.screens.showParent(document.createElement('div')),
      () => s.screens.setExternalKidOverlay(true),
    ]) {
      show();
      s.flow.tick();
      expect(s.bubble.state().visible).toBe(false);
      s.screens.showWorld();
      await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().visible).toBe(true); });
    }
    s.state.running = false;
    s.flow.tick();
    expect(s.bubble.state().visible).toBe(false);
  });

  it('AC182: before start (the app is not ready) no bubble shows', async () => {
    const db = await openDb({ name: `village-flow-${n++}` });
    const host = document.createElement('div');
    document.body.append(host);
    const bubble = createVillageBubble({ onTap: () => {} });
    const player = { player: { x: 0, y: 12, z: 0 } };
    const vs = createVillagerSystem({ world: new World(), player, stillMode: true });
    const v = vs.villagers()[0]!;
    player.player.x = v.x + 1; player.player.y = v.y; player.player.z = v.z;
    const flow = createVillageFlow({
      game: { player: player as never, villagerSystem: vs, villageBubble: bubble, setFoundBlocks: () => {}, giveToHotbar: () => {}, setRareStock: () => {}, isRunning: () => true },
      screens: createScreenManager({ host }),
      timerDriver: { remainingPlayMs: () => 120_000 },
      records: createRecords(db), progressStore: createProgressStore(db), logStore: createLogStore(db),
      getCatalog: () => catalog, intervalMs: 0,
    });
    flows.push(flow);
    flow.tick();
    await flow.flush();
    flow.tick();
    expect(bubble.state().visible).toBe(false);
  });

  it('AC182: in the last 30 seconds before a break there is no bubble; at 0:31 it shows and at 0:30 it hides', async () => {
    const s = await setup({ remaining: 31_000 });
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().visible).toBe(true); });
    s.state.remaining = 30_000;
    s.flow.tick();
    expect(s.bubble.state().visible).toBe(false);
    s.state.remaining = 10_000;
    await s.look();
    expect(s.bubble.state().visible).toBe(false);
  });

  it('AC182: with no seen item the villager only says "Hoi!", a tap opens nothing and no cooldown starts', async () => {
    const s = await setup({ seen: false });
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state()).toMatchObject({ visible: true, text: 'Hoi!', canAsk: false }); });
    tap(s.bubble.element);
    expect(s.flow.isCardOpen()).toBe(false);
    expect(s.flow.state().cooldownMs).toBe(0);
    expect(s.flow.state().lastVillager).toBeNull();
  });

  it('AC182: with every item in box 0 it is only "Hoi!" too', async () => {
    const s = await setup();
    await s.progressStore.put({
      moduleId: TAAL_MODULE_ID, itemId: choiceItem.id, topic: 'ww-tegenwoordig', skill: choiceItem.skill,
      level: choiceItem.level, box: 0, due: '2026-01-01', seen: 0,
    });
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().text).toBe('Hoi!'); });
  });
});

describe('village flow: the card and the answers (V11d)', () => {
  async function openCard(s: Awaited<ReturnType<typeof setup>>, i = 0) {
    s.stand(i);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().canAsk).toBe(true); });
    tap(s.bubble.element);
    expect(s.flow.isCardOpen()).toBe(true);
  }
  const option = (index: number) => document.querySelectorAll('.q-option')[index] as HTMLElement;

  it('AC183, AC185: tapping the bubble opens the card on the kid-overlay layer and saves the cooldown at once', async () => {
    const s = await setup();
    await openCard(s);
    expect(s.screens.current()).toBe('kid-overlay');
    expect(byId('village-card')).not.toBeNull();
    expect(document.body.textContent).toContain(choiceItem.prompt);
    expect(s.bubble.state().visible).toBe(false);
    await s.flow.flush();
    expect(await s.records.get('village')).toEqual({ found: [], cooldownMs: COOLDOWN_MS, lastVillager: 'v1', stock: stockOf() });
  });

  it('AC183, AC184: right on the first try gives 2 of the block, moves the box up and logs a dorp answer', async () => {
    const s = await setup();
    await openCard(s);
    tap(option(rightIndex));
    expect(byId('village-found')?.textContent).toBe('Je hebt drakenoog gevonden! Je krijgt er 2.');
    expect(s.setFoundBlocks).toHaveBeenLastCalledWith([RARE_BLOCKS[0]]);
    expect(s.setRareStock).toHaveBeenLastCalledWith({ ...numStock(), [RARE_BLOCKS[0]!]: 2 });
    expect(s.flow.state().stock).toEqual(stockOf({ [RARE_BLOCKS[0]!]: 2 }));
    tap(byId('village-hotbar')!);
    expect(s.giveToHotbar).toHaveBeenCalledWith(RARE_BLOCKS[0]);
    expect(s.flow.isCardOpen()).toBe(false);
    expect(s.screens.current()).toBe('world');
    await s.flow.flush();
    expect((await s.records.get('village')).found).toEqual([RARE_BLOCKS[0]]);
    expect((await s.records.get('village')).stock).toEqual(stockOf({ [RARE_BLOCKS[0]!]: 2 }));
    const answers = await s.logStore.listAnswers();
    expect(answers).toHaveLength(1);
    expect(answers[0]).toMatchObject({ context: 'dorp', try: 1, correct: true, itemId: choiceItem.id, moduleId: TAAL_MODULE_ID });
    expect((await s.progressStore.get(TAAL_MODULE_ID, choiceItem.id))?.box).toBe(3);
    expect(await s.logStore.listBreaks()).toEqual([]);
    expect(await s.logStore.listLedger()).toEqual([]);
  });

  it('AC183: a wrong first try puts the box in 1, also when the retry is right', async () => {
    const s = await setup();
    await openCard(s);
    tap(option(wrongIndex));
    expect(document.body.textContent).toContain('Net niet. Probeer het nog een keer.');
    expect(document.body.textContent).not.toContain('Zo zit het');
    tap(option(rightIndex));
    expect(byId('village-found')).not.toBeNull();
    await s.flow.flush();
    expect((await s.progressStore.get(TAAL_MODULE_ID, choiceItem.id))?.box).toBe(1);
    const answers = await s.logStore.listAnswers();
    expect(answers.map((a) => [a.try, a.correct, a.context])).toEqual([[1, false, 'dorp'], [2, true, 'dorp']]);
  });

  it('AC184: wrong twice shows "Zo zit het:" with the answer and explain, gives no block, and Verder returns to the world', async () => {
    const s = await setup();
    await openCard(s);
    tap(option(wrongIndex));
    tap(option(wrongIndex));
    expect(document.body.textContent).toContain('Zo zit het:');
    expect(byId('village-answer')?.textContent).toBe(choiceItem.options[rightIndex]);
    expect(byId('village-explain')?.textContent).toBe(choiceItem.explain);
    tap(byId('village-verder')!);
    expect(s.screens.current()).toBe('world');
    await s.flow.flush();
    expect((await s.records.get('village')).found).toEqual([]);
    expect((await s.records.get('village')).stock).toEqual(stockOf());
    expect(s.setFoundBlocks).not.toHaveBeenCalledWith([RARE_BLOCKS[0]]);
  });

  it('AC184: wrong twice on a block found before leaves its stock as it was', async () => {
    const s = await setup({ found: [RARE_BLOCKS[0]!], stock: { [RARE_BLOCKS[0]!]: 3 } });
    await openCard(s);
    tap(option(wrongIndex));
    tap(option(wrongIndex));
    tap(byId('village-verder')!);
    await s.flow.flush();
    expect(s.flow.state().stock).toEqual(stockOf({ [RARE_BLOCKS[0]!]: 3 }));
    expect((await s.records.get('village')).stock).toEqual(stockOf({ [RARE_BLOCKS[0]!]: 3 }));
  });

  it('AC184: Laat maar closes without a block, and the first try already given still counts for the box', async () => {
    const s = await setup();
    await openCard(s);
    tap(option(wrongIndex));
    tap(byId('village-laat-maar')!);
    expect(s.flow.isCardOpen()).toBe(false);
    await s.flow.flush();
    expect((await s.progressStore.get(TAAL_MODULE_ID, choiceItem.id))?.box).toBe(1);
    expect((await s.records.get('village')).found).toEqual([]);
    expect((await s.records.get('village')).stock).toEqual(stockOf());
  });

  for (const before of [0, 3]) {
    it(`AC184: a block found before with a stock of ${before} shows "Nog 2 [naam] erbij!" and the stock becomes ${before + 2}`, async () => {
      const block = RARE_BLOCKS[0]!;
      const s = await setup({ found: [block, RARE_BLOCKS[4]!], stock: { [block]: before, [RARE_BLOCKS[4]!]: 1 } });
      await openCard(s);
      tap(option(rightIndex));
      expect(byId('village-more')?.textContent).toBe('Nog 2 drakenoog erbij!');
      expect(document.body.textContent).not.toContain('Die had je al!');
      expect(byId('village-found')).toBeNull();
      tap(byId('village-hotbar')!);
      expect(s.giveToHotbar).toHaveBeenCalledWith(block);
      await s.flow.flush();
      expect(s.flow.state().found).toEqual([block, RARE_BLOCKS[4]]);
      expect(s.flow.state().stock).toEqual(stockOf({ [block]: before + 2, [RARE_BLOCKS[4]!]: 1 }));
      expect(s.setRareStock).toHaveBeenLastCalledWith({ ...numStock(), [block]: before + 2, [RARE_BLOCKS[4]!]: 1 });
      expect((await s.records.get('village')).stock).toEqual(stockOf({ [block]: before + 2, [RARE_BLOCKS[4]!]: 1 }));
    });
  }

  it('AC184: the dance calls the villager dance, Respect bruuuuu! does not, and both show over 10 right answers', async () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) {
      const s = await setup({ rngSeed: seed });
      await openCard(s);
      tap(option(rightIndex));
      seen.add(document.querySelector('.village-say')?.textContent ?? '');
      expect(s.danceSpy.mock.calls.length).toBe(document.querySelector('.village-say')?.textContent === 'Kijk, een dansje!' ? 1 : 0);
      flows.pop()?.destroy();
    }
    expect(seen).toEqual(new Set(['Respect bruuuuu!', 'Kijk, een dansje!']));
  });

  it('AC184: a double tap on the bubble opens one card, and a double tap on an answer counts once', async () => {
    const s = await setup();
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().canAsk).toBe(true); });
    s.flow.onBubbleTapped();
    s.flow.onBubbleTapped();
    expect(document.querySelectorAll('[data-testid="village-card"]')).toHaveLength(1);
    tap(option(rightIndex));
    s.flow.onBubbleTapped();
    await s.flow.flush();
    expect(await s.logStore.listAnswers()).toHaveLength(1);
  });

  it('AC185: points never change, and the play timer is not read or changed by the card', async () => {
    const s = await setup();
    await s.records.put('economy', { points: 10, practicePointsToday: 0, practiceDay: '' });
    await openCard(s);
    tap(option(wrongIndex));
    tap(option(wrongIndex));
    tap(byId('village-verder')!);
    await s.flow.flush();
    expect((await s.records.get('economy')).points).toBe(10);
    expect(await s.logStore.listLedger()).toEqual([]);
  });

  it('AC189: no network request is made', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const s = await setup();
    await openCard(s);
    tap(option(rightIndex));
    tap(byId('village-verder')!);
    await s.flow.flush();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('village flow: the cooldown (V11d, AC186)', () => {
  async function ask(s: Awaited<ReturnType<typeof setup>>, i: number) {
    s.stand(i);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().canAsk).toBe(true); });
    tap(s.bubble.element);
    tap(document.querySelectorAll('.q-option')[choiceItem.answer] as HTMLElement);
    tap(byId('village-verder')!);
    expect(s.flow.isCardOpen()).toBe(false);
  }

  it('AC186: no bubble for 3 minutes of play time, and only the time the countdown runs counts', async () => {
    const s = await setup({ remaining: 280_000 });
    await ask(s, 0);
    s.stand(1);
    // Time in a menu does not move the countdown, so it does not count.
    s.screens.showKidOverlay(document.createElement('div'));
    s.flow.tick();
    s.screens.showWorld();
    await s.look();
    expect(s.bubble.state().visible).toBe(false);
    s.state.remaining -= 120_000;
    await s.look();
    expect(s.flow.state().cooldownMs).toBe(60_000);
    expect(s.bubble.state().visible).toBe(false);
    s.state.remaining -= 59_000;
    await s.look();
    expect(s.bubble.state().visible).toBe(false);
    s.state.remaining -= 1_000;
    s.flow.tick();
    expect(s.flow.state().cooldownMs).toBe(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state()).toMatchObject({ visible: true, villager: 'v2' }); });
  });

  it('AC186: after the cooldown the villager who asked last shows no bubble, another one does', async () => {
    const s = await setup({ remaining: 400_000 });
    await ask(s, 0);
    s.state.remaining -= COOLDOWN_MS;
    s.stand(0);
    await s.look();
    expect(s.flow.state().cooldownMs).toBe(0);
    expect(s.bubble.state().visible).toBe(false);
    s.stand(1);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().villager).toBe('v2'); });
  });

  it('AC186: a restart right after the card opened keeps the cooldown', async () => {
    const s = await setup({ remaining: 400_000 });
    s.stand(0);
    await vi.waitFor(() => { s.flow.tick(); expect(s.bubble.state().canAsk).toBe(true); });
    tap(s.bubble.element);
    await s.flow.flush();
    // The app is killed with the card open: a new flow on the same database shows the world, no card, no bubble.
    const again = await setup({ db: s.db, remaining: 400_000 });
    expect(again.flow.isCardOpen()).toBe(false);
    expect(again.screens.current()).toBe('world');
    expect(again.flow.state()).toEqual({ found: [], cooldownMs: COOLDOWN_MS, lastVillager: 'v1', stock: stockOf() });
    again.stand(1);
    await again.look();
    expect(again.bubble.state().visible).toBe(false);
  });

  it('AC188: found blocks and stocks 2, 0 and 5 come back after a restart and are handed to the game', async () => {
    const s = await setup();
    const [a, b, c] = [RARE_BLOCKS[0]!, RARE_BLOCKS[2]!, RARE_BLOCKS[5]!];
    await s.records.put('village', { found: [b, a, c], cooldownMs: 0, lastVillager: null, stock: stockOf({ [a]: 2, [b]: 0, [c]: 5 }) });
    const again = await setup({ db: s.db });
    expect(again.flow.state().found).toEqual([a, b, c]);
    expect(again.flow.state().stock).toEqual(stockOf({ [a]: 2, [b]: 0, [c]: 5 }));
    expect(again.setFoundBlocks).toHaveBeenCalledWith([a, b, c]);
    expect(again.setRareStock).toHaveBeenLastCalledWith({ ...numStock(), [a]: 2, [b]: 0, [c]: 5 });
  });

  it('AC188: a save from 0.4.0 (no village record) starts with 0 found, every stock 0 and no cooldown', async () => {
    const s = await setup();
    expect(s.flow.state()).toEqual({ found: [], cooldownMs: 0, lastVillager: null, stock: stockOf() });
  });

  it('AC187: all 8 villagers answered right once (automated) find all 8 rare blocks', async () => {
    const s = await setup({ remaining: 5_000_000 });
    for (let i = 0; i < 8; i++) {
      await ask(s, i);
      s.state.remaining -= COOLDOWN_MS;
    }
    await s.flow.flush();
    expect(s.flow.state().found).toEqual([...RARE_BLOCKS]);
    expect((await s.records.get('village')).found).toEqual([...RARE_BLOCKS]);
    expect(s.flow.state().stock).toEqual(Object.fromEntries(RARE_BLOCKS.map((id) => [String(id), 2])));
  });

  it('AC189: after villager questions the only new saved data is the village record and the answers', async () => {
    const s = await setup();
    const before = {
      economy: await s.records.get('economy'),
      rotation: await s.records.get('rotation'),
      timers: await s.records.get('timers'),
      session: await s.records.get('session'),
    };
    await ask(s, 0);
    await s.flow.flush();
    expect({
      economy: await s.records.get('economy'),
      rotation: await s.records.get('rotation'),
      timers: await s.records.get('timers'),
      session: await s.records.get('session'),
    }).toEqual(before);
    expect(await s.logStore.listBreaks()).toEqual([]);
    expect(await s.logStore.listExams()).toEqual([]);
  });
});

describe('village flow: the rare block stock (0.5.1, decision 106)', () => {
  it('AC192: the game reports placing and mining, the stock is saved and never goes below 0', async () => {
    const block = RARE_BLOCKS[1]!;
    const s = await setup({ found: [block], stock: { [block]: 2 } });
    s.flow.onStockChanged({ [block]: 1 });
    await s.flow.flush();
    expect((await s.records.get('village')).stock).toEqual(stockOf({ [block]: 1 }));
    s.flow.onStockChanged({ [block]: -3 });
    await s.flow.flush();
    expect(s.flow.state().stock).toEqual(stockOf({ [block]: 0 }));
    expect((await s.records.get('village')).stock).toEqual(stockOf({ [block]: 0 }));
    // Mined: one back.
    s.flow.onStockChanged({ [block]: 1 });
    await s.flow.flush();
    expect((await s.records.get('village')).stock).toEqual(stockOf({ [block]: 1 }));
  });

  it('AC193: a 0.5.0 record gets 2 of each found block once; the rest stays 0, the cooldown and last villager stay', async () => {
    const db = await openDb({ name: `village-flow-${n++}` });
    const records = createRecords(db);
    const found = [RARE_BLOCKS[6]!, RARE_BLOCKS[1]!, RARE_BLOCKS[3]!];
    // The exact shape 0.5.0 saved: no stock field.
    await records.put('village', { found, cooldownMs: 95_000, lastVillager: 'v4' });
    const first = await setup({ db });
    const want = stockOf({ [found[0]!]: 2, [found[1]!]: 2, [found[2]!]: 2 });
    const sorted = [...found].sort((a, b) => a - b);
    expect(first.flow.state()).toEqual({ found: sorted, cooldownMs: 95_000, lastVillager: 'v4', stock: want });
    expect(await records.get('village')).toEqual({ found: sorted, cooldownMs: 95_000, lastVillager: 'v4', stock: want });
    expect(first.setFoundBlocks).toHaveBeenCalledWith(sorted);
    first.flow.destroy();
    // Opening again adds nothing.
    const second = await setup({ db });
    expect(second.flow.state().stock).toEqual(want);
    second.flow.destroy();
    const third = await setup({ db });
    expect((await records.get('village')).stock).toEqual(want);
    expect(third.flow.state().stock).toEqual(want);
  });

  it('AC193: a kill during the first load leaves the old record or the new one, never a mix, and the stocks are 2 after', async () => {
    const db = await openDb({ name: `village-flow-${n++}` });
    const real = createRecords(db);
    const found = [RARE_BLOCKS[0]!, RARE_BLOCKS[7]!];
    const old = { found, cooldownMs: 40_000, lastVillager: 'v2' };
    await real.put('village', old);
    // The app dies before the upgraded record is written: the put never lands.
    const killed: Records = {
      get: (name) => real.get(name),
      put: async (name, value) => {
        if (name === 'village') throw new Error('killed');
        return real.put(name, value);
      },
      update: (name, change) => real.update(name, change),
    };
    const dying = await setup({ db, records: killed });
    dying.flow.destroy();
    expect(await real.get('village')).toEqual(old);
    // The next start does the whole upgrade, once.
    const next = await setup({ db });
    const want = stockOf({ [found[0]!]: 2, [found[1]!]: 2 });
    expect(next.flow.state()).toEqual({ ...old, stock: want });
    expect(await real.get('village')).toEqual({ ...old, stock: want });
    next.flow.destroy();
    const after = await setup({ db });
    expect(after.flow.state().stock).toEqual(want);
  });
});
