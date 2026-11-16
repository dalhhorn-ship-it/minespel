// Away and back (V22c, AC330): a mole sent away is out of the world for 60 to 90 s of play time (the time stands still
// in every pause), then he comes back with a soft rumble near an animal and the two lines. The away state is set by the
// seams hook `sendMoleAway` (V22d's Moed bar sets the same state).
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { dig, DinoView, hatch, mole, prepareMole } from './helpers/mole';

interface Entry { id: number; x: number; y: number; z: number; state: 'free' | 'away' | 'caught'; awayMsLeft: number }
const moles = async (page: Page) => (await readState<{ moles: Entry[] }>(page, 'moleState')).moles;
const toasts = async (page: Page) => (await readState<Array<{ text: string }>>(page, 'toastLog')).map((t) => t.text);

async function moleUp(page: Page) {
  await openApp(page);
  await prepareMole(page, 5);
  await hatch(page, 2);
  await dig(page, 2);
  await readState(page, 'fastForward', 3500);
  expect((await mole(page)).phase).toBe('out');
}

test.describe('De mol is weg en komt terug (V22c)', () => {
  test('AC330: away he is out of the world and cannot be tapped; the time left stands still while the game is paused', async ({ page }) => {
    await moleUp(page);
    expect(await readState(page, 'sendMoleAway', 60_000)).toBe(true);
    await readState(page, 'fastForward', 2000);
    const [away] = await moles(page);
    expect(away?.state).toBe('away');
    expect(away?.awayMsLeft).toBeGreaterThan(55_000);
    expect(await readState(page, 'tapMole', 0)).toBe(false);
    // Nothing is teased and no mole view is drawn while he is away.
    const dinos = await readState<DinoView[]>(page, 'dinos');
    expect(dinos.every((d) => d.flee === undefined)).toBe(true);
    // A pause: the time left does not change.
    await readState(page, 'pauseGame');
    const left = (await moles(page))[0]?.awayMsLeft;
    await page.waitForTimeout(1500);
    expect((await moles(page))[0]?.awayMsLeft).toBe(left);
    await readState(page, 'resumeGame');
  });

  test('AC330: after his time he comes back with "Hihi! De Monstermol is terug." and the help line, within 16 of an animal', async ({ page }) => {
    await moleUp(page);
    // Toasts run on real time: let the greeting lines run out first, so the come back lines show at once.
    await readState(page, 'pauseGame');
    await expect(page.locator('.speech-line')).toBeHidden({ timeout: 20_000 });
    await readState(page, 'resumeGame');
    await expect.poll(() => readState<boolean>(page, 'gameRunning')).toBe(true);
    expect(await readState(page, 'sendMoleAway', 20_000)).toBe(true);
    await readState(page, 'fastForward', 2000);
    expect((await moles(page))[0]?.state).toBe('away');
    // Just before the end he is still away; after it he is up.
    await readState(page, 'fastForward', 16_000);
    expect((await moles(page))[0]?.state).toBe('away');
    await readState(page, 'fastForward', 4000);
    const [back] = await moles(page);
    expect(back?.state).toBe('free');
    expect((await mole(page)).phase).toBe('out');
    const dinos = await readState<DinoView[]>(page, 'dinos');
    const nearest = Math.min(...dinos.map((d) => Math.max(Math.abs(d.x - (back as Entry).x), Math.abs(d.z - (back as Entry).z))));
    expect(nearest).toBeLessThanOrEqual(16.5);
    const texts = () => toasts(page);
    await expect.poll(texts, { timeout: 15_000 }).toContain('Hihi! De Monstermol is terug.');
    await expect.poll(texts, { timeout: 15_000 }).toContain('Bouw een hek van 2 hoog om hem heen.');
    // He walks to an animal again.
    let went = false;
    for (let i = 0; i < 40 && !went; i++) {
      await readState(page, 'fastForward', 250);
      went = (await mole(page)).target !== null;
    }
    expect(went).toBe(true);
  });

  test('AC330: while he is away the pill points at no mole', async ({ page }) => {
    await moleUp(page);
    await readState(page, 'sendMoleAway', 60_000);
    await readState(page, 'fastForward', 2000);
    const hud = await readState<{ kind: string; shown: boolean } | null>(page, 'bubbleHud');
    expect(hud?.kind === 'mole' && hud.shown).toBeFalsy();
  });
});
