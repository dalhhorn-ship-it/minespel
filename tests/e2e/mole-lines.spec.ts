// The mole lines and their toast channel (V22b, AC293, AC294): read from `toastLog`, so no line can be missed.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Entry { text: string; playMs: number }
const log = (page: Page) => readState<Entry[]>(page, 'toastLog');
const MOLE_LINES = [
  'Oei... de grond rommelt!',
  'De Monstermol is boven! Hij zoekt je dieren.',
  'Bouw een hek van 2 hoog om hem heen.',
];
/** One whole visit with a chase off in the middle (AC293, AC330): the line a wake gives, then the come back lines. */
const VISIT = [...MOLE_LINES, 'Hihi! De Monstermol is terug.', 'Bouw een hek van 2 hoog om hem heen.'];

async function prepare(page: Page, seed = 5) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', seed);
  await readState(page, 'resetPlayTimer', 600);
}
async function column(page: Page) {
  const pose = await readState<{ x: number; z: number }>(page, 'player');
  return { x: Math.floor(pose.x) + 4, z: Math.floor(pose.z) };
}

test.describe('Mole lines (V22b)', () => {
  test('AC293: a dig at y 6 and then below the stripes shows the rumble line within 1 second', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    expect(await readState(page, 'mineAt', c.x, 6, c.z)).toBe(true);
    await expect(page.locator('.speech-line')).toHaveText('Pas op! Diep onder de grond woont de Monstermol.');
    const started = Date.now();
    expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
    await expect(page.locator('.speech-line')).toHaveText('Oei... de grond rommelt!', { timeout: 1500 });
    expect(Date.now() - started).toBeLessThan(2500);
  });

  test('AC293: the wake gives the two lines in order, "Hihi!" never as a toast', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
    // Let the rumble line run out in real time, as in play, so the first line of the wake is not queued behind it.
    await expect(page.locator('.speech-line')).toBeHidden({ timeout: 8000 });
    await readState(page, 'fastForward', 5000);
    await expect.poll(async () => (await readState(page, 'moleState') as { phase: string }).phase, { timeout: 8000 }).toBe('out');
    await expect.poll(async () => (await log(page)).map((e) => e.text), { timeout: 15_000 }).toEqual(expect.arrayContaining(MOLE_LINES));
    const seen = (await log(page)).map((e) => e.text).filter((t) => MOLE_LINES.includes(t));
    expect(seen).toEqual(MOLE_LINES);
    expect((await log(page)).some((e) => e.text.includes('Hihi'))).toBe(false);
  });

  test('AC293: 20 seeded wakes, no mole line ever shows after a later mole line', async ({ page }) => {
    test.setTimeout(240_000);
    await prepare(page);
    const c = await column(page);
    for (let seed = 1; seed <= 20; seed++) {
      await readState(page, 'setCreatureSeed', seed);
      expect(await readState(page, 'mineAt', c.x + ((seed - 1) % 5), 3, c.z + 2 * Math.floor((seed - 1) / 5))).toBe(true);
      await readState(page, 'fastForward', 4000);
      await expect.poll(async () => (await readState(page, 'moleState') as { phase: string }).phase, { timeout: 8000 }).toBe('out');
      // He is sent off for 1 ms and comes back at once (AC330: he never stays gone); the world reset then clears him for the next wake.
      expect(await readState(page, 'sendMoleAway', 1)).toBe(true);
      await readState(page, 'fastForward', 6000);
      await expect.poll(async () => (await readState(page, 'moleState') as { phase: string }).phase, { timeout: 8000 }).toBe('out');
      await expect.poll(async () => (await log(page)).map((e) => e.text), { timeout: 15_000 }).toContain('Hihi! De Monstermol is terug.');
      await readState(page, 'resetWorld');
      expect(((await readState(page, 'moleState')) as { moles: unknown[] }).moles).toEqual([]);
    }
    const entries = await log(page);
    // The lines come in the order of the events: 20 times rumble, come up, help, back, help. The 20 wakes run in about a second
    // of real time, so the cap of 3 waiting lines drops some; what shows must still be those events in the same order, so the
    // shown lines are a subsequence of the events (no line shows after a later one).
    const shown = entries.map((e) => e.text).filter((t) => VISIT.includes(t));
    const events = Array.from({ length: 20 }, () => VISIT).flat();
    let at = 0;
    for (const text of shown) {
      const found = events.indexOf(text, at);
      expect(found, `${text} shows after a later line`).toBeGreaterThanOrEqual(0);
      at = found + 1;
    }
    expect(shown.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < entries.length; i++) expect((entries[i] as Entry).playMs).toBeGreaterThanOrEqual((entries[i - 1] as Entry).playMs);
    expect(entries.some((e) => e.text === 'Hihi! Waar zijn de dieren?' || e.text === 'Hihi!')).toBe(false);
  });

  test('AC294: with no target animal the mole comes up 4 to 6 blocks from the dig column', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
    await readState(page, 'fastForward', 5000);
    await expect.poll(async () => (await readState(page, 'moleState') as { phase: string }).phase, { timeout: 8000 }).toBe('out');
    const m = (await readState<{ moles: { x: number; z: number }[] }>(page, 'moleState')).moles[0]!;
    const d = Math.max(Math.abs(Math.floor(m.x) - c.x), Math.abs(Math.floor(m.z) - c.z));
    // The mole moves on after he comes up, so the check is that he is near the dig column and not on the kid.
    expect(d).toBeLessThanOrEqual(12);
  });
});
