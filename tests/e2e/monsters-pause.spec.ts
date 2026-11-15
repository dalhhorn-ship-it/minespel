// AC224, AC225, AC228 (V18e): nothing of the monsters moves in any pause state, and goes on after it. Table driven:
// 8 states times a bubble, Klodder, a guard knight with Klodder, and a running bubble clock. Also the no network
// and the reduced motion checks.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

const C = Math.floor(WORLD_SIZE / 2);

interface Monster {
  phase: string;
  bubble: { ageMs: number } | null;
  klodder: { ageMs: number; moed: number; nibbled: number } | null;
}
interface Knight { id: string; x: number; y: number; z: number }

async function tapSel(page: Page, selector: string, id: number) {
  await page.evaluate(
    ({ selector, id }) => {
      const b = document.querySelector(selector) as HTMLElement;
      const fire = (type: string) => b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { selector, id },
  );
}

/** Flat stone ground with open air above, so a tap finds the knight. */
async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 10; x <= c + 10; x++)
        for (let z = c - 10; z <= c + 10; z++) for (let y = 0; y < height; y++) h.setBlock!(x, y, z, y < 10 ? stone : 0, 1);
      h.rebuildWorld!();
      h.placePlayer!(c + 0.5, 10, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT },
  );
  await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
}

type Subject = 'bubble' | 'klodder' | 'guard knight' | 'clock';
const SUBJECTS: Subject[] = ['bubble', 'klodder', 'guard knight', 'clock'];

async function arrange(page: Page, subject: Subject) {
  await readState(page, 'setCreatureSeed', 6);
  await readState(page, 'resetPlayTimer', 600);
  if (subject === 'bubble') {
    await readState(page, 'addKnight', 'stay');
    expect(await readState(page, 'spawnBubble')).toBe(true);
  } else if (subject === 'klodder') {
    expect(await readState(page, 'spawnKlodder')).toBe(true);
  } else if (subject === 'guard knight') {
    await readState(page, 'addKnight', 'guard');
    expect(await readState(page, 'spawnKlodder')).toBe(true);
  } else {
    await readState(page, 'addKnight', 'stay');
    await readState(page, 'setBubbleClockMs', 100_000);
  }
  await readState(page, 'fastForward', 4000);
}

interface Snap { monster: Monster; clock: number; knights: Knight[] }
async function snap(page: Page): Promise<Snap> {
  return {
    monster: await readState<Monster>(page, 'monsterState'),
    clock: await readState<number>(page, 'bubbleClockMs'),
    knights: await readState<Knight[]>(page, 'knights'),
  };
}

/** One pause state: how to get in, and how to get out. */
interface PauseState {
  name: string;
  enter(page: Page): Promise<void>;
  leave(page: Page): Promise<void>;
  /** The knight menu opens by a tap on a knight, so the subject is arranged after it opens. */
  menuFirst?: boolean;
}
const screen = (page: Page) => readState<string>(page, 'currentScreen');

