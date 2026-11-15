import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

// Dinos stay by default and Allemaal vrij (decision 122). Real finger taps on the iPad profile.

interface DinoRow {
  id: string;
  mode: string;
  x: number;
  z: number;
  stayX: number;
  stayZ: number;
}

async function fingerTap(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector);
  await loc.waitFor({ state: 'visible' });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Dinos stay by default (decision 122)', () => {
  test('a new dino stays put and the button Allemaal vrij shows only while one follows', async ({ page }) => {
    await openApp(page);
    const stay = page.locator('[data-testid="hud-stay"]');
    await expect(stay).toBeHidden();

    await readState(page, 'addEgg', 'compy', false);
    await readState(page, 'addEgg', 'compy', false);
    await readState(page, 'stepDinos', 6);
    const dinos = await readState<DinoRow[]>(page, 'dinos');
    expect(dinos).toHaveLength(2);
    expect(dinos.map((d) => d.mode)).toEqual(['stay', 'stay']);
    await readState(page, 'stepDinos', 0.1);
    await expect(stay).toBeHidden();

    // Walk far away: a stay dino roams, but within about 12 blocks of its spot (decision 128).
    const [a, b] = dinos as [DinoRow, DinoRow];
    await readState(page, 'placePlayer', 50.5, 15, 50.5, 0);
    await readState(page, 'stepDinos', 15);
    const far = await readState<DinoRow[]>(page, 'dinos');
    expect(Math.hypot(far[0]!.x - a.x, far[0]!.z - a.z)).toBeLessThan(13);

    // Volg mij on both: the button shows, is a big target, and one tap stops them all.
    await readState(page, 'setDinoMode', a.id, 'follow');
    await readState(page, 'setDinoMode', b.id, 'follow');
    await readState(page, 'stepDinos', 0.1);
    await expect(stay).toBeVisible();
    await expect(stay).toContainText('Allemaal vrij');
    const box = (await stay.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(56);
    expect(box.height).toBeGreaterThanOrEqual(56);

    await fingerTap(page, '[data-testid="hud-stay"]');
    const after = await readState<DinoRow[]>(page, 'dinos');
    expect(after.map((d) => d.mode)).toEqual(['stay', 'stay']);
    // The game loop keeps running between the tap and this read, so the dino may have moved a frame or
    // two (up to about 0.2 block). The exact spot is asserted in src/dinos/dino-stay.test.ts.
    expect(Math.hypot(after[0]!.stayX - after[0]!.x, after[0]!.stayZ - after[0]!.z)).toBeLessThan(0.5);
    await readState(page, 'stepDinos', 0.1);
    await expect(stay).toBeHidden();
    expect(await readState<string>(page, 'currentScreen')).toBe('world');

    // Saved right away: still on Blijf hier after a reload. The write starts in the tap itself, but
    // IndexedDB commits it a few ms later; a reload in that gap aborts it, which no kid is fast enough
    // to do. So wait until the saved record reads stay, then reload (never weaker than before).
    await page.waitForFunction(
      () =>
        new Promise<boolean>((resolve) => {
          const open = indexedDB.open('dino-blokwereld');
          open.onerror = () => resolve(false);
          open.onsuccess = () => {
            const db = open.result;
            const get = db.transaction('kv', 'readonly').objectStore('kv').get('dinos');
            get.onerror = () => {
              db.close();
              resolve(false);
            };
            get.onsuccess = () => {
              db.close();
              const rec = get.result as { dinos?: { mode: string }[] } | undefined;
              const dinos = rec?.dinos ?? [];
              resolve(dinos.length === 2 && dinos.every((d) => d.mode === 'stay'));
            };
          };
        }),
    );
    await page.reload();
    await openApp(page);
    const reloaded = await readState<DinoRow[]>(page, 'dinos');
    expect(reloaded.map((d) => d.mode)).toEqual(['stay', 'stay']);
  });
});
