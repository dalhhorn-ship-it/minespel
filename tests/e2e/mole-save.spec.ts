// The moles are saved (V22c, AC299, AC300, AC335): caught and free moles and an away mole with his time come back after a
// reload or a hard kill and a backup restore; a backup that holds too many moles or a bad away time is refused; the parent
// switch, "Wereld opnieuw beginnen" and Alles wissen leave none. Walls go up with the `setBlock` hook.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { killApp, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';
import { dig, hatch, mole, prepareMole } from './helpers/mole';

interface Entry { id: number; x: number; y: number; z: number; state: 'free' | 'away' | 'caught'; awayMsLeft: number }
const moles = async (page: Page) => (await readState<{ moles: Entry[] }>(page, 'moleState')).moles;

declare global {
  interface Window {
    __shared?: { name: string; text: string }[];
  }
}
// Playwright runs in Node; the project types do not include Node, so reach Buffer through globalThis.
const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;

async function stubShare(page: Page) {
  await page.addInitScript(() => {
    window.__shared = [];
    (navigator as unknown as { canShare: () => boolean }).canShare = () => true;
    (navigator as unknown as { share: (d: { files: File[] }) => Promise<void> }).share = async (d) => {
      for (const f of d.files) window.__shared!.push({ name: f.name, text: await f.text() });
    };
  });
}

async function openExport(page: Page) {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
  await page.locator('.parent-import-export').waitFor();
}

async function makeBackup(page: Page): Promise<string> {
  const before = await page.evaluate(() => window.__shared!.length);
  await page.locator('[data-testid="backup-make"]').tap();
  await page.waitForFunction((n) => window.__shared!.length > n, before);
  const files = await page.evaluate(() => window.__shared!);
  return files[files.length - 1]!.text;
}

async function pickRestore(page: Page, text: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-testid="backup-restore"]').tap();
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: nodeBuffer.from(text) as never });
}

/** Restores the file and waits for the reloaded game. */
async function restore(page: Page, text: string) {
  await pickRestore(page, text);
  await page.evaluate(() => { (window as unknown as { __beforeRestore?: boolean }).__beforeRestore = true; });
  await page.locator('[data-testid="restore-yes"]').tap();
  await page.waitForFunction(() => {
    const w = window as unknown as { __beforeRestore?: boolean; __dino?: { ready?: () => boolean } };
    return w.__beforeRestore === undefined && w.__dino?.ready?.() === true;
  }, undefined, { timeout: 20_000 });
}

async function pen(page: Page, a: { y: number; cx: number; cz: number }) {
  await page.evaluate(
    ({ a, stone }) => {
      const h = (window as unknown as { __dino: Record<string, (...v: number[]) => void> }).__dino;
      for (let x = a.cx - 7; x <= a.cx + 7; x++) {
        for (let z = a.cz - 7; z <= a.cz + 7; z++) {
          h.setBlock!(x, a.y - 1, z, stone, 1);
          for (let y = a.y; y < a.y + 6; y++) h.setBlock!(x, y, z, 0, 1);
        }
      }
      for (let x = a.cx - 2; x <= a.cx + 2; x++) {
        for (let z = a.cz - 2; z <= a.cz + 2; z++) {
          if (Math.max(Math.abs(x - a.cx), Math.abs(z - a.cz)) !== 2) continue;
          for (let y = a.y; y < a.y + 2; y++) h.setBlock!(x, y, z, stone, 1);
        }
      }
      h.rebuildWorld!();
    },
    { a, stone: STEEN },
  );
}

/** Digs `dx` columns from the kid, waits for the mole and puts him in a pen. Returns his entry. */
async function caughtMole(page: Page, dx: number): Promise<Entry> {
  await dig(page, dx);
  await readState(page, 'fastForward', 3500);
  const list = await moles(page);
  const m = list[list.length - 1] as Entry;
  expect(m.state).toBe('free');
  await readState(page, 'pauseGame');
  await pen(page, { y: Math.round(m.y), cx: Math.floor(m.x), cz: Math.floor(m.z) });
  await readState(page, 'resumeGame');
  for (let i = 0; i < 20; i++) {
    await readState(page, 'fastForward', 250);
    if ((await moles(page)).find((e) => e.id === m.id)?.state === 'caught') break;
  }
  const done = (await moles(page)).find((e) => e.id === m.id) as Entry;
  expect(done.state).toBe('caught');
  return done;
}

