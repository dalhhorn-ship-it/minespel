import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { openDb, request, transact } from '../storage/db';
import { defaultKv, type MonstersRecord } from '../storage/schema';
import { createStonesFlow, readStones } from './stones-flow';

let n = 0;
async function freshDb(stones?: { found: number[]; bought: number[] }) {
  const db = await openDb({ name: `stones-flow-db-${n++}` });
  await transact(db, 'kv', 'readwrite', async (tx) => {
    await request(tx.objectStore('kv').put({ ...defaultKv('monsters'), ...(stones ? { stones } : {}) }, 'monsters'));
  });
  return db;
}
const saved = (db: IDBDatabase) =>
  transact(db, 'kv', 'readonly', (tx) => request<MonstersRecord>(tx.objectStore('kv').get('monsters'))).then((m) => m.stones);

const make = (db: IDBDatabase = {} as IDBDatabase) => {
  const setStones = vi.fn();
  const say = vi.fn();
  const flow = createStonesFlow({ db, say, game: { setStones }, startBlock: () => 0 });
  return { flow, setStones, say };
};

describe('the stones flow skeleton (v20 seam)', () => {
  it('AC278: a record without stones reads empty', () => {
    expect(readStones({})).toEqual({ found: [], bought: [] });
    expect(readStones({ stones: 5 })).toEqual({ found: [], bought: [] });
  });

  it('AC278: readStones drops ids that are not stones and a stone bought but not found', () => {
    expect(readStones({ stones: { found: [44, 43, 43, 9, 'x'], bought: [43, 50] } })).toEqual({ found: [43, 44], bought: [43] });
  });

  it('AC272: load tells the game, state and isBought read it, markBought tells the game again', () => {
    const { flow, setStones } = make();
    flow.load({ stones: { found: [43, 45], bought: [43] } });
    expect(setStones).toHaveBeenLastCalledWith([43, 45], [43]);
    expect(flow.isBought(43)).toBe(true);
    expect(flow.isBought(45)).toBe(false);
    flow.markBought(45);
    flow.markBought(45);
    expect(flow.state()).toEqual({ found: [43, 45], bought: [43, 45] });
    expect(setStones).toHaveBeenCalledTimes(2);
  });

  it('AC272: the first mine of a stone vein marks it found, says so once and saves it in the monsters record', async () => {
    const db = await freshDb({ found: [45], bought: [45] });
    const { flow, say, setStones } = make(db);
    flow.load({ stones: { found: [45], bought: [45] } });
    setStones.mockClear();
    flow.onMined(1, 2, 3, 43);
    expect(flow.state()).toEqual({ found: [43, 45], bought: [45] });
    expect(say).toHaveBeenCalledTimes(1);
    expect(say).toHaveBeenCalledWith('Je hebt Maansteen ontdekt!');
    expect(setStones).toHaveBeenCalledTimes(1);
    expect(setStones).toHaveBeenCalledWith([43, 45], [45]);
    await vi.waitFor(async () => expect(await saved(db)).toEqual({ found: [43, 45], bought: [45] }));
  });

  it('AC272: a second Maansteen gives no toast and no change', async () => {
    const db = await freshDb();
    const { flow, say, setStones } = make(db);
    flow.load({});
    setStones.mockClear();
    flow.onMined(1, 2, 3, 43);
    flow.onMined(4, 2, 3, 43);
    expect(say).toHaveBeenCalledTimes(1);
    expect(setStones).toHaveBeenCalledTimes(1);
    await vi.waitFor(async () => expect(await saved(db)).toEqual({ found: [43], bought: [] }));
  });

  it('AC272: other blocks find nothing, and a stone already found by the record gives no toast', () => {
    const { flow, say, setStones } = make();
    flow.load({ stones: { found: [44], bought: [] } });
    setStones.mockClear();
    flow.onMined(1, 2, 3, 3);
    flow.onMined(1, 2, 3, 42);
    flow.onMined(1, 2, 3, 44);
    expect(say).not.toHaveBeenCalled();
    expect(setStones).not.toHaveBeenCalled();
  });

  it('AC272: it never reads a monster switch, so it works with every switch off (the flow has no switch input)', () => {
    const { flow, say } = make();
    flow.load({});
    flow.onMined(0, 1, 0, 50);
    expect(flow.state().found).toEqual([50]);
    expect(say).toHaveBeenCalledWith('Je hebt Mollengoud ontdekt!');
  });
});
