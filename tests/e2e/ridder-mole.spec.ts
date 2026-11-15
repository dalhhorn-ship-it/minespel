// A knight sends the Monstermol off (V16d, AC251): the Moed bar fills, the lines show, the mole is gone, the knight is
// back in his mode.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Mole { phase: string; moed: number; pokers: number }
interface Knight { id: string; mode: string }

async function wake(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  const pose = await readState<{ x: number; z: number }>(page, 'player');
  expect(await readState(page, 'mineAt', Math.floor(pose.x) + 4, 3, Math.floor(pose.z))).toBe(true);
}

test.describe('Knight against the Monstermol (V16d)', () => {
  test('AC251: one knight sends the mole off, the lines show and the knight is back in his mode', async ({ page }) => {
    await wake(page);
    await readState(page, 'addKnight', 'guard');
    let poked = false;
    let out = false;
    let m = await readState<Mole>(page, 'moleState');
    // Up to the last seconds of the bar; the speech line runs on real time, so let the earlier lines drain first.
    for (let i = 0; i < 400 && m.moed < 12; i++) {
      await readState(page, 'fastForward', 250);
      m = await readState<Mole>(page, 'moleState');
      if (m.phase === 'out') out = true;
      if (m.pokers > 0) poked = true;
    }
    expect(out).toBe(true);
    expect(poked).toBe(true);
    expect(m.phase).toBe('out');
    const line = page.locator('.speech-line');
    await readState(page, 'pauseGame');
    await expect(line).toBeHidden({ timeout: 20_000 });
    await readState(page, 'resumeGame');
    await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(true);
    for (let i = 0; i < 40 && m.phase === 'out'; i++) {
      await readState(page, 'fastForward', 250);
      m = await readState<Mole>(page, 'moleState');
    }
    await expect(line).toHaveText('Wegwezen!');
    await expect(line).toHaveText('Oké, oké, ik ga al!', { timeout: 5000 });
    for (let i = 0; i < 20 && m.phase !== 'none'; i++) {
      await readState(page, 'fastForward', 250);
      m = await readState<Mole>(page, 'moleState');
    }
    expect((await readState<Mole>(page, 'moleState')).phase).toBe('none');
    const knights = await readState<Knight[]>(page, 'knights');
    expect(knights[0]!.mode).toBe('guard');
  });
});
