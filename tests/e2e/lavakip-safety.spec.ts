// The feeding rules of 0.14.0 (V23c, AC317, AC319): feeding changes nothing but the 3 seconds, reduced motion has no
// dance and no puff, and a play session makes no request beyond the app's own files.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);
const TEN_MINUTES = 600_000;

interface Dino { id: string; mode: string; name: string }
interface Knight { id: string; mode: string; spot: { x: number; y: number; z: number } | null }
interface Feed { snacking: { kind: string; id: string }[]; fed: number }

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

/** A seeded start with the lavakip, 10 animals and 3 knights. */
async function arena(page: Page, carried: number) {
  await openApp(page);
  await kvPut(page, 'lavakip', { bought: true, spot: null, carried });
  await page.reload();
  await openApp(page);
  await readState(page, 'setCreatureSeed', 7);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  await flatten(page);
  for (let i = 0; i < 10; i++) await readState(page, 'addEgg', 'compy', false);
  await readState(page, 'stepDinos', 40);
  for (let i = 0; i < 3; i++) await readState(page, 'addKnight', i === 0 ? 'stay' : 'guard');
}


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

test.describe('Lavakip safety (V23c)', () => {
  test('AC317: a 10 minute run with 10 fed (the most carried) keeps every mode, name and knight spot as the run without', async ({ browser }) => {
    const runs: { dinos: Dino[]; knights: Knight[] }[] = [];
    for (const feed of [false, true]) {
      const ctx = await browser.newContext(test.info().project.use);
      const page = await ctx.newPage();
      await arena(page, 10);
      if (feed) {
        const dinos = (await readState<Dino[]>(page, 'dinos')).slice(0, 7);
        for (const d of dinos) expect(await readState(page, 'feedLavakip', 'dino', d.id)).toBe(true);
        for (const k of await readState<Knight[]>(page, 'knights')) expect(await readState(page, 'feedLavakip', 'knight', k.id)).toBe(true);
        expect((await readState<Feed>(page, 'feedState')).fed).toBe(10);
      }
      await readState(page, 'fastForward', TEN_MINUTES);
      await expect.poll(async () => (await readState<Feed>(page, 'feedState')).snacking).toEqual([]);
      runs.push({
        dinos: (await readState<Dino[]>(page, 'dinos')).map((d) => ({ id: d.id, mode: d.mode, name: d.name })),
        knights: (await readState<Knight[]>(page, 'knights')).map((k) => ({ id: k.id, mode: k.mode, spot: k.spot })),
      });
      await ctx.close();
    }
    const strip = (r: (typeof runs)[number]) => ({
      dinos: r.dinos.map((d) => [d.mode, d.name]),
      knights: r.knights.map((k) => [k.mode, k.spot]),
    });
    expect(strip(runs[1]!)).toEqual(strip(runs[0]!));
  });

  test('AC319: reduced motion has no puff and no dance, the words still show', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await arena(page, 1);
    const d = (await readState<Dino[]>(page, 'dinos'))[0]!;
    expect(await readState(page, 'feedLavakip', 'dino', d.id)).toBe(true);
    await faceDino(page, d.id);
    await expect(page.locator('.actor-label', { hasText: 'Hap! Lekker pittig!' })).toBeVisible();
    await expect(page.locator('.actor-label', { hasText: '\u{1F7E0}' })).toHaveCount(0);
  });

  test('AC319: a play session with feeding makes no request beyond the app', async ({ page, baseURL }) => {
    const outside: string[] = [];
    const origin = () => new URL(baseURL!).origin;
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
      if (new URL(u).origin !== origin()) outside.push(u);
    });
    await arena(page, 3);
    for (const d of (await readState<Dino[]>(page, 'dinos')).slice(0, 3)) await readState(page, 'feedLavakip', 'dino', d.id);
    await readState(page, 'fastForward', 30_000);
    expect(outside).toEqual([]);
  });
});
