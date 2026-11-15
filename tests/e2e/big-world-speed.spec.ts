import { expect, test } from '@playwright/test';
import { START_SPOT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

// AC240: with the real renderer, chunkStats shows that nothing beyond the camera far plane is drawn, at the start
// spot and at (8, ground, 8) looking to the middle. The 30 second walk writes the frame times to the log (a log to
// compare releases, not a pass or fail: CI has no real iPad GPU). Needs real WebGL, like context-loss.spec.ts.

interface ChunkStats {
  meshed: number;
  drawn: number;
  facesDrawn: number;
  far: number;
  deepestDrawnStart: number;
  farthestDrawnChunks: number;
  farthestMeshedChunks: number;
}

const stats = (page: import('@playwright/test').Page) => readState<ChunkStats>(page, 'chunkStats');

async function settle(page: import('@playwright/test').Page): Promise<void> {
  const start = await readState<number>(page, 'frameCount');
  await page.waitForFunction(
    (target) => ((window as unknown as { __dino: Record<string, () => number> }).__dino.frameCount?.() ?? 0) >= (target as number),
    start + 6,
  );
}

test.beforeEach(async ({ page }, info) => {
  await openApp(page);
  if (info.title.includes('near')) {
    await page.goto('/?near=1');
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
  }
  test.skip(!(await readState<boolean>(page, 'usesRealRenderer')), 'No WebGL here: see the unit tests in src/render/draw-budget.test.ts.');
});

test('AC240: no drawn chunk is beyond the far plane at the start spot and at the corner', async ({ page }) => {
  await readState(page, 'placePlayer', START_SPOT.x, START_SPOT.y, START_SPOT.z, 0);
  await settle(page);
  const start = await stats(page);
  expect(start.drawn).toBeGreaterThan(0);
  expect(start.meshed).toBe(64);
  expect(start.deepestDrawnStart).toBeLessThanOrEqual(start.far);

  await readState(page, 'placePlayer', 8, 40, 8, Math.atan2(WORLD_SIZE / 2 - 8, WORLD_SIZE / 2 - 8));
  await settle(page);
  const corner = await stats(page);
  expect(corner.drawn).toBeGreaterThan(0);
  expect(corner.deepestDrawnStart).toBeLessThanOrEqual(corner.far);
  console.log(`chunkStats start ${JSON.stringify(start)} corner ${JSON.stringify(corner)}`);
});

test('AC240: with ?near=1 only chunks near the player have a mesh', async ({ page }) => {
  await readState(page, 'placePlayer', 8, 40, 8, 0);
  await page.waitForTimeout(1500);
  const s = await stats(page);
  expect(s.meshed).toBeLessThan(64);
  expect(s.farthestMeshedChunks).toBeLessThanOrEqual(6);
  expect(s.farthestDrawnChunks).toBeLessThanOrEqual(4);
});

test('AC240: a 30 second walk logs the 95 percent and the worst frame time', async ({ page }) => {
  test.setTimeout(60_000);
  const loop: [number, number][] = [[64, 64], [100, 64], [100, 100], [64, 100], [28, 100], [28, 28], [64, 28]];
  const result = await page.evaluate(async (path) => {
    const hooks = (window as unknown as { __dino: Record<string, (...a: unknown[]) => unknown> }).__dino;
    const times: number[] = [];
    const t0 = performance.now();
    let last = t0;
    let lastMove = t0;
    return new Promise<{ p95: number; worst: number; frames: number }>((resolve) => {
      const tick = (now: number) => {
        times.push(now - last);
        last = now;
        if (now - lastMove > 150) {
          lastMove = now;
          const [tx = 64, tz = 64] = path[Math.floor((now - t0) / 4000) % path.length] ?? [64, 64];
          hooks.placePlayer?.(tx + Math.sin(now / 700) * 4, 40, tz + Math.cos(now / 700) * 4, (now / 1500) % (Math.PI * 2));
        }
        if (now - t0 < 30_000) {
          requestAnimationFrame(tick);
          return;
        }
        const sorted = times.slice(5).sort((a, b) => a - b);
        resolve({ p95: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0, worst: sorted[sorted.length - 1] ?? 0, frames: sorted.length });
      };
      requestAnimationFrame(tick);
    });
  }, loop);
  console.log(`walk 30 s: p95 ${result.p95.toFixed(1)} ms, worst ${result.worst.toFixed(1)} ms, frames ${result.frames}`);
  expect(result.frames).toBeGreaterThan(0);
});
