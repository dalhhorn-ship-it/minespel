// The fourth knight mode, Jaag monsters weg (v22, AC337): knights on it go after the free mole wherever he is, poke,
// chase him off (he runs away, he is never removed), and walk back to their spot while he is away.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface MoleEntry { id: number; state: string; awayMsLeft: number }
interface MoleView { phase: string; pokers: number; moed: number; moles: MoleEntry[] }
interface Knight { id: string; mode: string; x: number; z: number; spot: { x: number; z: number } | null }

async function start(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
}

async function wake(page: Page) {
  const pose = await readState<{ x: number; z: number }>(page, 'player');
  expect(await readState(page, 'mineAt', Math.floor(pose.x) + 4, 3, Math.floor(pose.z))).toBe(true);
}

/** Plays forward in 250 ms steps until `done` is true. Returns the play ms it took. */
async function until(page: Page, done: (m: MoleView) => boolean, maxMs = 120_000): Promise<number> {
  let ms = 0;
  while (ms < maxMs) {
    const m = await readState<MoleView>(page, 'moleState');
    if (done(m)) return ms;
    ms += await readState<number>(page, 'fastForward', 250);
    if (ms === 0) break;
  }
  throw new Error('the mole never reached the wanted state');
}

for (const n of [1, 3]) {
  test(`AC337: ${n} knight${n > 1 ? 's' : ''} on Jaag monsters weg chase the free mole off, never remove him and walk back`, async ({ page }) => {
    await start(page);
    for (let i = 0; i < n; i++) expect(await readState<string | null>(page, 'addKnight', 'chase')).not.toBeNull();
    await wake(page);
    await until(page, (m) => m.phase === 'out', 10_000);
    // The mole is out: every knight on the mode goes to him, the bar fills and he is sent away.
    let sawPokers = 0;
    const took = await until(page, (m) => {
      sawPokers = Math.max(sawPokers, m.pokers);
      return m.moles.length === 1 && m.moles[0]!.state === 'away' && m.moles[0]!.awayMsLeft > 0;
    });
    expect(sawPokers).toBe(n);
    // AC251 and AC262: 1 knight 15 s, 3 knights 5 s of poking, plus the walk to him; never under 3 s.
    expect(took).toBeGreaterThanOrEqual(n === 1 ? 14_000 : 4_000);
    expect(took).toBeLessThanOrEqual(n === 1 ? 40_000 : 30_000);
    const m = await readState<MoleView>(page, 'moleState');
    expect(m.moles).toHaveLength(1);
    expect(m.moles[0]!.awayMsLeft).toBeGreaterThan(40_000);
    // While he is away they walk back to their spot, keep the mode, and stay within 1 block of it.
    await until(page, () => false, 20_000).catch(() => undefined);
    for (const k of await readState<Knight[]>(page, 'knights')) {
      expect(k.mode).toBe('chase');
      expect(Math.hypot(k.x - k.spot!.x, k.z - k.spot!.z)).toBeLessThanOrEqual(1.2);
    }
    expect((await readState<MoleView>(page, 'moleState')).moles).toHaveLength(1);
  });
}
