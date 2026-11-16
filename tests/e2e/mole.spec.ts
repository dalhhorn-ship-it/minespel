// The whole Monstermol visit (V16e, changed in V22c, AC245, AC246, AC247, AC295, AC298, AC299): wake, he comes up near the
// animals and away from the kid, a tease, a fence never makes him leave, the shaft climb out, no rumble after a reload,
// crash or kill and a free mole that stays and is saved, and the taps on a caught mole with knights around.
import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';
import { dig, DinoView, fence, hatch, mole, Pose, prepareMole, topOf, until, worldRecord } from './helpers/mole';
import { STEEN } from '../../src/world/blocks';

async function start(page: Page, seed = 5) {
  await openApp(page);
  await prepareMole(page, seed);
}

test.describe('Monstermol, a whole visit (V16e)', () => {
  test('AC245 AC246 AC247: he comes up near the animals and away from the kid, and teases one', async ({ page }) => {
    await start(page);
    await hatch(page, 3);
    const kid = await readState<Pose>(page, 'player');
    await dig(page, 2);
    expect((await mole(page)).phase).toBe('rumble');
    await readState(page, 'fastForward', 3500);
    const m = await mole(page);
    expect(m.phase).toBe('out');
    expect(m.began.out! - m.began.rumble!).toBeGreaterThanOrEqual(3000);
    await expect.poll(async () => (await readState<Array<{ text: string }>>(page, 'toastLog')).map((t) => t.text), { timeout: 8000 })
      .toContain('Bouw een hek van 2 hoog om hem heen.');
    // Away from the kid: more than 5 along x and z, and within 16 of an animal.
    expect(Math.max(Math.abs(m.x - kid.x), Math.abs(m.z - kid.z))).toBeGreaterThan(5);
    const dinos = await readState<DinoView[]>(page, 'dinos');
    const nearest = Math.min(...dinos.map((d) => Math.max(Math.abs(d.x - m.x), Math.abs(d.z - m.z))));
    expect(nearest).toBeLessThanOrEqual(16.5);
    // A tease: he walks to an animal and it runs away.
    let teased = false;
    let went = false;
    for (let i = 0; i < 600 && !teased; i++) {
      await readState(page, 'fastForward', 250);
      const now = await mole(page);
      if (now.target) went = true;
      if (now.phase !== 'out') break;
      teased = (await readState<DinoView[]>(page, 'dinos')).some((d) => d.flee !== undefined);
    }
    expect(went).toBe(true);
    expect(teased).toBe(true);
  });

  test('AC295: a wall 2 high round the animals: he says Hmpf after 10 s, at most once a minute, and he stays out', async ({ page }) => {
    await start(page);
    const dinos = await hatch(page, 2);
    const kid = await readState<Pose>(page, 'player');
    const cx = Math.floor(kid.x);
    const cz = Math.floor(kid.z);
    for (const d of dinos) expect(Math.max(Math.abs(d.x - kid.x), Math.abs(d.z - kid.z))).toBeLessThan(4);
    expect(await fence(page, cx, cz, 5)).toBeGreaterThan(40);
    await dig(page, 2);
    await readState(page, 'fastForward', 3500);
    expect((await mole(page)).phase).toBe('out');
    // Let the greeting line run out (it runs on real time), then watch the give up line.
    await readState(page, 'pauseGame');
    await expect(page.locator('.speech-line')).toBeHidden({ timeout: 20_000 });
    await readState(page, 'resumeGame');
    await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(true);
    const m = await until(page, (v) => v.noPathMs >= 10_000, 30_000);
    expect(m.noPathMs).toBeGreaterThanOrEqual(10_000);
    expect(m.phase).toBe('out');
    const hmpf = async () => (await readState<Array<{ text: string }>>(page, 'toastLog')).filter((t) => t.text === 'Hmpf! Ik kan er niet bij.').length;
    await expect.poll(hmpf, { timeout: 10_000 }).toBe(1);
    // He stays: 50 more seconds, still out, still one Hmpf (the next one comes after a minute).
    await readState(page, 'fastForward', 50_000);
    expect((await mole(page)).phase).toBe('out');
    expect(await hmpf()).toBe(1);
    expect(await readState<DinoView[]>(page, 'dinos')).toHaveLength(2);
  });

  test('AC246: the kid at the bottom of a shaft can climb out while the mole is there', async ({ page }) => {
    await start(page);
    const kid = await readState<Pose>(page, 'player');
    const x = Math.floor(kid.x);
    const z = Math.floor(kid.z);
    const ground = await topOf(page, x, z);
    const bottom = 5;
    expect(ground - bottom).toBeGreaterThanOrEqual(8);
    await page.evaluate(
      ({ x, z, bottom, ground }) => {
        const h = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
        for (let y = bottom; y <= ground; y++) h.setBlock!(x, y, z, 0, 1);
        h.rebuildWorld!();
        h.placePlayer!(x + 0.5, bottom, z + 0.5, 0);
      },
      { x, z, bottom, ground },
    );
    await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
    // Digging under the kid's feet wakes him (y 4 is under the stripes at y 5).
    expect(await readState(page, 'mineAt', x, bottom - 1, z)).toBe(true);
    await readState(page, 'fastForward', 3500);
    const m = await mole(page);
    expect(m.phase).toBe('out');
    // He is not in the shaft (with no animal he comes up 4 to 6 from the dig column, AC294), and nothing was put into it.
    const away = Math.max(Math.abs(Math.floor(m.x) - x), Math.abs(Math.floor(m.z) - z));
    expect(away).toBeGreaterThanOrEqual(4);
    expect(away).toBeLessThanOrEqual(6);
    for (let y = bottom; y <= ground; y++) expect(await readState(page, 'blockAt', x, y, z)).toBe(0);
    await readState(page, 'ascendPlayer', true);
    await expect.poll(async () => (await readState<Pose>(page, 'player')).y, { timeout: 15_000 }).toBeGreaterThan(ground + 1);
    await readState(page, 'ascendPlayer', false);
  });
});

