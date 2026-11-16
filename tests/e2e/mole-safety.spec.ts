// The mole rules over a long run (V22e, AC336): 5 chase offs in 30 minutes of play keep every rule of AC220 and AC252,
// teases are 15 s apart, every come up and come back brings the help line, and a pen still catches him after a come back.
// A second session with moles, a knight and the pill makes no request beyond the app, and every line shows as text with
// the sound off and Volume 0.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { dig, DinoView, fence, hatch, mole, prepareMole, topOf } from './helpers/mole';

interface Entry { id: number; x: number; y: number; z: number; state: 'free' | 'away' | 'caught'; awayMsLeft: number }
interface Toast { text: string }
interface Pose { x: number; y: number; z: number }
const moles = async (page: Page) => (await readState<{ moles: Entry[]; loopMs: number }>(page, 'moleState')).moles;
const loopMs = async (page: Page) => (await readState<{ loopMs: number }>(page, 'moleState')).loopMs;
const HELP = 'Bouw een hek van 2 hoog om hem heen.';
const UP = 'De Monstermol is boven! Hij zoekt je dieren.';
const BACK = 'Hihi! De Monstermol is terug.';
const MINUTE = 60_000;

async function moleUp(page: Page, animals: number) {
  await openApp(page);
  await prepareMole(page, 5);
  await readState(page, 'resetPlayTimer', 3600);
  const dinos = await hatch(page, animals);
  await dig(page, 2);
  await readState(page, 'fastForward', 3500);
  expect((await mole(page)).phase).toBe('out');
  return dinos;
}

function kvPatch(page: Page, name: string, patch: Record<string, unknown>): Promise<void> {
  return page.evaluate(
    ({ key, p }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          const get = store.get(key);
          get.onsuccess = () => store.put({ ...(get.result as object | undefined), ...p }, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: name, p: patch },
  );
}

test.describe('Mole safety (V22e)', () => {
  test('AC336: 5 chase offs in 30 minutes keep every rule, teases are 15 s apart and the help line follows every come up and come back', async ({ page }) => {
    test.setTimeout(540_000);
    const start = await moleUp(page, 3);
    const kid = await readState<Pose>(page, 'player');
    const fleeing = new Set<string>();
    const teases: number[] = [];
    let backs = 0;
    let step = 0;

    /** Steps `ms` of play in 500 ms steps and checks every rule after each step. */
    const play = async (ms: number, until?: () => Promise<boolean>) => {
      for (let t = 0; t < ms; t += 500) {
        await readState(page, 'fastForward', 500);
        step++;
        const dinos = await readState<DinoView[]>(page, 'dinos');
        expect(dinos.length).toBe(start.length);
        const now = await loopMs(page);
        for (const d of dinos) {
          expect(d.mode).toBe('stay');
          if (d.flee !== undefined && !fleeing.has(d.id)) {
            fleeing.add(d.id);
            teases.push(now);
          }
          if (d.flee === undefined) fleeing.delete(d.id);
        }
        for (const m of await moles(page)) {
          if (m.state !== 'free') continue;
          expect(Math.max(Math.abs(m.x - kid.x), Math.abs(m.z - kid.z)), 'the mole keeps 1 block from the kid').toBeGreaterThanOrEqual(1);
        }
        if (step % 20 === 0) expect(await readState<Pose>(page, 'player')).toEqual(kid);
        if (until && (await until())) return;
      }
    };

    for (let i = 0; i < 5; i++) {
      expect(await readState(page, 'sendMoleAway', MINUTE)).toBe(true);
      await play(2 * MINUTE, async () => (await moles(page))[0]?.state === 'free');
      expect((await moles(page))[0]?.state, `cycle ${i} at ${await loopMs(page)}`).toBe('free');
      backs++;
      await play(5 * MINUTE);
    }
    expect(backs).toBe(5);
    expect(await loopMs(page)).toBeGreaterThanOrEqual(25 * MINUTE);

    // The animals were teased now and then, never twice within 15 s.
    expect(teases.length).toBeGreaterThan(0);
    for (let i = 1; i < teases.length; i++) expect(teases[i]! - teases[i - 1]!, `tease ${i}`).toBeGreaterThanOrEqual(14_500);

    // The help line is the very next line after the come up and after each come back. Toasts run on real time, so the
    // order is checked here, and the timing (within 1 s of the event) is in mole-lines.spec.ts and mole-away.spec.ts.
    const log = (await readState<Toast[]>(page, 'toastLog')).map((e) => e.text);
    const next = (line: string) => log.flatMap((t, i) => (t === line ? [log[i + 1]] : []));
    expect(next(UP)).toEqual([HELP]);
    // A line that waits behind others can be dropped when the test runs time faster than real time, so a come back line
    // may be missing; its help line is not: one for the come up and one for each of the 5 come backs.
    expect(next(BACK).every((t) => t === HELP)).toBe(true);
    expect(log.filter((t) => t === HELP).length).toBeGreaterThanOrEqual(6);

    // After a come back a closed wall 2 high catches him within 3 s. The kid steps away first, so the ring never holds him.
    const [free] = await moles(page);
    expect(free?.state).toBe('free');
    const mx = Math.floor(free!.x);
    const mz = Math.floor(free!.z);
    const ky = (await topOf(page, mx + 12, mz)) + 1;
    await readState(page, 'placePlayer', mx + 12.5, ky, mz + 0.5, 0);
    await fence(page, mx, mz, 3);
    await readState(page, 'fastForward', 3000);
    expect((await moles(page))[0]?.state).toBe('caught');
  });

  test('AC336: a session with moles, a knight and the pill makes no request beyond the app, and every mole line shows as text with sound off and Volume 0', async ({ page, baseURL }) => {
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
      if (new URL(u).origin !== new URL(baseURL!).origin) outside.push(u);
    });
    await openApp(page);
    await kvPatch(page, 'settings', { soundEffectsEnabled: false, volume: 0 });
    await page.reload();
    await openApp(page);
    await prepareMole(page, 5);
    await readState(page, 'resetPlayTimer', 3600);
    await hatch(page, 2);
    await readState(page, 'addKnight', 'guard');
    await dig(page, 2);
    await readState(page, 'fastForward', 3500);
    expect((await mole(page)).phase).toBe('out');
    await expect(page.locator('.bubble-pill')).toBeVisible();
    await expect.poll(async () => (await readState<Toast[]>(page, 'toastLog')).map((e) => e.text), { timeout: 20_000 }).toEqual(
      expect.arrayContaining([UP, HELP]),
    );
    expect(await readState(page, 'sendMoleAway', 20_000)).toBe(true);
    await readState(page, 'fastForward', 22_000);
    await expect.poll(async () => (await readState<Toast[]>(page, 'toastLog')).map((e) => e.text), { timeout: 20_000 }).toContain(BACK);
    await readState(page, 'fastForward', 60_000);
    expect(outside).toEqual([]);
  });
});
