import { expect, test, type Page } from '@playwright/test';
import { STEEN, RARE_BLOCKS } from '../../src/world/blocks';
import {
  CURRENT_TERRAIN_VERSION, START_SPOT, WORLD_HEIGHT, WORLD_SEED, cellIndex, generateTerrain,
} from '../../src/world/terrain';
import { VILLAGE_SITES, siteRegion } from '../../src/world/village-layout';
import { killApp, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';
import {
  SEEN_ANSWER, SEEN_ITEM_ID, bubble, buildState, cardState, fingerTap, fingerTapText, getKv, openCardAt,
  openForVillage, putKv, shirtPixels, standNear, typeNumber, villageState, villagers, waitBubble, walkFarAway,
  type VillagerInfo,
} from './helpers/dorp';

// Release v11 Dorp (0.5.0), AC178 to AC191, played with real finger taps (page.touchscreen.tap).
// The pure rules have unit tests; these specs prove what needs a real browser: seeing, tapping, screens, saves.
// AC190 (fps on the oldest iPad) is a founder check on the real iPad, listed in docs/TEST_REPORT.md.
// AC191 (version and changelog) is checked in tests/unit/release-v11.test.ts.

const DANCE = 'Kijk, een dansje!';
const RESPECT = 'Respect bruuuuu!';
const ASK = 'Hoi! Wil je een vraag?';

const say = (page: Page) => page.locator('[data-testid="village-say"]').innerText();

/** Answers the open card with the right sum. */
async function answerRight(page: Page): Promise<void> {
  await typeNumber(page, SEEN_ANSWER);
  await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('right');
}

async function answerWrong(page: Page): Promise<void> {
  await typeNumber(page, SEEN_ANSWER - 1);
}

async function points(page: Page): Promise<number> {
  return readState<number>(page, 'points');
}

async function progressBox(page: Page): Promise<number | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<number | undefined>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('progress', 'readonly').objectStore('progress').get(key);
          get.onsuccess = () => {
            db.close();
            resolve((get.result as { box?: number } | undefined)?.box);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    `rekenen-basis|${SEEN_ITEM_ID}`,
  );
}

/** The two villagers that are far from each other: the first of the first site and the first of the last site. */
async function twoFarVillagers(page: Page): Promise<[VillagerInfo, VillagerInfo]> {
  const list = await villagers(page);
  const first = list[0] as VillagerInfo;
  const last = list[list.length - 1] as VillagerInfo;
  expect(first.site).not.toBe(last.site);
  return [first, last];
}

// ---------------------------------------------------------------- the villages (AC178, AC179, AC180)

