// Life in the moved world (V15e, AC239): the 0.7.0 builder save is written into IndexedDB, the app opens and moves it,
// then villagers, a villager question, a guard knight, a roaming dino, Klodder, Wereld opnieuw beginnen and Alles
// wissen all work in the moved world. The pure rules have unit tests; this proves them together in a browser.
import { expect, test, type Page } from '@playwright/test';
import { LINE_MORE, countNear } from '../../src/knights/guard-report';
import { inAnyVillage } from '../../src/monsters/nibble';
import { AIR, LAVA, OERSTEEN, WATER } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { VILLAGE_SITES, inRegion, siteRegion } from '../../src/world/village-layout';
import { save070, type OldSave } from '../fixtures/move/old-saves';
import { openApp, readState } from './helpers/app';
import {
  SEEN_ANSWER, cardState, fingerTap, openCardAt, putKv, seedSeenItem, typeNumber, villagers, type VillagerInfo,
} from './helpers/dorp';
import { loginAsParent, setupPin } from './helpers/gate';

const MOVE = { x: 32, y: 10, z: 32 };
interface Dino { id: string; kind: string; mode: string; x: number; y: number; z: number; stayX: number; stayZ: number }
interface Knight { id: string; mode: string; x: number; y: number; z: number; spot: { x: number; y: number; z: number } | null }

/** Writes the old save, then opens the app again so the boot moves it. */
async function openMoved(page: Page, save: OldSave, settings: Record<string, unknown> = {}): Promise<void> {
  await openApp(page);
  await readState(page, 'simulateKill'); // nothing the new install saves may land over the old records
  await putKv(page, 'world', { ...save.world, diff: Uint32Array.from(save.world.diff) });
  for (const key of ['player', 'dinos', 'economy', 'village', 'monsters'] as const) await putKv(page, key, save[key]);
  await putKv(page, 'settings', { ...save.settings, ...settings });
  await seedSeenItem(page);
  await page.reload();
  await openApp(page);
  expect(await readState<number>(page, 'terrainVersion')).toBe(3);
}

