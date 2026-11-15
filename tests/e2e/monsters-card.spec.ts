// The parent card "Monsters en ridders" (V17c, AC208).
import { expect, test, type Page } from '@playwright/test';
import v060 from '../fixtures/backups/v060-no-monsters.json' with { type: 'json' };
import pkg from '../../package.json' with { type: 'json' };
import { WAARSCHUWSTEEN } from '../../src/world/blocks';
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

const HELP_MASTER = 'Zet alles hieronder in één keer aan of uit.';
const HELP_KNIGHTS = 'Ridders koop je in de Dinowinkel. Ze volgen, wachten of passen op de dieren.';

async function openSettings(page: Page) {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
  await page.locator('.parent-settings').waitFor();
}
async function closeParent(page: Page) {
  await page.locator('.parent-close-btn').tap();
  await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
}
const toggle = (page: Page, id: string) => page.locator(`[data-testid="${id}-toggle"]`);

test.describe('Monsters en ridders card (V17c)', () => {
  test('AC208: a new install shows both rows Aan with their exact help lines and 44 point targets', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    const card = page.locator('[data-testid="monsters-card"]');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toContainText('Monsters en ridders');
    await expect(page.locator('[data-testid="monsters-master"] .parent-switch-help')).toHaveText(HELP_MASTER);
    await expect(page.locator('[data-testid="monsters-knights"] .parent-switch-help')).toHaveText(HELP_KNIGHTS);
    for (const id of ['monsters-master', 'monsters-knights']) {
      await expect(toggle(page, id)).toHaveText('Aan');
      const box = (await toggle(page, id).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('AC208: Ridders off hides knights and the shop section, on again brings both back with their modes', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'addKnight', 'follow');
    await readState(page, 'addKnight', 'stay');
    const modes = (await readState<{ mode: string }[]>(page, 'knights')).map((k) => k.mode);
    expect(modes).toEqual(['follow', 'stay']);

    await openSettings(page);
    await toggle(page, 'monsters-knights').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-knights').tap();
    await expect(toggle(page, 'monsters-knights')).toHaveText('Uit');
    await closeParent(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-knights"]')).toHaveCount(0);
    await page.locator('.shop-close-btn').tap();

    await openSettings(page);
    await toggle(page, 'monsters-knights').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-knights').tap();
    await closeParent(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-knights"]')).toBeVisible();
    await page.locator('.shop-close-btn').tap();
    expect((await readState<{ mode: string }[]>(page, 'knights')).map((k) => k.mode)).toEqual(modes);
  });

  test('AC208: the master off greys the Ridders row, keeps its value and hides the shop section', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    await toggle(page, 'monsters-master').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-master').tap();
    await expect(toggle(page, 'monsters-master')).toHaveText('Uit');
    await expect(page.locator('[data-testid="monsters-knights"]')).toHaveAttribute('data-greyed', 'true');
    await expect(toggle(page, 'monsters-knights')).toHaveText('Aan');
    await closeParent(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-knights"]')).toHaveCount(0);
  });

  test('AC208: an existing install (settings without the switches) reads master and Ridders as Aan', async ({ page }) => {
    // The 0.6.0 backup has no switches in its settings, like a restored backup from before 0.7.0.
    expect((v060 as { kv?: { settings?: Record<string, unknown> } }).kv?.settings?.knightsEnabled).toBeUndefined();
    await openApp(page);
    await setupPin(page);
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('dino-blokwereld');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('kv', 'readwrite');
            const store = tx.objectStore('kv');
            const get = store.get('settings');
            get.onsuccess = () => {
              const rest = { ...(get.result ?? {}) };
              delete rest.monstersEnabled;
              delete rest.knightsEnabled;
              store.put(rest, 'settings');
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await openApp(page);
    await openSettings(page);
    await expect(toggle(page, 'monsters-master')).toHaveText('Aan');
    await expect(toggle(page, 'monsters-knights')).toHaveText('Aan');
  });
});

const HELP_BUBBLE =
  'Na 10 minuten spelen komt soms een bubbel. Tikt je kind erop, dan sloopt Klodder een paar blokken tot een ridder hem wegstuurt. Alles komt terug.';

test.describe('Zwarte bubbel row (V18e, AC223)', () => {
  test('AC223: a new install shows the row Aan with its exact help line', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    await toggle(page, 'monsters-bubble').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="monsters-bubble"] .parent-switch-help').first()).toHaveText(HELP_BUBBLE);
    await expect(toggle(page, 'monsters-bubble')).toHaveText('Aan');
    const box = (await toggle(page, 'monsters-bubble').boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('AC223: Ridders off greys the row with its note and keeps its value, and no bubble comes', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'addKnight', 'stay');
    await openSettings(page);
    await toggle(page, 'monsters-knights').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-knights').tap();
    await expect(page.locator('[data-testid="monsters-bubble"]')).toHaveAttribute('data-greyed', 'true');
    await expect(page.locator('[data-testid="monsters-bubble-note"]')).toHaveText('Werkt alleen met Ridders aan');
    await expect(toggle(page, 'monsters-bubble')).toHaveText('Aan');
    await closeParent(page);
    // The world reads the switches again a moment after the screen goes back to the world (an async read). While the
    // knight still counts, the bubble clock moves with play time, so wait until it stands still: that is the switch
    // taking effect, however slow the machine is. Then the clock starts again from 0.
    await readState(page, 'resetPlayTimer', 600);
    await expect
      .poll(async () => {
        const before = await readState<number>(page, 'bubbleClockMs');
        await readState(page, 'fastForward', 1000);
        return (await readState<number>(page, 'bubbleClockMs')) - before;
      })
      .toBe(0);
    await readState(page, 'setBubbleClockMs', 0);
    await readState(page, 'fastForward', 700_000);
    expect((await readState<{ phase: string }>(page, 'monsterState')).phase).toBe('idle');
    expect(await readState(page, 'bubbleClockMs')).toBe(0);
  });

  test('AC223: switching the bubble off with Klodder out removes him and every block is back', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setCreatureSeed', 5);
    await readState(page, 'resetPlayTimer', 600);
    await readState(page, 'addKnight', 'stay');
    await readState(page, 'spawnKlodder');
    await readState(page, 'fastForward', 20_000);
    await openSettings(page);
    await toggle(page, 'monsters-bubble').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-bubble').tap();
    await expect(toggle(page, 'monsters-bubble')).toHaveText('Uit');
    await closeParent(page);
    await expect.poll(async () => (await readState<{ phase: string }>(page, 'monsterState')).phase).toBe('idle');
    await readState(page, 'fastForward', 2000);
    expect((await readState<{ hiddenCount: number }>(page, 'monsterState')).hiddenCount).toBe(0);
  });

  test('AC223: an existing install (a world record, no monsters record) has the row Uit and the clock does not move', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'markWorldDirty');
    await readState(page, 'flushSave');
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('dino-blokwereld');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('kv', 'readwrite');
            const store = tx.objectStore('kv');
            store.delete('monsters');
            const get = store.get('settings');
            get.onsuccess = () => {
              const rest = { ...(get.result ?? {}) };
              delete rest.bubbleEnabled;
              store.put(rest, 'settings');
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await openApp(page);
    await readState(page, 'addKnight', 'stay');
    await openSettings(page);
    await toggle(page, 'monsters-bubble').scrollIntoViewIfNeeded();
    await expect(toggle(page, 'monsters-bubble')).toHaveText('Uit');
    await closeParent(page);
    await readState(page, 'resetPlayTimer', 600);
    await readState(page, 'fastForward', 700_000);
    expect(await readState(page, 'bubbleClockMs')).toBe(0);
    expect((await readState<{ phase: string }>(page, 'monsterState')).phase).toBe('idle');
  });
});

const HELP_MOLE = 'Wie onder de gestreepte laag graaft, maakt de Monstermol wakker. Een hek of een ridder stopt hem.';

declare global {
  interface Window {
    __shared?: { name: string; text: string }[];
  }
}
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
  await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
  await page.locator('.parent-import-export').waitFor();
}
async function makeBackup(page: Page): Promise<{ name: string; text: string }> {
  const before = await page.evaluate(() => window.__shared!.length);
  await page.locator('[data-testid="backup-make"]').tap();
  await page.waitForFunction((n) => window.__shared!.length > n, before);
  const files = await page.evaluate(() => window.__shared!);
  return files[files.length - 1]!;
}
const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;
async function restore(page: Page, text: string, expected: string) {
  await openExport(page);
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-testid="backup-restore"]').tap();
  await (await chooser).setFiles({ name: 'dino.json', mimeType: 'application/json', buffer: nodeBuffer.from(text) as never });
  await page.locator('[data-testid="restore-yes"]').tap();
  // The page reloads: wait until the saved settings answer with the restored value.
  await expect
    .poll(() =>
      page
        .evaluate(
          () =>
            new Promise<string>((resolve) => {
              const open = indexedDB.open('dino-blokwereld');
              open.onerror = () => resolve('error');
              open.onsuccess = () => {
                const get = open.result.transaction('kv').objectStore('kv').get('settings');
                get.onsuccess = () => resolve(String((get.result as { moleEnabled?: boolean } | undefined)?.moleEnabled));
                get.onerror = () => resolve('error');
              };
            }),
        )
        .catch(() => 'reloading'),
    )
    .toBe(expected);
  await openApp(page);
}
async function switchMole(page: Page, id: string) {
  await openSettings(page);
  await toggle(page, id).scrollIntoViewIfNeeded();
  await toggle(page, id).tap();
}
/** Back in the world, with a moment for the world to read the switches again. */
async function backToWorld(page: Page) {
  await closeParent(page);
  await expect.poll(() => readState<boolean>(page, 'isPlayRunning')).toBe(true);
  await page.waitForTimeout(800);
}
async function digColumn(page: Page) {
  const pose = await readState<{ x: number; z: number }>(page, 'player');
  return { x: Math.floor(pose.x) + 4, z: Math.floor(pose.z) };
}
const phase = async (page: Page) => (await readState<{ phase: string }>(page, 'moleState')).phase;