test.describe('villages and villagers', () => {
  test('AC178: three villages with houses stand in a new world, far from the start spot', async ({ page }) => {
    await openApp(page);
    const sites = await readState<Array<{ id: string; hasHouses: boolean; houseCells: Array<{ x: number; y: number; z: number; id: number }> }>>(page, 'villageSites');
    expect(sites).toHaveLength(3);
    for (const s of sites) {
      expect(s.hasHouses).toBe(true);
      expect(s.houseCells.length).toBeGreaterThan(0);
      // The houses are really in the world the kid sees.
      const first = s.houseCells[0]!;
      expect(await readState<number>(page, 'blockAt', first.x, first.y, first.z)).toBe(first.id);
      for (const c of s.houseCells) {
        expect(Math.hypot(c.x + 0.5 - START_SPOT.x, c.z + 0.5 - START_SPOT.z)).toBeGreaterThan(10);
      }
    }
    expect(await readState<number>(page, 'terrainVersion')).toBe(CURRENT_TERRAIN_VERSION);
    // A picture of the first village for the report: stand a few blocks south of its houses and look north to south.
    const home = (await villagers(page))[0]!;
    await standNear(page, home.id, 7);
    const f = await readState<number>(page, 'frameCount');
    await expect.poll(() => readState<number>(page, 'frameCount')).toBeGreaterThan(f + 3);
    await page.screenshot({ path: 'test-results/screenshots/v11/village.png' });
  });

  test('AC178: a house block can be mined like any block', async ({ page }) => {
    await openApp(page);
    const [site] = await readState<Array<{ houseCells: Array<{ x: number; y: number; z: number; id: number }> }>>(page, 'villageSites');
    const c = site!.houseCells[0]!;
    expect(await readState<number>(page, 'blockAt', c.x, c.y, c.z)).not.toBe(0);
    await page.evaluate(({ c }) => (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.setBlock!(c.x, c.y, c.z, 0), { c });
    expect(await readState<number>(page, 'blockAt', c.x, c.y, c.z)).toBe(0);
  });

  test('AC180: 8 villagers (3, 3 and 2) wander near home, never inside a block, never move the player', async ({ page }) => {
    await openApp(page);
    const before = await villagers(page);
    expect(before).toHaveLength(8);
    expect(before.map((v) => v.site).reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {})).toEqual(
      Object.fromEntries(VILLAGE_SITES.map((s) => [s.id, s.homes.length])),
    );
    expect(new Set(before.map((v) => v.shirt)).size).toBe(8);
    await readState(page, 'pauseGame');
    const player0 = await readState<{ x: number; y: number; z: number }>(page, 'player');
    let moved = false;
    for (let i = 0; i < 40; i++) {
      await readState(page, 'stepVillagers', 0.5);
      const now = await villagers(page);
      for (const v of now) {
        const home = before.find((b) => b.id === v.id)!.home;
        expect(Math.hypot(v.position.x - home.x, v.position.z - home.z)).toBeLessThanOrEqual(3);
        const inside = await readState<number>(page, 'blockAt', Math.floor(v.position.x), Math.floor(v.position.y + 0.5), Math.floor(v.position.z));
        expect(inside).toBe(0);
        const b0 = before.find((b) => b.id === v.id)!;
        if (Math.abs(v.position.x - b0.position.x) + Math.abs(v.position.z - b0.position.z) > 0.2) moved = true;
      }
    }
    expect(moved).toBe(true);
    expect(await readState(page, 'player')).toEqual(player0);
  });

  test('AC180: villagers are drawn in the world: their shirt colour shows when looking at them and not when looking away', async ({ page }) => {
    await openApp(page);
    expect(await readState<boolean>(page, 'usesRealRenderer')).toBe(true);
    const v = (await villagers(page))[0]!;
    await expect.poll(() => readState<number>(page, 'frameCount')).toBeGreaterThan(5);
    await standNear(page, v.id, 3.5);
    const frameAfter = async () => {
      const f = await readState<number>(page, 'frameCount');
      await expect.poll(() => readState<number>(page, 'frameCount')).toBeGreaterThan(f + 2);
    };
    await frameAfter();
    const { w, h } = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    const clip = { x: Math.floor(w / 2 - 150), y: Math.floor(h / 2 - 200), width: 300, height: 400 };
    const looking = await shirtPixels(page, await page.screenshot({ clip }), v.shirt);
    await page.screenshot({ path: 'test-results/screenshots/v11/village-villager.png' });
    // Turn around: the same part of the picture shows the other way.
    await page.evaluate(
      ({ x, y, z }) => (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.placePlayer!(x, y, z, Math.PI),
      { x: v.position.x, y: v.position.y + 0.2, z: v.position.z - 3.5 },
    );
    await frameAfter();
    const away = await shirtPixels(page, await page.screenshot({ clip }), v.shirt);
    expect(looking).toBeGreaterThan(30);
    expect(looking).toBeGreaterThan(away * 3);
  });
});

// ---------------------------------------------------------------- an old 0.4.0 save (AC179)

test.describe('an old 0.4.0 save', () => {
  /** The ground height of terrain version 1 at one column. */
  function groundTop(x: number, z: number): number {
    const t = generateTerrain(WORLD_SEED, 1);
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) if ((t[cellIndex(x, y, z)] ?? 0) !== 0) return y;
    return 0;
  }

  /** A cell the kid built just above the ground, as a version 1 diff entry. */
  function kidCell(x: number, z: number): { x: number; y: number; z: number; entry: number } {
    const y = groundTop(x, z) + 1;
    return { x, y, z, entry: cellIndex(x, y, z) * 256 + STEEN };
  }

  async function openWithOldSave(page: Page, cells: Array<{ entry: number }>, player?: { x: number; y: number; z: number }): Promise<void> {
    await openApp(page);
    // Stops the save queue first, so the new world record cannot overwrite the old one we write now.
    await readState(page, 'simulateKill');
    await putKv(page, 'world', { diff: Uint32Array.from(cells.map((c) => c.entry)) });
    if (player) {
      await putKv(page, 'player', { ...player, yaw: 0, pitch: 0, hotbar: [], selectedSlot: 0, mode: 'mine' });
    }
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
  }

  async function siteHash(page: Page): Promise<number> {
    const regions = VILLAGE_SITES.map((s) => siteRegion(s));
    return page.evaluate(
      ({ regions, height }) => {
        const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
        let h = 17;
        for (const r of regions)
          for (let x = r.x0; x <= r.x1; x++)
            for (let z = r.z0; z <= r.z1; z++)
              for (let y = 0; y < height; y++) h = (Math.imul(h, 31) + hooks.blockAt!(x, y, z)) | 0;
        return h;
      },
      { regions, height: WORLD_HEIGHT },
    );
  }

  test('AC179: an untouched old world gets all three villages, and the old record is kept', async ({ page }) => {
    await openWithOldSave(page, []);
    expect(await readState<number>(page, 'terrainVersion')).toBe(CURRENT_TERRAIN_VERSION);
    expect(await readState<boolean>(page, 'hasWorldV1')).toBe(true);
    const sites = await readState<Array<{ hasHouses: boolean }>>(page, 'villageSites');
    expect(sites.map((s) => s.hasHouses)).toEqual([true, true, true]);
    expect(await villagers(page)).toHaveLength(8);
  });

  test('AC179: a site the kid changed keeps every cell, the other sites get houses, the second start changes nothing', async ({ page }) => {
    const r0 = siteRegion(VILLAGE_SITES[0]!);
    const mine = kidCell(r0.x0 + 2, r0.z0 + 2);
    const sx = Math.floor(START_SPOT.x);
    const sz = Math.floor(START_SPOT.z);
    const outside = kidCell(sx + 3, sz + 3);
    const player = { x: START_SPOT.x, y: groundTop(sx, sz) + 2, z: START_SPOT.z };
    await openWithOldSave(page, [mine, outside], player);

    // The cells the kid changed are exactly as before.
    expect(await readState<number>(page, 'blockAt', mine.x, mine.y, mine.z)).toBe(STEEN);
    expect(await readState<number>(page, 'blockAt', outside.x, outside.y, outside.z)).toBe(STEEN);
    // The changed site gets no house, the other two do.
    const sites = await readState<Array<{ hasHouses: boolean }>>(page, 'villageSites');
    expect(sites.map((s) => s.hasHouses)).toEqual([false, true, true]);
    // The player stands where they stood.
    const p = await readState<{ x: number; z: number }>(page, 'player');
    expect(p.x).toBeCloseTo(player.x, 0);
    expect(p.z).toBeCloseTo(player.z, 0);
    // The villagers of the changed site stand on the ground there (none inside a block).
    for (const v of (await villagers(page)).filter((x) => x.site === VILLAGE_SITES[0]!.id)) {
      expect(await readState<number>(page, 'blockAt', Math.floor(v.position.x), Math.floor(v.position.y + 0.5), Math.floor(v.position.z))).toBe(0);
    }

    // A second start: nothing changes. The upgrade must also have been saved.
    const hash = await siteHash(page);
    expect(await readState<number>(page, 'terrainVersion')).toBe(CURRENT_TERRAIN_VERSION);
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
    expect(await siteHash(page)).toBe(hash);
    expect(await readState<number>(page, 'blockAt', mine.x, mine.y, mine.z)).toBe(STEEN);
    expect(await readState<number>(page, 'blockAt', outside.x, outside.y, outside.z)).toBe(STEEN);
    expect(await readState<boolean>(page, 'hasWorldV1')).toBe(true);
  });

  test('AC179: changes in all three sites give no houses at all and every cell stays', async ({ page }) => {
    const cells = VILLAGE_SITES.map((s) => {
      const r = siteRegion(s);
      return kidCell(r.x0 + 1, r.z0 + 1);
    });
    await openWithOldSave(page, cells);
    const sites = await readState<Array<{ hasHouses: boolean }>>(page, 'villageSites');
    expect(sites.map((s) => s.hasHouses)).toEqual([false, false, false]);
    for (const c of cells) expect(await readState<number>(page, 'blockAt', c.x, c.y, c.z)).toBe(STEEN);
    expect(await villagers(page)).toHaveLength(8);
  });

  test('AC188: a save from 0.4.0 loads with 0 van de 8 gevonden and no cooldown running', async ({ page }) => {
    await openWithOldSave(page, []);
    expect(await villageState(page)).toEqual({ found: [], cooldownMs: 0, lastVillager: null });
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await expect(page.locator('[data-testid="grid-rare-count"]')).toHaveText('0 van de 8 gevonden');
  });
});

