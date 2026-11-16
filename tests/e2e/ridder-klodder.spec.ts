// A knight sends Klodder off (V18d, AC216): the Moed bar fills, Klodder leaves, the knight is back in his mode.
// v22 (AC334): guard groups change nothing for Klodder, and no shield mark ever shows for him.
import { expect, test } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { openApp, readState } from './helpers/app';
import { hatch } from './helpers/mole';

interface Knight { id: string; mode: string; x: number; y: number; z: number }
interface Kl { x: number; z: number }
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

  test('AC334: with 2 knights guarding animals a knight still sends Klodder back and no shield mark shows for him', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 4);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'addKnight', 'guard');
    await readState(page, 'addKnight', 'guard');
    await hatch(page, 8);
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    let poked = false;
    for (let i = 0; i < 70; i++) {
      await readState(page, 'fastForward', 1000);
      const m = await readState<Monster>(page, 'monsterState');
      if (m.klodder && m.klodder.pokers > 0) poked = true;
      // Klodder is never a guarded animal and no shield shows while there is no mole.
      expect((await readState<{ animalId: string }[]>(page, 'guardState')).some((e) => e.animalId === 'klodder')).toBe(false);
      await expect(page.locator('.actor-label-shield:not([hidden])')).toHaveCount(0);
      if (m.phase === 'idle') break;
    }
    expect(poked).toBe(true);
    expect((await readState<Monster>(page, 'monsterState')).phase).toBe('idle');
  });

  test('AC216: the Moed bar shows over Klodder while a knight pokes him, fills, and is gone when he leaves', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 4);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'addKnight', 'guard');
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    const bar = page.locator('.moed-bar');
    await expect(bar).toBeHidden();
    let shown = false;
    for (let i = 0; i < 40 && !shown; i++) {
      await readState(page, 'fastForward', 1000);
      shown = !(await bar.evaluate((n) => (n as HTMLElement).hidden));
    }
    expect(shown).toBe(true);
    const first = Number(await bar.getAttribute('data-fill'));
    await readState(page, 'fastForward', 4000);
    const later = Number(await bar.getAttribute('data-fill'));
    expect(later).toBeGreaterThan(first);
    expect(await bar.locator('i').evaluate((n) => (n as HTMLElement).style.width)).not.toBe('0%');
    for (let i = 0; i < 60; i++) {
      await readState(page, 'fastForward', 1000);
      if ((await readState<Monster>(page, 'monsterState')).phase === 'idle') break;
    }
    expect((await readState<Monster>(page, 'monsterState')).phase).toBe('idle');
    await expect(bar).toBeHidden();
  });

  test('AC251: a knight walks to Klodder through the gap in a wall 2 high, he is not popped over it', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setCreatureSeed', 4);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'addKnight', 'guard');
    const start = (await readState<Knight[]>(page, 'knights'))[0]!;
    const wallZ = Math.floor(start.z) + 2;
    // A wall 2 high between the knight and Klodder, with a gap 2 high near its east end.
    const y = Math.floor(start.y);
    const x0 = Math.floor(start.x) - 12;
    const x1 = Math.floor(start.x) + 12;
    for (let x = x0; x <= x1; x++) {
      if (x === x1) continue;
      for (const dy of [0, 1]) await readState(page, 'setBlock', x, y + dy, wallZ, STEEN, 1);
    }
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    const kl = (await readState<{ klodder: Kl }>(page, 'monsterState')).klodder;
    expect(kl.z).toBeGreaterThan(wallZ);
    let last = start;
    let maxJump = 0;
    let poked = false;
    for (let i = 0; i < 400 && !poked; i++) {
      await readState(page, 'fastForward', 100);
      const k = (await readState<Knight[]>(page, 'knights'))[0]!;
      maxJump = Math.max(maxJump, Math.hypot(k.x - last.x, k.z - last.z));
      last = k;
      poked = ((await readState<{ klodder: { pokers: number } | null }>(page, 'monsterState')).klodder?.pokers ?? 0) > 0;
    }
    expect(poked).toBe(true);
    expect(last.z).toBeGreaterThan(wallZ);
    expect(maxJump).toBeLessThan(1);
  });
});