async function start(page: Page) {
  await stubShare(page);
  await openApp(page);
  await prepareMole(page, 5);
  await hatch(page, 2);
}

/** 2 caught moles and 1 free one. */
async function threeMoles(page: Page) {
  const a = await caughtMole(page, 2);
  const b = await caughtMole(page, 3);
  await dig(page, 4);
  await readState(page, 'fastForward', 3500);
  const list = await moles(page);
  expect(list.map((e) => e.state)).toEqual(['caught', 'caught', 'free']);
  return { a, b, free: list[2] as Entry };
}

const near = (p: Entry, q: Entry, d: number) => Math.hypot(p.x - q.x, p.z - q.z) <= d;

test.describe('De mollen worden bewaard (V22c)', () => {
  for (const how of ['reload', 'kill'] as const) {
    test(`AC299: ${how} with 2 caught moles and a free one brings the 3 back`, async ({ page }) => {
      await start(page);
      const { a, b } = await threeMoles(page);
      await readState(page, 'fastForward', 5000);
      const free = (await moles(page))[2] as Entry;
      await readState(page, 'flushSave');
      let next: Page = page;
      if (how === 'reload') {
        await page.reload();
        await openApp(page);
      } else next = await killApp(page);
      const list = await moles(next);
      expect(list.map((e) => e.state)).toEqual(['caught', 'caught', 'free']);
      expect(near(list[0] as Entry, a, 0.05)).toBe(true);
      expect(near(list[1] as Entry, b, 0.05)).toBe(true);
      expect(near(list[2] as Entry, free, 2)).toBe(true);
      // The caught ones sleep on after the start: the pen is checked again and still holds.
      await readState(next, 'fastForward', 5000);
      expect((await moles(next)).slice(0, 2).map((e) => e.state)).toEqual(['caught', 'caught']);
    });
  }

  test('AC299: a rumble at the kill leaves no mole', async ({ page }) => {
    await start(page);
    await dig(page, 2);
    expect((await mole(page)).phase).toBe('rumble');
    await readState(page, 'flushSave');
    const next = await killApp(page);
    expect(await moles(next)).toEqual([]);
  });

  for (const how of ['reload', 'kill'] as const) {
    test(`AC335: ${how} while he is away keeps him away with his time left, and he comes back`, async ({ page }) => {
      await start(page);
      await dig(page, 2);
      await readState(page, 'fastForward', 3500);
      expect(await readState(page, 'sendMoleAway', 45_000)).toBe(true);
      await readState(page, 'fastForward', 6000);
      const left = (await moles(page))[0]?.awayMsLeft as number;
      expect(left).toBeGreaterThan(30_000);
      await readState(page, 'flushSave');
      let next: Page = page;
      if (how === 'reload') {
        await page.reload();
        await openApp(page);
      } else next = await killApp(page);
      const [m] = await moles(next);
      expect(m?.state).toBe('away');
      expect(Math.abs((m as Entry).awayMsLeft - left)).toBeLessThanOrEqual(5000);
      await readState(next, 'fastForward', (m as Entry).awayMsLeft + 4000);
      expect((await moles(next))[0]?.state).toBe('free');
    });
  }

  test('AC299 AC335: a backup holds the moles and restores them, and refuses 5 moles, 2 free moles and bad away times', async ({ page }) => {
    await start(page);
    await setupPin(page);
    await caughtMole(page, 2);
    await dig(page, 3);
    await readState(page, 'fastForward', 3500);
    expect(await readState(page, 'sendMoleAway', 40_000)).toBe(true);
    await readState(page, 'fastForward', 2500);
    await readState(page, 'flushSave');
    await openExport(page);
    const text = await makeBackup(page);
    const file = JSON.parse(text) as { format: number; kv: { monsters: { moles: Array<Record<string, unknown>> } } };
    expect(file.format).toBeGreaterThanOrEqual(6);
    expect(file.kv.monsters.moles.map((m) => m.state)).toEqual(['caught', 'away']);

    // Refusals: the plain message and nothing changes.
    const caught = file.kv.monsters.moles[0] as Record<string, unknown>;
    const away = file.kv.monsters.moles[1] as Record<string, unknown>;
    const bad: Array<Array<Record<string, unknown>>> = [
      [caught, caught, caught, caught, caught],
      [{ ...away }, { ...away, x: 5 }],
      [{ ...away, awayMs: 91_000 }],
      [{ ...away, awayMs: -1 }],
      [{ x: 99999, y: 12, z: 5, state: 'caught' }],
    ];
    for (const moles of bad) {
      const changed = { ...file, kv: { ...file.kv, monsters: { ...file.kv.monsters, moles } } };
      await pickRestore(page, JSON.stringify(changed));
      await expect(page.locator('[data-testid="backup-message"]')).toContainText('niets veranderd');
      await expect(page.locator('[data-testid="restore-confirm"]')).toHaveCount(0);
    }
    // The good file restores: the caught mole and the away mole with his time.
    await restore(page, text);
    const list = await moles(page);
    expect(list.map((e) => e.state)).toEqual(['caught', 'away']);
    expect(list[1]?.awayMsLeft).toBeGreaterThan(30_000);
    expect(list[1]?.awayMsLeft).toBeLessThanOrEqual(40_000);
    await readState(page, 'fastForward', (list[1] as Entry).awayMsLeft + 4000);
    expect((await moles(page)).map((e) => e.state)).toEqual(['caught', 'free']);
  });

  test('AC300 AC335: the Monstermol switch off leaves no mole, not even an away one, and on again shows none until he is dug up', async ({ page }) => {
    await start(page);
    await setupPin(page);
    await caughtMole(page, 2);
    await dig(page, 3);
    await readState(page, 'fastForward', 3500);
    expect(await readState(page, 'sendMoleAway', 60_000)).toBe(true);
    await readState(page, 'fastForward', 2000);
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await page.locator('.parent-settings').waitFor();
    const toggle = page.locator('[data-testid="monsters-mole-toggle"]');
    await toggle.scrollIntoViewIfNeeded();
    await toggle.tap();
    await expect(toggle).toHaveText('Uit');
    await page.locator('.parent-close-btn').tap();
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
    // Back on the world screen the game reads the switches again, a moment later. Wait for that, then play on.
    await expect.poll(async () => (await moles(page)).length).toBe(0);
    await readState(page, 'fastForward', 3000);
    expect(await moles(page)).toEqual([]);
    await readState(page, 'flushSave');
    const next = await killApp(page);
    expect(await moles(next)).toEqual([]);
    // On again: no mole shows until the kid digs below the stripes.
    await loginAsParent(next);
    await next.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await next.locator('.parent-settings').waitFor();
    const again = next.locator('[data-testid="monsters-mole-toggle"]');
    await again.scrollIntoViewIfNeeded();
    await again.tap();
    await expect(again).toHaveText('Aan');
    await next.locator('.parent-close-btn').tap();
    await expect.poll(() => readState<string>(next, 'currentScreen')).toBe('world');
    await readState(next, 'fastForward', 5000);
    expect(await moles(next)).toEqual([]);
  });

  test('AC300: Wereld opnieuw beginnen leaves no caught mole, also after a kill', async ({ page }) => {
    await start(page);
    await setupPin(page);
    await caughtMole(page, 2);
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await page.locator('.parent-settings').waitFor();
    for (const name of ['Wereld opnieuw beginnen', /Ja, maak een nieuwe wereld/]) {
      const b = page.locator('.parent-settings button', { hasText: name }).first();
      await b.scrollIntoViewIfNeeded();
      await b.tap();
    }
    await expect.poll(async () => (await moles(page)).length).toBe(0);
    await page.locator('.parent-close-btn').tap().catch(() => undefined);
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
    await readState(page, 'flushSave');
    const next = await killApp(page);
    expect(await moles(next)).toEqual([]);
  });
});