// ---------------------------------------------------------------- the bubble (AC181, AC182)

test.describe('the speech bubble', () => {
  test('AC181: the bubble shows near a villager and hides when the kid walks away', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    expect((await bubble(page)).visible).toBe(false);
    await standNear(page, v.id);
    const shown = await waitBubble(page, true);
    expect(shown.text).toBe(ASK);
    expect(shown.canAsk).toBe(true);
    expect(shown.villager).toBe(v.id);
    await page.screenshot({ path: 'test-results/screenshots/v11/bubble.png' });
    await walkFarAway(page);
    await waitBubble(page, false);
  });

  test('AC181: with two villagers close, only the nearest one owns the bubble', async ({ page }) => {
    await openForVillage(page);
    const list = await villagers(page);
    const a = list[0]!;
    // Another villager of the same village.
    const b = list.find((x) => x.id !== a.id && x.site === a.site)!;
    await standNear(page, a.id, 0.8);
    const shown = await waitBubble(page, true);
    expect(shown.villager).toBe(a.id);
    expect(b).toBeTruthy();
    // Now stand next to the other one of the same village: the bubble moves to it.
    await standNear(page, b.id, 0.8);
    await expect.poll(async () => {
      await readState(page, 'tickVillage');
      return (await bubble(page)).villager;
    }).toBe(b.id);
  });

  test('AC181: a plain Hoi! with nothing seen cannot be tapped and starts no cooldown', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPlayRemainingMs', 5 * 60_000);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    const shown = await waitBubble(page, true);
    expect(shown.text).toBe('Hoi!');
    expect(shown.canAsk).toBe(false);
    // The bubble lets the finger through, so a tap on it opens nothing.
    expect(await page.locator('[data-testid="village-bubble"]').evaluate((n) => getComputedStyle(n).pointerEvents)).toBe('none');
    expect((await cardState(page)).open).toBe(false);
    expect((await villageState(page)).cooldownMs).toBe(0);
  });

  for (const size of [
    { name: 'iPad 1024 x 768', width: 1024, height: 768 },
    { name: 'iPad 1180 x 820', width: 1180, height: 820 },
    { name: 'Safari tab 1024 x 690', width: 1024, height: 690 },
  ]) {
    test(`AC181: the bubble is at least 44 x 44, in the safe area and clear of the HUD at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openForVillage(page);
      // Chromium has no env(): set the iPad home screen app insets by hand.
      const safe = { top: 24, bottom: 20, left: 0, right: 0 };
      await page.addStyleTag({
        content: `:root{--safe-top:${safe.top}px;--safe-bottom:${safe.bottom}px;--safe-left:${safe.left}px;--safe-right:${safe.right}px}`,
      });
      const v = (await villagers(page))[0]!;
      await standNear(page, v.id);
      await waitBubble(page, true);
      const rects = await page.evaluate(() => {
        const r = (e: Element) => {
          const b = e.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height, name: e.className || e.tagName };
        };
        const bubbleEl = document.querySelector('[data-testid="village-bubble"]')!;
        const hud = Array.from(
          document.querySelectorAll('.hud-btn, .hud-hotbar, .hud-countdown, .hud-modes, .hotbar-all, .hud-camera-pad, .hud-slot, .stick, .joystick'),
        )
          .map(r)
          .filter((x) => x.w > 0 && x.h > 0);
        return { bubble: r(bubbleEl), hud, vw: window.innerWidth, vh: window.innerHeight };
      });
      expect(rects.bubble.w).toBeGreaterThanOrEqual(44);
      expect(rects.bubble.h).toBeGreaterThanOrEqual(44);
      expect(rects.bubble.x).toBeGreaterThanOrEqual(safe.left);
      expect(rects.bubble.y).toBeGreaterThanOrEqual(safe.top);
      expect(rects.bubble.x + rects.bubble.w).toBeLessThanOrEqual(rects.vw - safe.right);
      expect(rects.bubble.y + rects.bubble.h).toBeLessThanOrEqual(rects.vh - safe.bottom);
      expect(rects.hud.length).toBeGreaterThan(3);
      for (const h of rects.hud) {
        const overlap =
          rects.bubble.x < h.x + h.w && rects.bubble.x + rects.bubble.w > h.x && rects.bubble.y < h.y + h.h && rects.bubble.y + rects.bubble.h > h.y;
        expect(overlap, `the bubble overlaps ${String(h.name)}`).toBe(false);
      }
    });
  }

  test('AC181: in portrait no bubble shows, and turning the iPad to landscape brings it back @portrait', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    await readState(page, 'tickVillage');
    expect((await bubble(page)).visible).toBe(false);
    await page.screenshot({ path: 'test-results/screenshots/v11/portrait.png' });
    await page.setViewportSize({ width: 1024, height: 768 });
    await waitBubble(page, true);
    const box = (await page.locator('[data-testid="village-bubble"]').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('AC181: a finger on the bubble does not look around or break a block (it is an ignore zone)', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    await waitBubble(page, true);
    const before = await readState<{ yaw: number; pitch: number }>(page, 'player');
    const box = (await page.locator('[data-testid="village-bubble"]').boundingBox())!;
    // Two quick taps on the bubble: one card, not two.
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(true);
    const after = await readState<{ yaw: number; pitch: number }>(page, 'player');
    expect(after.yaw).toBeCloseTo(before.yaw, 5);
    expect(after.pitch).toBeCloseTo(before.pitch, 5);
    await expect(page.locator('[data-testid="village-card"]')).toHaveCount(1);
  });

  test('AC182: no bubble in the pause menu, the shop or a break, and it comes back after', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    await waitBubble(page, true);

    // The pause menu
    await fingerTap(page, '[data-testid="hud-pause"]');
    await expect.poll(() => readState<string>(page, 'currentScreen')).not.toBe('world');
    await waitBubble(page, false);
    expect((await cardState(page)).open).toBe(false);
    await fingerTapText(page, /Terug naar de wereld/);
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
    await waitBubble(page, true);

    // The shop
    await fingerTap(page, '[data-testid="hud-winkel"]');
    await expect.poll(() => readState<string>(page, 'currentScreen')).not.toBe('world');
    await waitBubble(page, false);
    // The shop swaps its loading card for the real shop, so the close button may need a second try.
    await expect(() => fingerTap(page, '.shop-close-btn')).toPass();
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
    await waitBubble(page, true);

    // A learning break
    await readState(page, 'startBreakNow');
    await expect(page.locator('.break-screen')).toBeVisible();
    await waitBubble(page, false);
    expect((await cardState(page)).open).toBe(false);
    await readState(page, 'endBreakByParent');
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
  });

  test('AC182: no bubble with 30 seconds or less on the play timer, a bubble that shows at 0:31 hides at 0:30', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    await readState(page, 'setPlayRemainingMs', 31_000);
    await waitBubble(page, true);
    await readState(page, 'setPlayRemainingMs', 30_000);
    await waitBubble(page, false);
    await readState(page, 'setPlayRemainingMs', 20_000);
    await readState(page, 'tickVillage');
    expect((await bubble(page)).visible).toBe(false);
  });

  test('AC182: the bubble is hidden by the pause hook and while the game is paused', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    await waitBubble(page, true);
    await readState(page, 'pauseGame');
    await waitBubble(page, false);
    await readState(page, 'resumeGame');
    await waitBubble(page, true);
  });
});

// ---------------------------------------------------------------- the card (AC183 to AC186)

test.describe('the villager card', () => {
  test('AC183 AC184 AC187: tap, answer right, see the celebration, take the block into the hotbar, the Dorp tab counts it', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[2]!;
    const pointsBefore = await points(page);
    const hotbarBefore = await buildState(page);
    await openCardAt(page, v.id);
    await page.screenshot({ path: 'test-results/screenshots/v11/card.png' });
    // One question from a seen sum, no lesson, no break dots.
    await expect(page.locator('[data-testid="village-card"] .q-prompt')).toHaveText(/7 × 8 = \?/);
    await expect(page.locator('.break-screen')).toHaveCount(0);
    await answerRight(page);
    const text = await say(page);
    expect([DANCE, RESPECT]).toContain(text);
    const gives = v.gives;
    await expect(page.locator('[data-testid="village-found"]')).toContainText('Je hebt');
    await expect(page.locator('[data-testid="village-found"]')).toContainText('gevonden!');
    if (text === DANCE) {
      await expect(page.locator('[data-testid="village-face"]')).toHaveClass(/village-face-dance/);
      expect((await villagers(page)).find((x) => x.id === v.id)!.dancing).toBe(true);
    }
    await page.screenshot({ path: 'test-results/screenshots/v11/dance.png' });
    // No points, no plus or minus number.
    expect(await points(page)).toBe(pointsBefore);
    await expect(page.locator('[data-testid="village-card"]')).not.toContainText(/[+−-]\s*\d+\s*punt/i);
    // In mijn hotbar
    await fingerTap(page, '[data-testid="village-hotbar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    await expect(page.locator('[data-testid="village-card"]')).toHaveCount(0);
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    const after = await buildState(page);
    expect(after.hotbar[after.selected]).toBe(gives);
    expect(after.hotbar.filter((b) => b === gives)).toHaveLength(1);
    expect(hotbarBefore.hotbar[hotbarBefore.selected]).not.toBe(gives);
    expect((await villageState(page)).found).toEqual([gives]);
    // The Dorp tab
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await expect(page.locator('[data-testid="grid-rare-count"]')).toHaveText('1 van de 8 gevonden');
    await expect(page.locator('.grid-rare:not([hidden])')).toHaveCount(8);
    await expect(page.locator('.grid-rare-locked:not([hidden])')).toHaveCount(7);
    await page.screenshot({ path: 'test-results/screenshots/v11/dorp-tab.png' });
  });

  test('AC183: a villager question is not a break: no break record, no ledger row, an answer marked dorp', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[1]!;
    await openCardAt(page, v.id);
    await answerRight(page);
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    await expect
      .poll(async () => (await readState<Array<{ context?: string }>>(page, 'answersLog')).length)
      .toBeGreaterThan(0);
    const answers = await readState<Array<{ context?: string; try: number; correct: boolean; itemId: string }>>(page, 'answersLog');
    expect(answers.every((a) => a.context === 'dorp')).toBe(true);
    expect(answers[0]).toMatchObject({ try: 1, correct: true, itemId: SEEN_ITEM_ID });
    expect(await readState<unknown[]>(page, 'breaksLog')).toHaveLength(0);
    expect(await readState<unknown[]>(page, 'ledgerLog')).toHaveLength(0);
    // Right on the first try: the box moves up from 2.
    await expect.poll(() => progressBox(page)).toBe(3);
  });

  test('AC184: both the dance and Respect bruuuuu! show over several right answers', async ({ page }) => {
    await openForVillage(page);
    const list = await villagers(page);
    const seen = new Set<string>();
    for (let i = 0; i < 10 && seen.size < 2; i++) {
      const v = list[i % list.length]!;
      await readState(page, 'setVillageState', { cooldownMs: 0, lastVillager: null });
      await openCardAt(page, v.id);
      await answerRight(page);
      seen.add(await say(page));
      await fingerTap(page, '[data-testid="village-verder"]');
      await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
      await walkFarAway(page);
      await waitBubble(page, false);
    }
    expect([...seen].sort()).toEqual([DANCE, RESPECT].sort());
  });

  test('AC184 AC185: wrong once shows the retry text without the answer, wrong twice shows Zo zit het:, no points change', async ({ page }) => {
    await openForVillage(page);
    await readState(page, 'setPoints', 10);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await answerWrong(page);
    await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('retry');
    await expect(page.locator('[data-testid="village-card"] .village-banner-wrong')).toContainText('Net niet. Probeer het nog een keer.');
    await expect(page.locator('[data-testid="village-answer"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="village-card"]')).not.toContainText('= 56');
    // The input is cleared for the retry.
    await expect(page.locator('[data-testid="village-card"] .type-text')).toHaveText('');
    await answerWrong(page);
    await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('wrong');
    await expect(page.locator('[data-testid="village-card"] .village-zo')).toHaveText('Zo zit het:');
    await expect(page.locator('[data-testid="village-answer"]')).toContainText('56');
    await expect(page.locator('[data-testid="village-card"]')).not.toContainText(/[+−-]\s*\d+\s*punt/i);
    expect(await points(page)).toBe(10);
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    // A first try wrong puts the box at 1.
    await expect.poll(() => progressBox(page)).toBe(1);
    expect((await villageState(page)).found).toEqual([]);
    expect(await points(page)).toBe(10);
    await page.screenshot({ path: 'test-results/screenshots/v11/zo-zit-het.png' });
  });

  test('AC183: first try wrong, retry right still leaves the box at 1 and gives the block', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[3]!;
    await openCardAt(page, v.id);
    await answerWrong(page);
    await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('retry');
    await answerRight(page);
    await expect(page.locator('[data-testid="village-found"]')).toContainText('gevonden!');
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    await expect.poll(() => progressBox(page)).toBe(1);
    expect((await villageState(page)).found).toEqual([v.gives]);
  });

  test('AC183 AC186: Laat maar closes the card, gives nothing and still starts the cooldown', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await fingerTap(page, '[data-testid="village-laat-maar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    const s = await villageState(page);
    expect(s.found).toEqual([]);
    expect(s.cooldownMs).toBeGreaterThan(170_000);
    expect(s.lastVillager).toBe(v.id);
    expect(await readState<unknown[]>(page, 'answersLog')).toHaveLength(0);
  });

  test('AC183: a double tap on a card button acts once', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await answerRight(page);
    const box = (await page.locator('[data-testid="village-verder"]').boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    expect((await villageState(page)).found).toEqual([v.gives]);
  });

  test('AC185: the play timer stops while the card is open and keeps its value after', async ({ page }) => {
    await openForVillage(page);
    await readState(page, 'setPlayRemainingMs', 120_000);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    expect(await readState<boolean>(page, 'isPlayRunning')).toBe(false);
    const open = await readState<number>(page, 'remainingPlayMs');
    // A minute of play time cannot pass under the card.
    await readState(page, 'advancePlayMs', 60_000);
    await readState(page, 'stepTimer');
    expect(await readState<number>(page, 'remainingPlayMs')).toBe(open);
    await fingerTap(page, '[data-testid="village-laat-maar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    const after = await readState<number>(page, 'remainingPlayMs');
    expect(after).toBeGreaterThan(119_000 - 2000);
    expect(after).toBeLessThanOrEqual(120_000);
  });

  test('AC185: the app is killed with a card open, it reopens on the world with no card', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    const fresh = await killApp(page);
    expect(await readState<string>(fresh, 'currentScreen')).toBe('world');
    expect((await cardState(fresh)).open).toBe(false);
    await expect(fresh.locator('[data-testid="village-card"]')).toHaveCount(0);
  });

  test('AC182: a card does not open when something else took the screen first', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await standNear(page, v.id);
    await waitBubble(page, true);
    // A break starts while the bubble is up: the bubble goes and no card appears.
    await readState(page, 'startBreakNow');
    await expect(page.locator('.break-screen')).toBeVisible();
    await waitBubble(page, false);
    expect((await cardState(page)).open).toBe(false);
    await readState(page, 'endBreakByParent');
  });

  test('AC186: cooldown with the timer hooks, and the villager who asked last is skipped', async ({ page }) => {
    await openForVillage(page);
    const [a, b] = await twoFarVillagers(page);
    await openCardAt(page, a.id);
    await fingerTap(page, '[data-testid="village-laat-maar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);

    // Another villager right away: no bubble.
    await standNear(page, b.id);
    await readState(page, 'tickVillage');
    expect((await bubble(page)).visible).toBe(false);

    // Two minutes of play time pass: still no bubble. Time in the pause menu does not count.
    await readState(page, 'advancePlayMs', 120_000);
    await readState(page, 'tickVillage');
    expect((await bubble(page)).visible).toBe(false);
    const mid = (await villageState(page)).cooldownMs;
    expect(mid).toBeGreaterThan(50_000);
    expect(mid).toBeLessThanOrEqual(60_000 + 1000);
    await fingerTap(page, '[data-testid="hud-pause"]');
    await expect.poll(() => readState<string>(page, 'currentScreen')).not.toBe('world');
    await readState(page, 'tickVillage');
    const inPause = (await villageState(page)).cooldownMs;
    await readState(page, 'advancePlayMs', 120_000);
    await readState(page, 'tickVillage');
    expect((await villageState(page)).cooldownMs).toBe(inPause);
    expect(inPause).toBeLessThanOrEqual(mid);
    expect(inPause).toBeGreaterThan(mid - 5000);
    await fingerTapText(page, /Terug naar de wereld/);
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
    await readState(page, 'setPlayRemainingMs', 300_000);
    await expect.poll(() => readState<boolean>(page, 'isPlayRunning')).toBe(true);
    // Let the village look at the new timer value first, so the next drop is counted from 5:00.
    await readState(page, 'tickVillage');

    // The rest of the three minutes: the other villager asks again, the one who asked last does not.
    await readState(page, 'advancePlayMs', 61_000);
    await standNear(page, a.id);
    await readState(page, 'tickVillage');
    expect((await villageState(page)).cooldownMs).toBe(0);
    expect((await bubble(page)).visible).toBe(false);
    await standNear(page, b.id);
    const shown = await waitBubble(page, true);
    expect(shown.villager).toBe(b.id);
  });

  test('AC186: the cooldown survives a kill: the rest of the 3 minutes still counts', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await fingerTap(page, '[data-testid="village-laat-maar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    await expect.poll(async () => (await getKv<{ cooldownMs: number }>(page, 'village'))?.cooldownMs ?? 0).toBeGreaterThan(170_000);
    const fresh = await killApp(page);
    const s = await villageState(fresh);
    expect(s.cooldownMs).toBeGreaterThan(170_000);
    expect(s.lastVillager).toBe(v.id);
    await readState(fresh, 'setPlayRemainingMs', 300_000);
    const other = (await villagers(fresh))[7]!;
    await standNear(fresh, other.id);
    await readState(fresh, 'tickVillage');
    expect((await bubble(fresh)).visible).toBe(false);
  });
});

// ---------------------------------------------------------------- the rare blocks (AC187, AC188)

test.describe('rare blocks and the Dorp tab', () => {
  test('AC187: the Dorp tab shows 8 dark tiles, tapping one changes nothing', async ({ page }) => {
    await openApp(page);
    const before = await buildState(page);
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await expect(page.locator('[data-testid="grid-rare-count"]')).toHaveText('0 van de 8 gevonden');
    const tiles = page.locator('.grid-rare:not([hidden])');
    await expect(tiles).toHaveCount(8);
    await expect(tiles.first()).toContainText('?');
    await expect(tiles.first()).toContainText('Een dorpeling heeft deze');
    const box = (await tiles.first().boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    expect(await buildState(page)).toEqual(before);
    await expect(page.locator('.block-grid:not([hidden])')).toBeVisible();
  });

  test('AC187: all 8 villagers answered right once finds all 8 blocks', async ({ page }) => {
    await openForVillage(page);
    const list = await villagers(page);
    for (const v of list) {
      await readState(page, 'setVillageState', { cooldownMs: 0, lastVillager: null });
      await openCardAt(page, v.id);
      await answerRight(page);
      await fingerTap(page, '[data-testid="village-verder"]');
      await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
      await walkFarAway(page);
      await waitBubble(page, false);
    }
    expect((await villageState(page)).found).toEqual([...RARE_BLOCKS].sort((x, y) => x - y));
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await expect(page.locator('[data-testid="grid-rare-count"]')).toHaveText('8 van de 8 gevonden');
    await expect(page.locator('.grid-rare-locked:not([hidden])')).toHaveCount(0);
  });

  test('AC187: a found block is picked from the Dorp tab, placed without limit and mined', async ({ page }) => {
    await openApp(page);
    const block = RARE_BLOCKS[0]!;
    await readState(page, 'setVillageState', { found: [block] });
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await fingerTap(page, `.grid-rare[data-block-id="${block}"]`);
    await expect(page.locator('.block-grid:not([hidden])')).toHaveCount(0);
    const st = await buildState(page);
    expect(st.hotbar[st.selected]).toBe(block);
    // Placed twice in two places, still in the hotbar (no limit); then mined away.
    await readState(page, 'setBuildState', { mode: 'bouwen' });
    const spot = START_SPOT;
    const y = groundY(spot.x, spot.z) + 1;
    await page.evaluate(
      ({ x, y, z, block }) => {
        const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
        hooks.setBlock!(x + 3, y, z, block);
        hooks.setBlock!(x + 4, y, z, block);
      },
      { x: Math.floor(spot.x), y, z: Math.floor(spot.z), block },
    );
    expect(await readState<number>(page, 'blockAt', Math.floor(spot.x) + 3, y, Math.floor(spot.z))).toBe(block);
    const st2 = await buildState(page);
    expect(st2.hotbar[st2.selected]).toBe(block);
    await page.evaluate(
      ({ x, y, z }) => (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.setBlock!(x + 3, y, z, 0),
      { x: Math.floor(spot.x), y, z: Math.floor(spot.z) },
    );
    expect(await readState<number>(page, 'blockAt', Math.floor(spot.x) + 3, y, Math.floor(spot.z))).toBe(0);
  });

  test('AC188: three found blocks and one in the hotbar survive a kill and reopen', async ({ page }) => {
    await openApp(page);
    const found = [RARE_BLOCKS[0]!, RARE_BLOCKS[3]!, RARE_BLOCKS[6]!];
    await readState(page, 'setVillageState', { found });
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await fingerTap(page, `.grid-rare[data-block-id="${found[1]}"]`);
    await readState(page, 'flushSave');
    await expect.poll(async () => (await getKv<{ found: number[] }>(page, 'village'))?.found ?? []).toEqual(found);
    const fresh = await killApp(page);
    expect((await villageState(fresh)).found).toEqual(found);
    const st = await buildState(fresh);
    expect(st.hotbar[st.selected]).toBe(found[1]);
    await fingerTap(fresh, '.hotbar-all');
    await fingerTap(fresh, '[data-testid="grid-cat-dorp"]');
    await expect(fresh.locator('[data-testid="grid-rare-count"]')).toHaveText('3 van de 8 gevonden');
  });

  test('AC188: Wereld opnieuw beginnen keeps the found blocks and removes rare blocks placed in the old world', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    const found = [RARE_BLOCKS[1]!, RARE_BLOCKS[2]!, RARE_BLOCKS[5]!];
    await readState(page, 'setVillageState', { found });
    const y = groundY(START_SPOT.x, START_SPOT.z) + 1;
    const cell = { x: Math.floor(START_SPOT.x) + 3, y, z: Math.floor(START_SPOT.z) };
    await page.evaluate(
      ({ cell, block }) => (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.setBlock!(cell.x, cell.y, cell.z, block),
      { cell, block: found[0]! },
    );
    expect(await readState<number>(page, 'blockAt', cell.x, cell.y, cell.z)).toBe(found[0]);

    await loginAsParent(page);
    await fingerTap(page, '.parent-nav-btn[data-section="instellingen"]');
    await fingerTapText(page, 'Wereld opnieuw beginnen');
    await fingerTapText(page, /Ja, maak een nieuwe wereld/);
    await expect.poll(() => readState<number>(page, 'blockAt', cell.x, cell.y, cell.z)).toBe(0);
    await fingerTap(page, '.parent-close-btn');
    await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();

    expect((await villageState(page)).found).toEqual(found);
    // The villages stand in the new world.
    const sites = await readState<Array<{ hasHouses: boolean }>>(page, 'villageSites');
    expect(sites.every((s) => s.hasHouses)).toBe(true);
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await expect(page.locator('[data-testid="grid-rare-count"]')).toHaveText('3 van de 8 gevonden');
    await fingerTap(page, `.grid-rare[data-block-id="${found[2]}"]`);
    const st = await buildState(page);
    expect(st.hotbar[st.selected]).toBe(found[2]);
  });
});

// ---------------------------------------------------------------- safety (AC189)

test.describe('safety', () => {
  test('AC189: playing with villages, villagers and the card makes no request beyond the app own files', async ({ page, baseURL }) => {
    const origin = new URL(page.url() === 'about:blank' ? baseURL! : page.url()).origin;
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u);
    });
    page.on('websocket', (w) => outside.push(`ws ${w.url()}`));
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await answerWrong(page);
    await answerWrong(page);
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    await readState(page, 'setVillageState', { cooldownMs: 0, lastVillager: null });
    await openCardAt(page, (await villagers(page))[4]!.id);
    await answerRight(page);
    await fingerTap(page, '[data-testid="village-hotbar"]');
    await fingerTap(page, '.hotbar-all');
    await fingerTap(page, '[data-testid="grid-cat-dorp"]');
    await expect(page.locator('[data-testid="grid-rare-count"]')).toHaveText('1 van de 8 gevonden');
    expect(outside).toEqual([]);
  });

  test('AC189: the card has no link, no image from the web and no script', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    const card = page.locator('[data-testid="village-card"]');
    await expect(card.locator('a, iframe, script, img, form')).toHaveCount(0);
    await answerRight(page);
    await expect(card.locator('a, iframe, script, img, form')).toHaveCount(0);
  });

  test('AC189: the only new saved data is the found list, the cooldown and the last villager', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await answerRight(page);
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    await expect
      .poll(async () => Object.keys((await getKv<Record<string, unknown>>(page, 'village')) ?? {}).sort())
      .toEqual(['cooldownMs', 'found', 'lastVillager']);
  });
});

/** Ground height of terrain version 2 at a column (the new world), for placing test blocks. */
function groundY(x: number, z: number): number {
  const t = generateTerrain(WORLD_SEED, CURRENT_TERRAIN_VERSION);
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) if ((t[cellIndex(ix, y, iz)] ?? 0) !== 0) return y;
  return 0;
}
