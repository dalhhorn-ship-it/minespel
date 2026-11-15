// A knight sends Klodder off (V18d, AC216): the Moed bar fills, Klodder leaves, the knight is back in his mode.
import { expect, test } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Knight { id: string; mode: string; x: number; y: number; z: number }
interface Monster { phase: string; klodder: { moed: number; pokers: number } | null; hiddenCount: number }

test.describe('Knight against Klodder (V18d)', () => {
  test('AC216: one knight sends Klodder off and is back in his mode', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 4);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'addKnight', 'guard');
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    let poked = false;
    for (let i = 0; i < 70; i++) {
      await readState(page, 'fastForward', 1000);
      const m = await readState<Monster>(page, 'monsterState');
      if (m.klodder && m.klodder.pokers > 0) poked = true;
      if (m.phase === 'idle') break;
    }
    const m = await readState<Monster>(page, 'monsterState');
    expect(poked).toBe(true);
    expect(m.phase).toBe('idle');
    expect(m.hiddenCount).toBe(0);
    const knights = await readState<Knight[]>(page, 'knights');
    expect(knights[0]!.mode).toBe('guard');
  });
});
