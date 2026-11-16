// Giving a lavakip (V23c, AC315, AC316, AC317): "Lavakip geven" in the dino and knight menu, the 3 second snack, and
// nothing else changes: no points, no ledger row, no new saved field. The lavakip come from a seeded `lavakip` record.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);
const LINE = 'Hap! Lekker pittig!';

interface Dino { id: string; mode: string; name: string; kind: string; golden: boolean; x: number; y: number; z: number; stayX: number; stayZ: number }
interface Knight { id: string; mode: string; spot: { x: number; y: number; z: number } | null }
interface Feed { snacking: { kind: string; id: string; msLeft: number }[]; fed: number }

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

function kvGet(page: Page, name: string): Promise<{ dinos: object[] } | undefined> {
  return page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('kv', 'readonly').objectStore('kv').get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        };
      }),
    name,
  );
}

const savedKeys = async (page: Page): Promise<string[]> => {
  await readState(page, 'flushSave');
  const rec = await kvGet(page, 'dinos');
  expect(rec?.dinos.length).toBeGreaterThan(0);
  return Object.keys(rec!.dinos[0]!).sort();
};

async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 12; x <= c + 12; x++)
        for (let z = c - 12; z <= c + 12; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < 10 ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, 10, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT },
  );
  await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
}

async function prepare(page: Page, carried: number) {
  await openApp(page);
  await kvPut(page, 'lavakip', { bought: true, spot: null, carried });
  await page.reload();
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  await flatten(page);
}

async function hatch(page: Page, kind: string, golden: boolean): Promise<Dino> {
  const before = (await readState<Dino[]>(page, 'dinos')).length;
  await readState(page, 'addEgg', kind, golden);
  await readState(page, 'stepDinos', 40);
  const all = await readState<Dino[]>(page, 'dinos');
  expect(all).toHaveLength(before + 1);
  return all[all.length - 1]!;
}

const carried = async (page: Page) => (await readState<{ carried: number }>(page, 'lavakipState')).carried;
const feedState = (page: Page) => readState<Feed>(page, 'feedState');


/** Turns the kid to the animal so its label shows (the label is hidden while it is behind the camera). */
async function faceDino(page: Page, id: string) {
  const d = (await readState<Array<{ id: string; x: number; z: number }>>(page, 'dinos')).find((x) => x.id === id)!;
  const p = await readState<{ x: number; y: number; z: number }>(page, 'player');
  const dx = d.x - p.x;
  const dz = d.z - p.z;
  for (const yaw of [Math.atan2(-dx, dz), Math.atan2(dx, dz), Math.atan2(dx, -dz), Math.atan2(-dx, -dz)]) {
    await readState(page, 'placePlayer', p.x, p.y, p.z, yaw);
    try {
      await expect(page.locator('.actor-label:not([hidden])', { hasText: 'Hap! Lekker pittig!' })).toBeVisible({ timeout: 700 });
      return;
    } catch {
      /* try the next turn */
    }
  }
}

const cases: { name: string; kind: string; golden: boolean }[] = [
  { name: 'a dino', kind: 'compy', golden: false },
  { name: 'a chicken', kind: 'kip', golden: false },
  { name: 'a golden dino', kind: 'triceratops', golden: true },
];

test.describe('Lavakip geven (V23c)', () => {
  for (const c of cases) {
    test(`AC315: ${c.name} eats a lavakip from the menu, then goes on as before`, async ({ page }) => {
      await prepare(page, 1);
      const d = await hatch(page, c.kind, c.golden);
      await readState(page, 'openDinoMenuFor', d.id);
      const btn = page.getByRole('button', { name: 'Lavakip geven' });
      await expect(btn).toBeVisible();
      const box = (await btn.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(56);
      await btn.click();
      await expect(page.locator('.dino-menu-card')).toHaveCount(0);
      await expect.poll(() => carried(page)).toBe(0);
      await expect.poll(async () => (await feedState(page)).snacking.map((s) => s.id)).toEqual([d.id]);
      const msLeft = (await feedState(page)).snacking[0]!.msLeft;
      expect(msLeft).toBeGreaterThan(2400);
      expect(msLeft).toBeLessThanOrEqual(3500);
      await faceDino(page, d.id);
      await expect(page.locator('.actor-label', { hasText: LINE })).toBeVisible();
      // The snack ends after 3 seconds of loop time.
      await readState(page, 'stepDinos', 3.6);
      await expect.poll(async () => (await feedState(page)).snacking).toEqual([]);
      const after = (await readState<Dino[]>(page, 'dinos')).find((x) => x.id === d.id)!;
      expect(after.mode).toBe(d.mode);
      expect(after.name).toBe(d.name);
      expect(after.stayX).toBe(d.stayX);
      expect(after.stayZ).toBe(d.stayZ);
      await expect(page.locator('.actor-label', { hasText: LINE })).toHaveCount(0);
      // With none carried the menu has no button.
      await readState(page, 'openDinoMenuFor', d.id);
      await expect(page.getByRole('button', { name: 'Knuffel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Lavakip geven' })).toHaveCount(0);
    });
  }

  test('AC316: a knight eats a lavakip and keeps his mode, spot and gear', async ({ page }) => {
    await prepare(page, 2);
    const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
    const before = (await readState<Knight[]>(page, 'knights'))[0]!;
    expect(await readState(page, 'feedLavakip', 'knight', id)).toBe(true);
    await expect.poll(() => carried(page)).toBe(1);
    await expect.poll(async () => (await feedState(page)).snacking.map((s) => s.kind)).toEqual(['knight']);
    await readState(page, 'fastForward', 3600);
    await expect.poll(async () => (await feedState(page)).snacking).toEqual([]);
    const after = (await readState<Knight[]>(page, 'knights'))[0]!;
    expect(after.mode).toBe(before.mode);
    expect(after.spot).toEqual(before.spot);
  });

  test('AC317: 10 animals and 3 knights fed change no points, no ledger row and no saved field', async ({ page }) => {
    await prepare(page, 10);
    const dinos: Dino[] = [];
    for (let i = 0; i < 10; i++) dinos.push(await hatch(page, 'compy', false));
    const knights: string[] = [];
    for (let i = 0; i < 3; i++) knights.push((await readState<string | null>(page, 'addKnight', 'stay'))!);
    const points = await readState<number>(page, 'points');
    const ledger = await readState<unknown[]>(page, 'ledgerLog');
    const keysBefore = await savedKeys(page);
    for (const d of dinos) expect(await readState(page, 'feedLavakip', 'dino', d.id)).toBe(true);
    await expect.poll(() => carried(page)).toBe(0);
    // The most the kid can carry is 10: three more for the knights, then.
    await readState(page, 'flushSave');
    await kvPut(page, 'lavakip', { bought: true, spot: null, carried: 3 });
    await page.reload();
    await openApp(page);
    for (const k of knights) expect(await readState(page, 'feedLavakip', 'knight', k)).toBe(true);
    expect((await feedState(page)).fed).toBe(3);
    await expect.poll(() => carried(page)).toBe(0);
    expect(await readState<number>(page, 'points')).toBe(points);
    expect(await readState<unknown[]>(page, 'ledgerLog')).toHaveLength(ledger.length);
    const keysAfter = await savedKeys(page);
    expect(keysAfter).toEqual(keysBefore);
    expect(JSON.stringify(await readState(page, 'knights'))).not.toContain('snack');
    expect(JSON.stringify(await readState(page, 'dinos'))).not.toContain('"snack":{');
  });
});
