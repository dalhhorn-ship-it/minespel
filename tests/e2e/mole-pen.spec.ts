// The pen (V22c, AC296): a closed wall 2 high round the free mole catches him within 3 s, a pen up to 6 x 6 does too,
// a wall 1 high never does, and one block mined frees him again. Walls are built with the `setBlock` hook.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { openApp, readState } from './helpers/app';
import { dig, hatch, mole, prepareMole } from './helpers/mole';

interface Entry { id: number; x: number; y: number; z: number; state: 'free' | 'away' | 'caught'; awayMsLeft: number }
const moles = async (page: Page) => (await readState<{ moles: Entry[] }>(page, 'moleState')).moles;
const toasts = async (page: Page) => (await readState<Array<{ text: string }>>(page, 'toastLog')).map((t) => t.text);

/** Mole up with one animal near the kid, as the other mole specs. */
async function moleUp(page: Page) {
  await openApp(page);
  await prepareMole(page, 5);
  await hatch(page, 1);
  await dig(page, 2);
  await readState(page, 'fastForward', 3500);
  expect((await mole(page)).phase).toBe('out');
  return (await moles(page))[0] as Entry;
}

/**
 * Flat ground round the cell, then a ring of walls `height` high with the inside x from x0 to x1 and z from z0 to z1.
 * `gap` leaves one cell of the ring open. The mole stays at his own cell: nothing here moves him.
 */
async function pen(page: Page, a: { y: number; x0: number; x1: number; z0: number; z1: number; height: number; gap?: { x: number; z: number } }) {
  await page.evaluate(
    ({ a, stone }) => {
      const h = (window as unknown as { __dino: Record<string, (...v: number[]) => void> }).__dino;
      for (let x = a.x0 - 6; x <= a.x1 + 6; x++) {
        for (let z = a.z0 - 6; z <= a.z1 + 6; z++) {
          h.setBlock!(x, a.y - 1, z, stone, 1);
          for (let y = a.y; y < a.y + 6; y++) h.setBlock!(x, y, z, 0, 1);
        }
      }
      for (let x = a.x0 - 1; x <= a.x1 + 1; x++) {
        for (let z = a.z0 - 1; z <= a.z1 + 1; z++) {
          if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) continue;
          if (a.gap && a.gap.x === x && a.gap.z === z) continue;
          for (let y = a.y; y < a.y + a.height; y++) h.setBlock!(x, y, z, stone, 1);
        }
      }
      h.rebuildWorld!();
    },
    { a, stone: STEEN },
  );
}

/**
 * Stands the kid `dist` blocks south of mole 0 (looking north is yaw 0, +z), `side` blocks to the right (negative: left)
 * and `up` blocks higher on a stone column, then taps the real screen point of the mole. Everything runs in one page
 * call, so the mole cannot move between the placing and the tap. Returns where it tapped and the half it landed in.
 */
async function tapMoleOnScreen(page: Page, side: number, up = 0, dist = 4, inside?: { x0: number; x1: number; z0: number; z1: number }) {
  return page.evaluate(
    ({ side, up, dist, inside, stone }) => {
      const h = (window as unknown as { __dino: Record<string, (...v: number[]) => unknown> }).__dino;
      const m = (h.moleState!() as { moles: Array<{ x: number; y: number; z: number }> }).moles[0]!;
      // Right is -x at yaw 0, so a kid with a bigger x sees the mole to his right.
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const px = clamp(Math.floor(m.x) + side, inside?.x0 ?? -1e9, inside?.x1 ?? 1e9);
      const pz = clamp(Math.floor(m.z) - dist, inside?.z0 ?? -1e9, inside?.z1 ?? 1e9);
      const base = Math.round(m.y);
      for (let y = base; y < base + up; y++) h.setBlock!(px, y, pz, stone, 1);
      h.rebuildWorld!();
      h.placePlayer!(px + 0.5, base + up, pz + 0.5, 0);
      const at = h.moleScreenPoint!(0) as { x: number; y: number } | null;
      if (!at) return null;
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: 11, pointerType: 'touch', clientX: at.x, clientY: at.y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
      return { x: at.x, y: at.y, width: window.innerWidth };
    },
    { side, up, dist, inside, stone: STEEN },
  );
}