async function tapAt(page: Page, id: number, x: number, y: number) {
  await page.evaluate(
    ({ id, x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { id, x, y },
  );
}

/** Reads every cell of the world in the page: one string per x, z column (y 0 to 79), as char codes. */
async function snapshot(page: Page): Promise<number[]> {
  return page.evaluate(
    ({ size, height }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      const out: number[] = new Array(size * size * height);
      let i = 0;
      for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) for (let y = 0; y < height; y++) out[i++] = h.blockAt!(x, y, z);
      return out;
    },
    { size: WORLD_SIZE, height: WORLD_HEIGHT },
  );
}
const at = (x: number, y: number, z: number) => (x * WORLD_SIZE + z) * WORLD_HEIGHT + y;

test.describe('life in the moved 0.7.0 world (AC239)', () => {
  test('AC239: villagers walk at home in their moved villages and a villager question works', async ({ page }) => {
    test.setTimeout(90_000);
    const save = save070();
    await openMoved(page, save);
    await readState(page, 'setPlayRemainingMs', 5 * 60_000);
    await readState(page, 'setVillageState', { cooldownMs: 0, lastVillager: null });
    const before = await villagers(page);
    expect(before).toHaveLength(8);
    for (const v of before) {
      const site = VILLAGE_SITES.find((s) => s.id === v.site)!;
      expect(inRegion(siteRegion(site), v.home.x, v.home.z)).toBe(true);
    }
    await readState(page, 'pauseGame');
    for (let i = 0; i < 30; i++) {
      await readState(page, 'stepVillagers', 0.5);
      for (const v of await villagers(page)) {
        const home = before.find((b) => b.id === v.id)!.home;
        expect(Math.hypot(v.position.x - home.x, v.position.z - home.z)).toBeLessThanOrEqual(3);
      }
    }
    await readState(page, 'resumeGame');
    // A villager whose block the kid has not found yet, so the card offers In mijn hotbar.
    const v: VillagerInfo = (await villagers(page)).find((x) => !save.village.found.includes(x.gives))!;
    await openCardAt(page, v.id);
    await expect(page.locator('[data-testid="village-card"] .q-prompt')).toHaveText(/7 × 8 = \?/);
    await typeNumber(page, SEEN_ANSWER);
    await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('right');
    await fingerTap(page, '[data-testid="village-hotbar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
  });

  test('AC239: a guard knight counts the animals within 8 blocks of his moved spot', async ({ page }) => {
    const save = save070();
    await openMoved(page, save);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    const guard = save.monsters.knights.find((k) => k.mode === 'guard')!;
    const spot = { x: guard.spot!.x + MOVE.x, y: guard.spot!.y + MOVE.y, z: guard.spot!.z + MOVE.z };
    expect((await readState<Knight[]>(page, 'knights')).find((k) => k.id === guard.id)!.spot).toEqual(spot);
    const animals = () => readState<Dino[]>(page, 'dinos');
    const line = (a: Dino[]) => {
      const { dinos, chickens, more } = countNear(spot, a);
      const parts = [dinos > 0 ? (dinos === 1 ? '1 dino' : `${dinos} dino's`) : '', chickens > 0 ? (chickens === 1 ? '1 kip' : `${chickens} kippen`) : ''].filter(Boolean);
      return parts.length ? `Ik pas op ${parts.join(' en ')}.${more ? ` ${LINE_MORE}` : ''} Alles veilig!` : 'Hier zijn nog geen dieren.';
    };
    const vp = page.viewportSize()!;
    let attempt = 0;
    await expect(async () => {
      // Stand 2.5 blocks from the knight on a different side each try (a tree or a wall can be in the way on one side),
      // and turn so that he is on the right half of the screen, away from the stick.
      const now = (await readState<Knight[]>(page, 'knights')).find((x) => x.id === guard.id)!;
      const a = (attempt++ * Math.PI) / 4;
      const kid = { x: now.x + 2.5 * Math.sin(a), y: now.y + 0.5, z: now.z + 2.5 * Math.cos(a) };
      const toKnight = Math.atan2(now.x - kid.x, now.z - kid.z);
      let p: { x: number; y: number } | null = null;
      for (const turn of [-0.3, 0.3, -0.45, 0.45]) {
        await readState(page, 'placePlayer', kid.x, kid.y, kid.z, toKnight + turn);
        const q = await readState<{ x: number; y: number } | null>(page, 'knightScreenPoint', guard.id);
        if (q && q.x > vp.width * 0.55 && q.x < vp.width * 0.9 && q.y > vp.height * 0.15 && q.y < vp.height * 0.85) {
          p = q;
          break;
        }
      }
      expect(p).not.toBeNull();
      const wanted = new Set<string>([line(await animals())]);
      await tapAt(page, 7, p!.x, p!.y);
      wanted.add(line(await animals()));
      await expect(page.locator('.knight-menu-card')).toBeVisible({ timeout: 800 });
      const said = (await page.locator('.speech-line').textContent()) ?? '';
      expect([...wanted]).toContain(said);
    }).toPass({ timeout: 20_000 });
  });

  test('AC239: a Vrij rondlopen dino roams around its moved stay spot', async ({ page }) => {
    const save = save070();
    await openMoved(page, save);
    await readState(page, 'pauseGame');
    // The first game step hatches the two ready eggs and rescues animals the move put inside a block. In WebKit no frame
    // has run yet when the page is ready, so take that step first and only then look at where the animals are.
    await readState(page, 'stepDinos', 0.1);
    // An animal more than 15 blocks from the kid is brought to him at the start by a rule 0.7.0 already had (it then walks
    // home), so only animals that started within 12 blocks of their stay spot are held to the roam radius from the start.
    const stays = (await readState<Dino[]>(page, 'dinos')).filter(
      (d) => d.mode === 'stay' && d.kind !== 'kip' && Math.hypot(d.x - d.stayX, d.z - d.stayZ) <= 12,
    );
    expect(stays.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 60; i++) {
      await readState(page, 'stepDinos', 0.5);
      for (const d of await readState<Dino[]>(page, 'dinos')) {
        if (!stays.some((s) => s.id === d.id)) continue;
        expect(Math.hypot(d.x - d.stayX, d.z - d.stayZ)).toBeLessThanOrEqual(12.5);
      }
    }
    const old = (save.dinos.dinos as { id: string; stayX: number; stayZ: number }[]).find((d) => d.id === 'dino-3')!;
    const now = (await readState<Dino[]>(page, 'dinos')).find((d) => d.id === 'dino-3')!;
    expect(now.stayX).toBeCloseTo(old.stayX + MOVE.x, 5);
    expect(now.stayZ).toBeCloseTo(old.stayZ + MOVE.z, 5);
  });

  test('AC239: a seeded Klodder nibbles only cells that AC215 allows in the moved world', async ({ page }) => {
    test.setTimeout(120_000);
    const save = save070();
    // The knights are off, so none of them sends Klodder away before he nibbles (the knights have their own specs).
    await openMoved(page, save, { knightsEnabled: false });
    await readState(page, 'setCreatureSeed', 5);
    await readState(page, 'resetPlayTimer', 600);
    // The kid changed cells, at the move.
    const kidCells = save.changes.map(([x, y, z]) => [x + MOVE.x, y + MOVE.y, z + MOVE.z] as const);
    const before = await snapshot(page);
    expect(await readState(page, 'spawnKlodder')).toBe(true);
    for (let i = 0; i < 40 && (await readState<{ hiddenCount: number }>(page, 'monsterState')).hiddenCount < 5; i++) {
      await readState(page, 'fastForward', 5000);
    }
    const state = await readState<{ hiddenCount: number }>(page, 'monsterState');
    expect(state.hiddenCount).toBeGreaterThanOrEqual(5);
    expect(state.hiddenCount).toBeLessThanOrEqual(20);
    const after = await snapshot(page);
    let nibbled = 0;
    for (let x = 0; x < WORLD_SIZE; x++) {
      for (let z = 0; z < WORLD_SIZE; z++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const i = at(x, y, z);
          if (before[i] === after[i]) continue;
          nibbled++;
          expect(after[i]).toBe(AIR);
          expect([OERSTEEN, WATER, LAVA]).not.toContain(before[i]);
          expect(inAnyVillage(x, z)).toBe(false);
          for (const [kx, ky, kz] of kidCells) {
            expect(Math.abs(kx - x) > 3 || Math.abs(ky - y) > 3 || Math.abs(kz - z) > 3).toBe(true);
          }
        }
      }
    }
    expect(nibbled).toBe(state.hiddenCount);
  });

  test('AC239: Wereld opnieuw beginnen gives the version 3 start world and keeps animals, knights, points and found blocks; Alles wissen gives a version 3 world', async ({ page }) => {
    const save = save070();
    await openMoved(page, save);
    await setupPin(page);
    const hut = save.changes.find((c) => c[3] !== AIR)!;
    const cell = { x: hut[0] + MOVE.x, y: hut[1] + MOVE.y, z: hut[2] + MOVE.z };
    expect(await readState<number>(page, 'blockAt', cell.x, cell.y, cell.z)).toBe(hut[3]);
    // Both eggs of the old save are ready: wait until the game has hatched them, then count (WebKit starts its first frame later).
    await expect.poll(async () => (await readState<unknown[]>(page, 'eggs')).length).toBe(0);
    const dinos = (await readState<Dino[]>(page, 'dinos')).length;
    const knights = (await readState<Knight[]>(page, 'knights')).length;
    const openSettings = async () => {
      await loginAsParent(page);
      await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
      await page.locator('.parent-settings').waitFor();
    };
    const tapButton = async (name: string | RegExp) => {
      const b = page.locator('.parent-settings button', { hasText: name }).first();
      await b.scrollIntoViewIfNeeded();
      await b.tap();
    };
    await openSettings();
    await tapButton('Wereld opnieuw beginnen');
    await tapButton(/Ja, maak een nieuwe wereld/);
    await expect.poll(() => readState<number>(page, 'blockAt', cell.x, cell.y, cell.z)).not.toBe(hut[3]);
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);
    expect(await readState<number>(page, 'points')).toBe(save.economy.points);
    expect((await readState<Dino[]>(page, 'dinos')).length).toBe(dinos);
    expect((await readState<Knight[]>(page, 'knights')).length).toBe(knights);
    expect((await readState<{ found: number[] }>(page, 'villageState')).found).toEqual(save.village.found);

    await page.locator('.parent-close-btn').tap().catch(() => undefined);
    await readState(page, 'flushSave');
    await page.reload();
    await openApp(page);
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);
    await openSettings();
    await tapButton('Alles wissen');
    await tapButton('Ja, ga verder');
    await tapButton('Ja, wis alles echt');
    // The page reloads after the wipe. Until the new page has booted the read fails or gives the old page's answer,
    // so poll for the new world record (a version 3 record is written at the first start, decision 138).
    await expect
      .poll(async () => readState<number>(page, 'terrainVersion').catch(() => -1), { timeout: 20_000 })
      .toBe(3);
    await expect.poll(async () => readState<number>(page, 'points').catch(() => -1), { timeout: 20_000 }).toBe(0);
  });
});
