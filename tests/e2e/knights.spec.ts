// Knight life (V17b, AC204, AC205): a following knight is never hit by 40 taps on random spots in view, and a stay
// knight salutes once, not again within a minute, and again after it.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Knight { id: string; mode: string; x: number; y: number; z: number }
interface Pose { x: number; y: number; z: number; yaw: number }

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

const knights = (page: Page) => readState<Knight[]>(page, 'knights');

test.describe('Knight life (V17b)', () => {
  test('AC204: 40 taps on random spots in view hit a following knight 0 times', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 5);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'addKnight', 'follow');
    await readState(page, 'fastForward', 5000);
    const size = page.viewportSize()!;
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 40; i++) {
      await tapAt(page, 10 + i, 20 + rnd() * (size.width - 40), 60 + rnd() * (size.height - 120));
      await expect(page.locator('.knight-menu-card')).toHaveCount(0);
      await readState(page, 'fastForward', 1000);
    }
    expect((await knights(page))[0]!.mode).toBe('follow');
  });

  test('AC205: a stay knight salutes once, not within a minute, and again after it', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 9);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'addKnight', 'stay');
    const k = (await knights(page))[0]!;
    const speech = page.locator('.speech-line');
    const moveKid = async (dx: number) => {
      const p = await readState<Pose>(page, 'player');
      await readState(page, 'placePlayer', k.x + dx, k.y + 1, k.z, p.yaw);
    };
    const salutes = async (ms: number) => {
      let n = 0;
      for (let t = 0; t < ms; t += 1000) {
        await readState(page, 'fastForward', 1000);
        if ((await speech.textContent()) === 'Hallo!' && (await speech.isVisible())) n++;
      }
      return n;
    };
    // The arrival line goes first and the clock starts at 0.
    await moveKid(12);
    await readState(page, 'fastForward', 61_000);
    await expect(speech).toBeHidden({ timeout: 5000 });
    await moveKid(1.5);
    expect(await salutes(2000)).toBeGreaterThan(0);
    await expect(speech).toBeHidden({ timeout: 5000 });
    await moveKid(12);
    await readState(page, 'fastForward', 5000);
    await moveKid(1.5);
    expect(await salutes(3000)).toBe(0);
    await moveKid(12);
    await readState(page, 'fastForward', 61_000);
    await expect(speech).toBeHidden({ timeout: 5000 });
    await moveKid(1.5);
    expect(await salutes(2000)).toBeGreaterThan(0);
  });
});