test.describe('Monstermol row (V16c, AC254)', () => {
  test('AC254: a new install shows the row Aan with its exact help line and a 44 point target', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    await toggle(page, 'monsters-mole').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="monsters-mole"] .parent-switch-help').first()).toHaveText(HELP_MOLE);
    await expect(toggle(page, 'monsters-mole')).toHaveText('Aan');
    const box = (await toggle(page, 'monsters-mole').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('AC254: the master off greys the row and keeps its value', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    await toggle(page, 'monsters-master').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-master').tap();
    await expect(page.locator('[data-testid="monsters-mole"]')).toHaveAttribute('data-greyed', 'true');
    await expect(toggle(page, 'monsters-mole')).toHaveText('Aan');
  });

  test('AC254: an existing install and a restored 0.8.0 backup (no mole switch) read Aan, a 0.9.0 backup keeps Uit', async ({ page }) => {
    await stubShare(page);
    await openApp(page);
    await setupPin(page);
    // A 0.9.0 backup with the row Uit holds the value.
    await switchMole(page, 'monsters-mole');
    await expect(toggle(page, 'monsters-mole')).toHaveText('Uit');
    await openExport(page);
    const off = await makeBackup(page);
    expect(pkg.version).toBeTruthy();
    expect((JSON.parse(off.text) as { kv: { settings: { moleEnabled?: boolean } } }).kv.settings.moleEnabled).toBe(false);
    // Switch on again, then restore the Uit backup: the value comes back.
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await toggle(page, 'monsters-mole').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-mole').tap();
    await expect(toggle(page, 'monsters-mole')).toHaveText('Aan');
    await restore(page, off.text, 'false');
    await openSettings(page);
    await toggle(page, 'monsters-mole').scrollIntoViewIfNeeded();
    await expect(toggle(page, 'monsters-mole')).toHaveText('Uit');
    // A backup from before 0.9.0 has no moleEnabled: restoring it gives Aan.
    const old = JSON.parse(off.text) as { kv: { settings: Record<string, unknown> } };
    delete old.kv.settings.moleEnabled;
    await restore(page, JSON.stringify(old), 'undefined');
    await openSettings(page);
    await toggle(page, 'monsters-mole').scrollIntoViewIfNeeded();
    await expect(toggle(page, 'monsters-mole')).toHaveText('Aan');
  });

  for (const which of ['monsters-mole', 'monsters-master']) {
    test(`AC254: with ${which} off, digging past the stripes gives no toast, card or mole`, async ({ page }) => {
      await openApp(page);
      await setupPin(page);
      await readState(page, 'setCreatureSeed', 5);
      await readState(page, 'resetPlayTimer', 600);
      await switchMole(page, which);
      await backToWorld(page);
      const c = await digColumn(page);
      expect(await readState(page, 'mineAt', c.x, 6, c.z)).toBe(true);
      await readState(page, 'setBlock', c.x, 5, c.z, WAARSCHUWSTEEN, 1);
      expect(await readState(page, 'mineAt', c.x, 5, c.z)).toBe(true);
      expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
      await readState(page, 'fastForward', 5000);
      await expect(page.locator('.speech-line')).toBeHidden();
      await expect(page.locator('[data-testid="mole-card"]')).toHaveCount(0);
      expect(await phase(page)).toBe('none');
    });
  }

  test('AC254: switching Monstermol off during a rumble and with the mole out leaves neither in the world', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setCreatureSeed', 5);
    await readState(page, 'resetPlayTimer', 600);
    const c = await digColumn(page);
    expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
    expect(await phase(page)).toBe('rumble');
    await switchMole(page, 'monsters-mole');
    await backToWorld(page);
    await readState(page, 'fastForward', 4000);
    expect(await phase(page)).toBe('none');
    // On again, a second dig brings the mole out, then off sends him down.
    await switchMole(page, 'monsters-mole');
    await backToWorld(page);
    expect(await readState(page, 'mineAt', c.x, 2, c.z)).toBe(true);
    await readState(page, 'fastForward', 3500);
    expect(await phase(page)).toBe('out');
    await switchMole(page, 'monsters-mole');
    await backToWorld(page);
    await readState(page, 'fastForward', 3000);
    expect(await phase(page)).toBe('none');
  });

  test('AC254: Ridders off and Monstermol on still wakes the mole', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setCreatureSeed', 5);
    await readState(page, 'resetPlayTimer', 600);
    await switchMole(page, 'monsters-knights');
    await backToWorld(page);
    const c = await digColumn(page);
    expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
    expect(await phase(page)).toBe('rumble');
  });
});