const STATES: PauseState[] = [
  {
    name: 'learning break',
    enter: async (page) => {
      await readState(page, 'startBreakNow');
      await expect(page.locator('.break-screen')).toBeVisible();
    },
    leave: async (page) => {
      await readState(page, 'endBreakByParent');
      await expect.poll(() => screen(page)).toBe('world');
    },
  },
  {
    name: 'exam',
    enter: async (page) => {
      await readState(page, 'startExam', 'cito-taalverzorging', 'examen-m6', 4242);
      await page.locator('[data-testid="exam-begin"]').tap();
      await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 1 van \d+$/);
    },
    leave: async (page) => {
      await readState(page, 'advanceExamMs', 40 * 60_000, true);
      await expect(page.locator('[data-testid="exam-leave"]')).toBeVisible();
      await page.locator('[data-testid="exam-leave"]').tap();
      await expect.poll(() => screen(page)).toBe('world');
    },
  },
  {
    name: 'Dinowinkel',
    enter: async (page) => {
      await readState(page, 'openShop');
      await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    },
    leave: async (page) => {
      await page.locator('.shop-close-btn').tap();
      await expect.poll(() => screen(page)).toBe('world');
    },
  },
  {
    name: 'dino menu',
    enter: async (page) => {
      await readState(page, 'addEgg', 'triceratops', false);
      await readState(page, 'stepDinos', 40);
      const dinos = await readState<Array<{ id: string }>>(page, 'dinos');
      await readState(page, 'openDinoMenuFor', dinos[0]!.id);
      await expect(page.getByRole('dialog', { name: 'Dino menu' })).toBeVisible();
    },
    leave: async (page) => {
      await page.getByRole('button', { name: 'Sluiten' }).first().click();
      await expect.poll(() => screen(page)).toBe('world');
    },
  },
  {
    name: 'knight menu',
    menuFirst: true,
    enter: async (page) => {
      await flatten(page);
      const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
      const vp = page.viewportSize()!;
      await expect(async () => {
        const kid = await readState<{ x: number; y: number; z: number }>(page, 'player');
        let p: { x: number; y: number } | null = null;
        for (let i = 0; i < 48 && !p; i++) {
          await readState(page, 'placePlayer', kid.x, kid.y, kid.z, (i * Math.PI) / 24);
          const q = await readState<{ x: number; y: number } | null>(page, 'knightScreenPoint', id);
          if (q && q.x > vp.width * 0.55 && q.x < vp.width * 0.9 && q.y > vp.height * 0.15 && q.y < vp.height * 0.85) p = q;
        }
        expect(p).not.toBeNull();
        await page.evaluate(({ x, y }) => {
          const t = document.querySelector('.world') as HTMLElement;
          for (const type of ['pointerdown', 'pointerup'])
            t.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
        }, p!);
        await expect(page.locator('.knight-menu-card')).toBeVisible({ timeout: 500 });
      }).toPass({ timeout: 10_000 });
    },
    leave: async (page) => {
      await tapSel(page, '.knight-menu-btn-close', 8);
      await expect(page.locator('.knight-menu-card')).toHaveCount(0);
    },
  },
  {
    name: 'parent area',
    enter: async (page) => {
      await loginAsParent(page);
    },
    leave: async (page) => {
      await page.locator('.parent-close-btn').tap();
      await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
    },
  },
  {
    name: 'background',
    enter: async (page) => {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(false);
    },
    leave: async (page) => {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(true);
    },
  },
  {
    name: 'portrait',
    enter: async (page) => {
      const v = page.viewportSize()!;
      await page.setViewportSize({ width: Math.min(v.width, v.height), height: Math.max(v.width, v.height) });
      await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(false);
    },
    leave: async (page) => {
      const v = page.viewportSize()!;
      await page.setViewportSize({ width: Math.max(v.width, v.height), height: Math.min(v.width, v.height) });
      await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(true);
    },
  },
];

test.describe('Monsters stand still in every pause state (V18e, AC224)', () => {
  for (const state of STATES) {
    for (const subject of SUBJECTS) {
      test(`AC224: ${subject} in ${state.name}`, async ({ page }) => {
        await openApp(page);
        await setupPin(page);
        if (state.menuFirst) await state.enter(page);
        await arrange(page, subject);
        if (!state.menuFirst) await state.enter(page);
        const before = await snap(page);
        // Real time passes and the test pushes play time and the world: none of it may count here.
        await page.waitForTimeout(1200);
        await readState(page, 'advancePlayMs', 4000);
        await readState(page, 'fastForward', 3000);
        const during = await snap(page);
        expect(during).toEqual(before);
        await state.leave(page);
        await readState(page, 'fastForward', 3000);
        const after = await snap(page);
        if (subject === 'bubble') expect(after.monster.bubble?.ageMs ?? 1e9).toBeGreaterThan(before.monster.bubble!.ageMs);
        else if (subject === 'clock') expect(after.clock).toBeGreaterThan(before.clock);
        else expect(after.monster.klodder?.ageMs ?? 1e9).toBeGreaterThan(before.monster.klodder!.ageMs);
      });
    }
  }
});

test.describe('Safety of the knights and Klodder (V18e)', () => {
  test('AC225: a session with a knight and Klodder makes no network request beyond the app files', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
      if (new URL(u).origin !== origin) outside.push(u);
    });
    await openApp(page);
    await readState(page, 'setCreatureSeed', 8);
    await readState(page, 'resetPlayTimer', 600);
    await readState(page, 'addKnight', 'guard');
    await readState(page, 'spawnKlodder');
    await readState(page, 'fastForward', 60_000);
    expect(outside).toEqual([]);
  });

  test('AC225: points, dinos and knights do not change when Klodder comes and goes', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 9);
    await readState(page, 'resetPlayTimer', 600);
    await readState(page, 'setPoints', 40);
    await readState(page, 'addKnight', 'follow');
    const points = await readState(page, 'points');
    const knights = (await readState<Knight[]>(page, 'knights')).length;
    await readState(page, 'spawnKlodder');
    await readState(page, 'fastForward', 310_000);
    expect(await readState(page, 'points')).toEqual(points);
    expect((await readState<Knight[]>(page, 'knights')).length).toBe(knights);
  });

  test('AC228: with prefers-reduced-motion the Moed bar does not animate', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const dur = await page.locator('.moed-bar > i').evaluate((n) => getComputedStyle(n).transitionDuration);
    expect(dur === '0s' || dur === 'none').toBe(true);
  });
});
