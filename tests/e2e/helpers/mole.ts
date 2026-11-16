// Shared arrangements for the Monstermol specs (V16e): the mole view, hatching animals, a fence, a wake, the world record.
import { expect, type Page } from '@playwright/test';
import { STEEN } from '../../../src/world/blocks';
import { WORLD_HEIGHT } from '../../../src/world/terrain';
import { readState } from './app';

export interface MoleView {
  phase: 'none' | 'rumble' | 'out' | 'leaving';
  x: number;
  y: number;
  z: number;
  target: string | null;
  noPathMs: number;
  outMs: number;
  moed: number;
  pokers: number;
  loopMs: number;
  began: { rumble: number | null; out: number | null; leaving: number | null };
}
export interface DinoView { id: string; x: number; y: number; z: number; mode: string; flee?: unknown }
export interface Pose { x: number; y: number; z: number }

export const mole = (page: Page) => readState<MoleView>(page, 'moleState');

/** A quiet start: seeded, a long play stretch, no break in the way. */
export async function prepareMole(page: Page, seed = 5) {
  await readState(page, 'setCreatureSeed', seed);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
}

/** Hatches `n` animals next to the kid. They stay (Blijf hier), which is what the mole teases. */
export async function hatch(page: Page, n: number): Promise<DinoView[]> {
  for (let i = 0; i < n; i++) await readState(page, 'addEgg', 'compy', false);
  await readState(page, 'stepDinos', 40);
  const dinos = await readState<DinoView[]>(page, 'dinos');
  expect(dinos.length).toBe(n);
  return dinos;
}

/** The y of the highest block in a column. */
export function topOf(page: Page, x: number, z: number): Promise<number> {
  return page.evaluate(
    ({ x, z, height }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      for (let y = height - 1; y >= 0; y--) if (h.blockAt!(x, y, z) !== 0) return y;
      return 0;
    },
    { x, z, height: WORLD_HEIGHT },
  );
}

/**
 * A closed ring of stone round (cx, cz) at `r`, at least 2 above the ground on both sides. Returns the changed cell count.
 * `floorY` is the level the mole walks on: the wall then stands from 3 below it (the most he drops) to 2 above the
 * highest block near, so a tree canopy (a roof over a walkable gap) cannot leave a gap under the wall.
 */
export async function fence(page: Page, cx: number, cz: number, r: number, floorY?: number): Promise<number> {
  const n = await page.evaluate(
    ({ cx, cz, r, stone, height, floorY }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number | void> }).__dino;
      const top = (x: number, z: number) => {
        for (let y = height - 1; y >= 0; y--) if (h.blockAt!(x, y, z) !== 0) return y;
        return 0;
      };
      let changed = 0;
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = cx + dx;
          const z = cz + dz;
          let hi = 0;
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) hi = Math.max(hi, top(x + a, z + b));
          for (let y = floorY === undefined ? top(x, z) + 1 : Math.round(floorY) - 3; y <= hi + 2; y++) {
            h.setBlock!(x, y, z, stone, 1);
            changed++;
          }
        }
      h.rebuildWorld!();
      return changed;
    },
    { cx, cz, r, stone: STEEN, height: WORLD_HEIGHT, floorY },
  );
  return n as number;
}

/** Digs one block under the stripes, `dx` columns from the kid: the rumble starts. */
export async function dig(page: Page, dx = 4, y = 3): Promise<void> {
  const pose = await readState<Pose>(page, 'player');
  expect(await readState(page, 'mineAt', Math.floor(pose.x) + dx, y, Math.floor(pose.z))).toBe(true);
}

/** Loop time forward in small steps until `done` or `maxMs`. */
export async function until(page: Page, done: (m: MoleView) => boolean, maxMs = 120_000, step = 250): Promise<MoleView> {
  let m = await mole(page);
  for (let t = 0; t < maxMs && !done(m); t += step) {
    await readState(page, 'fastForward', step);
    m = await mole(page);
  }
  return m;
}

/** The stored `world` record, straight from IndexedDB. */
export function worldRecord(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('kv').objectStore('kv').get('world');
          req.onsuccess = () => {
            const v = req.result as { diff?: ArrayLike<number> } | undefined;
            resolve(JSON.stringify(v ? { ...v, diff: Array.from(v.diff ?? []) } : null));
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}