/** Forward in loop time until `done`, at most `maxMs`, in steps of 250. */
async function until(page: Page, done: (e: Entry) => boolean, maxMs: number): Promise<Entry> {
  let e = (await moles(page))[0] as Entry;
  for (let t = 0; t < maxMs && !done(e); t += 250) {
    await readState(page, 'fastForward', 250);
    e = (await moles(page))[0] as Entry;
  }
  return e;
}

test.describe('Gevangen in een hek (V22c)', () => {
  test('AC296: a wall 2 high with 3 x 3 inside catches him within 3 s, with the line, Zzz and the sign, and he stays 10 minutes', async ({ page }) => {
    const m = await moleUp(page);
    // He stays in the middle cell while the pen goes up.
    await readState(page, 'pauseGame');
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    const y = Math.round(m.y);
    await pen(page, { y, x0: cx - 1, x1: cx + 1, z0: cz - 1, z1: cz + 1, height: 2 });
    await readState(page, 'resumeGame');
    const e = await until(page, (v) => v.state === 'caught', 3000);
    expect(e.state).toBe('caught');
    // Toasts show on real time, one after the other.
    await expect.poll(() => toasts(page), { timeout: 15_000 }).toContain('Goed gedaan! De Monstermol is gevangen.');
    // The sleep pose, Zzz and the sign "Gevangen!" are in the label pool.
    await expect(page.locator('.actor-label', { hasText: 'Zzz' })).toHaveCount(1);
    await expect(page.locator('.actor-label', { hasText: 'Gevangen!' })).toHaveCount(1);
    const at = { x: e.x, z: e.z };
    for (let i = 0; i < 20; i++) await readState(page, 'fastForward', 30_000);
    const later = (await moles(page))[0] as Entry;
    expect(later.state).toBe('caught');
    expect({ x: later.x, z: later.z }).toEqual(at);
    expect((await toasts(page)).filter((t) => t === 'Boe!')).toHaveLength(0);
    const dinos = await readState<Array<{ flee?: unknown }>>(page, 'dinos');
    expect(dinos.every((d) => d.flee === undefined)).toBe(true);
  });

  test('AC296: a pen with 6 x 6 inside catches him too', async ({ page }) => {
    const m = await moleUp(page);
    await readState(page, 'pauseGame');
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    await pen(page, { y: Math.round(m.y), x0: cx - 2, x1: cx + 3, z0: cz - 2, z1: cz + 3, height: 2 });
    await readState(page, 'resumeGame');
    const e = await until(page, (v) => v.state === 'caught', 3000);
    expect(e.state).toBe('caught');
  });

  test('AC296: one wall block mined and he is free within 3 s, with "Hihi, ik ben vrij!"', async ({ page }) => {
    const m = await moleUp(page);
    await readState(page, 'pauseGame');
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    const y = Math.round(m.y);
    await pen(page, { y, x0: cx - 1, x1: cx + 1, z0: cz - 1, z1: cz + 1, height: 2 });
    await readState(page, 'resumeGame');
    expect((await until(page, (v) => v.state === 'caught', 3000)).state).toBe('caught');
    // Mining the top block of one wall leaves a step of 1: he walks out.
    expect(await readState(page, 'mineAt', cx + 2, y + 1, cz)).toBe(true);
    const e = await until(page, (v) => v.state === 'free', 3000);
    expect(e.state).toBe('free');
    await expect.poll(() => toasts(page), { timeout: 15_000 }).toContain('Hihi, ik ben vrij!');
  });

  test('AC296: a wall only 1 high never catches him', async ({ page }) => {
    const m = await moleUp(page);
    await readState(page, 'pauseGame');
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    await pen(page, { y: Math.round(m.y), x0: cx - 1, x1: cx + 1, z0: cz - 1, z1: cz + 1, height: 1 });
    await readState(page, 'resumeGame');
    await readState(page, 'fastForward', 8000);
    expect((await moles(page))[0]?.state).toBe('free');
  });

  test('AC298: tapMole on the caught mole shows the Zzz card with an OK of 56 x 56 or more and mines nothing; OK closes it', async ({ page }) => {
    const m = await moleUp(page);
    await readState(page, 'pauseGame');
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    const y = Math.round(m.y);
    await pen(page, { y, x0: cx - 1, x1: cx + 1, z0: cz - 1, z1: cz + 1, height: 2 });
    await readState(page, 'resumeGame');
    expect((await until(page, (v) => v.state === 'caught', 3000)).state).toBe('caught');
    const before = await readState<number>(page, 'blockAt', cx + 2, y, cz);
    expect(await readState(page, 'tapMole', 0)).toBe(true);
    await expect(page.locator('[data-testid="mole-tap-text"]')).toHaveText('Zzz... de Monstermol slaapt in zijn hok.');
    const box = await page.locator('[data-testid="mole-tap-ok"]').boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(56);
    expect(box?.height).toBeGreaterThanOrEqual(56);
    expect(await readState<number>(page, 'blockAt', cx + 2, y, cz)).toBe(before);
    await page.locator('[data-testid="mole-tap-ok"]').tap();
    await expect(page.locator('[data-testid="mole-tap-card"]')).toHaveCount(0);
    expect((await moles(page))[0]?.state).toBe('caught');
  });

  test('AC298: a tap on the caught mole opens the Zzz card in the left part, the middle and the right part of the screen', async ({ page }) => {
    await moleUp(page);
    await readState(page, 'pauseGame');
    const m = (await moles(page))[0] as Entry;
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    // A pen of 6 x 6 with the kid inside it: a 2 high wall between the eye and the mole would hide him from a tap by design. The kid is put on a cell inside it.
    await pen(page, { y: Math.round(m.y), x0: cx - 3, x1: cx + 2, z0: cz - 3, z1: cz + 2, height: 2 });
    await readState(page, 'resumeGame');
    expect((await until(page, (v) => v.state === 'caught', 3000)).state).toBe('caught');
    for (const [name, side] of [['left', -2], ['middle', 0], ['right', 2]] as const) {
      
      const tapped = await tapMoleOnScreen(page, side, 0, 3, { x0: cx - 3, x1: cx + 2, z0: cz - 3, z1: cz + 2 });
      expect(tapped, name).not.toBeNull();
      if (name === 'left') expect(tapped!.x).toBeLessThan(tapped!.width / 2);
      if (name === 'right') expect(tapped!.x).toBeGreaterThan(tapped!.width / 2);
      await expect(page.locator('[data-testid="mole-tap-card"]'), name).toBeVisible();
      await page.locator('[data-testid="mole-tap-ok"]').tap();
      await expect(page.locator('[data-testid="mole-tap-card"]')).toHaveCount(0);
    }
  });

  test('AC292: a tap on the free mole in the left part, the middle and the right part says the help line each time', async ({ page }) => {
    const m = await moleUp(page);
    const help = async () => (await toasts(page)).filter((t) => t === 'Bouw een hek van 2 hoog om hem heen.').length;
    await readState(page, 'pauseGame');
    await pen(page, { y: Math.round(m.y), x0: Math.floor(m.x) - 1, x1: Math.floor(m.x) + 1, z0: Math.floor(m.z) - 1, z1: Math.floor(m.z) + 1, height: 0 });
    await readState(page, 'resumeGame');
    for (const [name, side] of [['left', -2], ['middle', 0], ['right', 2]] as const) {
      await readState(page, 'fastForward', 5500);
      const before = await help();
      const tapped = await tapMoleOnScreen(page, side);
      expect(tapped, name).not.toBeNull();
      if (name === 'left') expect(tapped!.x).toBeLessThan(tapped!.width / 2);
      if (name === 'right') expect(tapped!.x).toBeGreaterThan(tapped!.width / 2);
      await expect.poll(help, { timeout: 8000 }).toBe(before + 1);
    }
  });
});
