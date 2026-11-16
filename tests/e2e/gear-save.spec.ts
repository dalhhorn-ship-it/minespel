// Gear in the save (V19a, AC262, AC263, AC267): buy and wear by hook, restart, the same gear; a 0.9.0 save loads bare.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface GearState {
  owned: string[];
  worn: Record<string, Record<string, string>>;
  knights: { id: string; worn: Record<string, string>; kracht: number; speed: number }[];
}
interface Ledger { delta: number; reason: string }

const gear = (page: Page) => readState<GearState>(page, 'gearState');

function kvGet<T>(page: Page, name: string): Promise<T | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('kv').objectStore('kv').get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        };
      }),
    name,
  ) as Promise<T | undefined>;
}
function kvPut(page: Page, name: string, value: unknown): Promise<void> {
  return page.evaluate(
    ({ key, v }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: name, v: value },
  );
}

async function reopen(page: Page) {
  await page.reload();
  await openApp(page);
}

test.describe('Gear in the save (V19a)', () => {
  test('AC259 AC262 AC263 AC267: buy and wear by hook, restart, the same gear and the same Kracht and speed', async ({ page }) => {
    await openApp(page);
    const a = await readState<string>(page, 'addKnight', 'follow');
    await readState<string>(page, 'addKnight', 'follow');
    await readState(page, 'setPoints', 200);
    for (const id of ['leren-kap', 'houten-schild', 'pony']) expect(await readState<boolean>(page, 'buyGearInShop', id)).toBe(true);
    expect(await readState<boolean>(page, 'buyGearInShop', 'pony')).toBe(false);
    expect(await readState<number>(page, 'points')).toBe(200 - 70);
    const rows = await readState<Ledger[]>(page, 'ledgerLog');
    expect(rows.filter((r) => r.reason === 'gear').map((r) => r.delta)).toEqual([-10, -10, -50]);

    expect(await readState<boolean>(page, 'wearGear', a, 'leren-kap', 'hoofd')).toBe(true);
    expect(await readState<boolean>(page, 'wearGear', a, 'houten-schild')).toBe(true);
    expect(await readState<boolean>(page, 'wearGear', a, 'pony', 'rijdier')).toBe(true);
    const before = await gear(page);
    expect(before.owned).toHaveLength(3);
    expect(before.knights.find((k) => k.id === a)).toMatchObject({ kracht: 3, speed: 4.5 });
    expect(before.knights.find((k) => k.id !== a)).toMatchObject({ kracht: 1, speed: 3 });

    await reopen(page);
    const after = await gear(page);
    expect(after.owned.sort()).toEqual(before.owned.slice().sort());
    expect(after.worn).toEqual(before.worn);
    expect(after.knights.find((k) => k.id === a)).toMatchObject({ kracht: 3, speed: 4.5 });
  });

  test('AC267: a 0.9.0 save with 2 knights loads bare and unchanged', async ({ page }) => {
    await openApp(page);
    const saved = {
      knights: [
        { id: 'ridder-1', mode: 'follow', spot: null, boughtFor: 30 },
        { id: 'ridder-2', mode: 'guard', spot: { x: 41.5, y: 12, z: 39.5 }, boughtFor: 30 },
      ],
      bubbleClockMs: 1000,
      hintShown: true,
    };
    await kvPut(page, 'monsters', saved);
    await reopen(page);
    const g = await gear(page);
    expect(g.owned).toEqual([]);
    expect(g.worn).toEqual({});
    expect(g.knights.map((k) => [k.id, k.kracht, k.speed])).toEqual([['ridder-1', 1, 3], ['ridder-2', 1, 3]]);
    expect(await kvGet(page, 'monsters')).toEqual(saved);
    expect(await readState<{ found: number[]; bought: number[] }>(page, 'stonesState')).toEqual({ found: [], bought: [] });
  });
});