test.describe('No rumble after a reload, crash or kill, and a free mole is back (V16e, V22c, AC253, AC299)', () => {
  for (const state of ['rumble', 'out'] as const) {
    for (const how of ['reload', 'crash', 'kill'] as const) {
      test(`AC299: ${how} during ${state === 'rumble' ? 'the rumble' : 'the mole being out'} gives ${state === 'rumble' ? 'no mole' : 'the free mole back'} and the same world record`, async ({ page }) => {
        await start(page);
        await dig(page);
        if (state === 'out') await readState(page, 'fastForward', 3500);
        expect((await mole(page)).phase).toBe(state);
        await readState(page, 'flushSave');
        const before = await worldRecord(page);
        expect(before).not.toBe('null');
        let next: Page = page;
        if (how === 'reload') {
          await page.reload();
          await openApp(page);
        } else if (how === 'crash') {
          const context = page.context();
          await page.close();
          next = await context.newPage();
          await openApp(next);
        } else {
          next = await killApp(page);
        }
        const wanted = state === 'rumble' ? 'none' : 'out';
        const m = await mole(next);
        expect(m.phase).toBe(wanted);
        await next.waitForTimeout(500);
        expect((await mole(next)).phase).toBe(wanted);
        expect(await worldRecord(next)).toBe(before);
      });
    }
  }

  test('AC253: Wereld opnieuw beginnen removes him', async ({ page }) => {
    await start(page);
    await setupPin(page);
    await dig(page);
    await readState(page, 'fastForward', 3500);
    expect((await mole(page)).phase).toBe('out');
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await page.locator('.parent-settings').waitFor();
    for (const name of ['Wereld opnieuw beginnen', /Ja, maak een nieuwe wereld/]) {
      const b = page.locator('.parent-settings button', { hasText: name }).first();
      await b.scrollIntoViewIfNeeded();
      await b.tap();
    }
    await expect.poll(async () => (await mole(page)).phase).toBe('none');
    await page.locator('.parent-close-btn').tap().catch(() => undefined);
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('world');
    await readState(page, 'fastForward', 5000);
    expect((await mole(page)).phase).toBe('none');
  });
});

test.describe('Taps on a caught mole with knights around (V22c, AC298)', () => {
  test('AC298: with a knight on each of 3 modes no knight goes to the caught mole in 10 minutes and the tap card shows', async ({ page }) => {
    await start(page);
    await hatch(page, 2);
    await dig(page, 2);
    await readState(page, 'fastForward', 3500);
    const m = await mole(page);
    expect(m.phase).toBe('out');
    const cx = Math.floor(m.x);
    const cz = Math.floor(m.z);
    const y = Math.round(m.y);
    await readState(page, 'pauseGame');
    await page.evaluate(
      ({ cx, cz, y, stone }) => {
        const h = (window as unknown as { __dino: Record<string, (...v: number[]) => void> }).__dino;
        for (let x = cx - 7; x <= cx + 7; x++) {
          for (let z = cz - 7; z <= cz + 7; z++) {
            h.setBlock!(x, y - 1, z, stone, 1);
            for (let a = y; a < y + 6; a++) h.setBlock!(x, a, z, 0, 1);
          }
        }
        for (let x = cx - 2; x <= cx + 2; x++) {
          for (let z = cz - 2; z <= cz + 2; z++) {
            if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) === 2) for (let a = y; a < y + 2; a++) h.setBlock!(x, a, z, stone, 1);
          }
        }
        h.rebuildWorld!();
      },
      { cx, cz, y, stone: STEEN },
    );
    await readState(page, 'resumeGame');
    await expect.poll(async () => (await readState<{ moles: Array<{ state: string }> }>(page, 'moleState')).moles[0]?.state, { timeout: 15_000 }).toBe('caught');
    for (const mode of ['guard', 'follow', 'chase']) expect(await readState(page, 'addKnight', mode)).not.toBeNull();
    for (let i = 0; i < 20; i++) {
      await readState(page, 'fastForward', 30_000);
      const now = await mole(page);
      expect(now.pokers).toBe(0);
      expect(now.moed).toBe(0);
      const knights = await readState<Array<{ chase?: unknown }>>(page, 'knights');
      expect(knights.every((k) => !k.chase)).toBe(true);
    }
    const state = await readState<{ moles: Array<{ state: string }> }>(page, 'moleState');
    expect(state.moles.map((e) => e.state)).toEqual(['caught']);
    expect(await readState(page, 'tapMole', 0)).toBe(true);
    await expect(page.locator('[data-testid="mole-tap-card"]')).toBeVisible();
    await page.locator('[data-testid="mole-tap-ok"]').tap();
    await expect(page.locator('[data-testid="mole-tap-card"]')).toHaveCount(0);
  });
});
