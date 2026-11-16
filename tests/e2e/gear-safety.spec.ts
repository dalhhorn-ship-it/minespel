// Gear safety (V19e, AC268): no network beyond the app, every gear line is text whatever the sound does,
// and a session with buying, wearing and a fight leaves nothing odd behind. The strings and sound files are scanned
// in tests/unit/kid-safety.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

interface Monster { phase: string; klodder: { pokers: number } | null }
interface GearState { owned: string[]; knights: { id: string; worn: Record<string, string> }[] }

/** Counts every sound node the page makes, so a test can tell silence from sound. */
async function countAudio(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, { prototype: Record<string, (...a: unknown[]) => unknown> } | undefined> & { __nodes: number };
    w.__nodes = 0;
    for (const name of ['AudioContext', 'webkitAudioContext']) {
      const C = w[name];
      if (!C) continue;
      for (const fn of ['createOscillator', 'createBufferSource']) {
        const real = C.prototype[fn];
        if (typeof real !== 'function') continue;
        C.prototype[fn] = function (this: unknown, ...a: unknown[]) {
          w.__nodes++;
          return real.apply(this, a);
        };
      }
    }
  });
}
const nodes = (page: Page) => page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
const unlockAudio = (page: Page) =>
  page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, pointerType: 'touch', bubbles: true })));

async function setting(page: Page, change: (page: Page) => Promise<void>) {
  await setupPin(page);
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
  await page.locator('.parent-settings').waitFor();
  await change(page);
  await page.locator('.parent-close-btn').tap();
  await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
}

/** Two knights, one in gear with the Kietelveer; Klodder comes and is sent off. */
async function fight(page: Page) {
  await readState(page, 'setCreatureSeed', 4);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  const a = (await readState<string>(page, 'addKnight', 'guard'))!;
  await readState(page, 'addKnight', 'guard');
  await readState(page, 'setPoints', 500);
  for (const id of ['leren-kap', 'kietelveer', 'houten-schild', 'pony'])
    expect(await readState<boolean>(page, 'buyGearInShop', id)).toBe(true);
  expect(await readState<boolean>(page, 'wearGear', a, 'leren-kap')).toBe(true);
  expect(await readState<boolean>(page, 'wearGear', a, 'kietelveer')).toBe(true);
  expect(await readState<boolean>(page, 'wearGear', a, 'houten-schild')).toBe(true);
  expect(await readState<boolean>(page, 'wearGear', a, 'pony')).toBe(true);
  expect(await readState(page, 'spawnKlodder')).toBeTruthy();
  for (let i = 0; i < 80; i++) {
    await readState(page, 'fastForward', 1000);
    if ((await readState<Monster>(page, 'monsterState')).phase === 'idle') break;
  }
  expect((await readState<Monster>(page, 'monsterState')).phase).toBe('idle');
}

/** The gear lines of the shop: a greyed card says how many points are missing, a bought one says where it is. */
async function gearLines(page: Page, note: RegExp = /Nog \d+ punt(en)? nodig|In je wapenkast|Koop eerst een ridder/) {
  await readState(page, 'openShop');
  await expect(page.locator('[data-testid="shop-gear"]')).toBeVisible();
  await expect(page.locator('[data-testid="shop-note-gear-pony"]')).toHaveText(note);
  await expect(page.locator('[data-testid="shop-gear-leren-kap"] .shop-card-name')).toHaveText('Leren kap');
  await page.locator('.shop-close-btn').tap();
  await expect(page.locator('[data-testid="shop-gear"]')).toBeHidden();
}

test.describe('Gear safety (V19e, AC268)', () => {
  test('AC268: a full session with buying, wearing and a fight makes no request beyond the app files', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
      if (new URL(u).origin !== origin) outside.push(u);
    });
    await openApp(page);
    await readState(page, 'setPoints', 0);
    await gearLines(page);
    await fight(page);
    const g = await readState<GearState>(page, 'gearState');
    expect(g.owned).toHaveLength(4);
    expect(g.knights[0]!.worn).toMatchObject({ hoofd: 'leren-kap', rijdier: 'pony' });
    expect(await readState(page, 'points')).toBe(500 - 10 - 20 - 10 - 50);
    expect(outside).toEqual([]);
  });

  test('AC268: the control, a fight in gear does make sound by default', async ({ page }) => {
    await countAudio(page);
    await openApp(page);
    await unlockAudio(page);
    await fight(page);
    expect(await nodes(page)).toBeGreaterThan(0);
  });

  test('AC268: with Geluidseffecten uit every gear line still shows as text and no sound plays', async ({ page }) => {
    await countAudio(page);
    await openApp(page);
    await setting(page, async (p) => {
      await p.locator('.parent-settings button[aria-label="Geluidseffecten"]').tap();
      await expect(p.locator('.parent-settings button[aria-label="Geluidseffecten"]')).toHaveText('Uit');
    });
    await unlockAudio(page);
    await readState(page, 'setPoints', 0);
    await gearLines(page);
    await fight(page);
    await gearLines(page, /^In je wapenkast$/);
    expect(await nodes(page)).toBe(0);
  });

  test('AC268: with Volume 0 every gear line still shows as text and no sound plays', async ({ page }) => {
    await countAudio(page);
    await openApp(page);
    await setting(page, async (p) => {
      await p.locator('[data-testid="volume-setting"]').evaluate((el: HTMLInputElement) => {
        el.value = '0';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await expect(p.locator('[data-testid="volume-value"]')).toHaveText('0');
    });
    await unlockAudio(page);
    await readState(page, 'setPoints', 0);
    await gearLines(page);
    await fight(page);
    await gearLines(page, /^In je wapenkast$/);
    expect(await nodes(page)).toBe(0);
  });
});
