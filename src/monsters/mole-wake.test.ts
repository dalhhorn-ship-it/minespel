import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import { createDino, type DinoState } from '../dinos/dino-ai';
import { AIR, LAVA, STEEN, WATER } from '../world/blocks';
import { START_SPOT, WORLD_HEIGHT } from '../world/terrain';
import { World } from '../world/world';
import { announceMole, finishRumble, findMoleSpawn, isMoleTarget } from './mole-wake';
import { LINE_COME_UP, LINE_HELP, LINE_HIHI, LINE_NO_FIT } from './mole-lines';
import { createMole } from './mole';
import type { MonsterContext } from './monster-types';

const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
const dig = { x: Math.floor(kid.x), z: Math.floor(kid.z) };
const dino = (dx: number, dz: number): DinoState =>
  createDino({ kind: 'kip', golden: false, x: kid.x + dx, y: kid.y, z: kid.z + dz }, true);
const cheb = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));

function topOf(w: World, x: number, z: number): number {
  let y = WORLD_HEIGHT - 1;
  while (y > 0 && w.get(x, y, z) === AIR) y--;
  return y;
}

describe('findMoleSpawn (AC246)', () => {
  it('AC246: 20 seeded wakes with target animals follow every spot rule', () => {
    const world = new World();
    const animals = [dino(12, 0), dino(-10, 9), dino(0, -14)];
    for (let seed = 1; seed <= 20; seed++) {
      const spot = findMoleSpawn(world, kid, dig, animals, createRng(seed));
      expect(spot).not.toBeNull();
      const s = spot!;
      const col = { x: Math.floor(s.x), z: Math.floor(s.z) };
      expect(cheb(s, kid)).toBeGreaterThan(5);
      expect(cheb(col, dig)).toBeGreaterThan(1);
      expect(animals.some((a) => cheb(s, a) <= 16.5)).toBe(true);
      expect(s.y).toBe(topOf(world, col.x, col.z) + 1);
      const under = world.get(col.x, s.y - 1, col.z);
      expect([WATER, LAVA, AIR]).not.toContain(under);
      expect(world.isUnchanged(col.x, s.y, col.z)).toBe(true);
    }
  });
  it('AC246: no spot within 3 blocks of a changed cell', () => {
    const world = new World();
    const a = dino(12, 0);
    const base = findMoleSpawn(world, kid, dig, [a], createRng(3))!;
    const col = { x: Math.floor(base.x), z: Math.floor(base.z) };
    world.set(col.x + 3, base.y + 2, col.z - 3, STEEN);
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, kid, dig, [a], createRng(seed))!;
      const c = { x: Math.floor(s.x), z: Math.floor(s.z) };
      expect(Math.max(Math.abs(c.x - (col.x + 3)), Math.abs(c.z - (col.z - 3)), Math.abs(s.y - (base.y + 2)))).toBeGreaterThan(3);
    }
  });
  it('AC294: 20 seeded wakes from the bottom of a 20 deep shaft with no target animal come up 4 to 6 from the dig column', () => {
    const world = new World();
    const bottom = { ...kid, y: kid.y - 20 };
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, bottom, dig, [], createRng(seed))!;
      expect(s).not.toBeNull();
      const col = { x: Math.floor(s.x), z: Math.floor(s.z) };
      expect(Math.abs(col.x - dig.x)).toBeLessThanOrEqual(6);
      expect(Math.abs(col.z - dig.z)).toBeLessThanOrEqual(6);
      expect(cheb(col, dig)).toBeGreaterThanOrEqual(4);
      expect(cheb(s, bottom)).toBeGreaterThan(3);
      // The shaft stays open: the dig column itself is not touched.
      expect(world.isUnchanged(dig.x, kid.y, dig.z)).toBe(true);
    }
  });
  it('AC294: the kid standing off the dig column is still not within 3 of the spot', () => {
    const world = new World();
    const off = { ...kid, x: kid.x + 4, z: kid.z + 1 };
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, off, dig, [], createRng(seed))!;
      expect(cheb(s, off)).toBeGreaterThan(3);
      expect(cheb({ x: Math.floor(s.x), z: Math.floor(s.z) }, dig)).toBeGreaterThanOrEqual(4);
    }
  });
  it('AC294: a map where no ring spot fits gives null', () => {
    const world = new World();
    for (let x = dig.x - 8; x <= dig.x + 8; x++) {
      for (let z = dig.z - 8; z <= dig.z + 8; z++) {
        const y = topOf(world, x, z);
        if (y >= 0) world.set(x, y + 1, z, STEEN);
      }
    }
    expect(findMoleSpawn(world, kid, dig, [], createRng(1))).toBeNull();
  });
  it('AC246: animals on Volg mij, called or running are no target', () => {
    const follow = dino(8, 0);
    follow.mode = 'follow';
    const called = dino(8, 0);
    called.called = 5;
    const fleeing = dino(8, 0);
    fleeing.flee = { x: 0, z: 0, left: 1, backX: 0, backZ: 0 } as never;
    expect([follow, called, fleeing].some(isMoleTarget)).toBe(false);
    expect(isMoleTarget(dino(8, 0))).toBe(true);
  });
  it('AC246: a seeded map where no spot fits gives null', () => {
    const world = new World();
    // One changed cell in the middle of every candidate area is not enough; change every column of the ring.
    const a = dino(0, 12);
    for (let x = dig.x - 40; x <= dig.x + 40; x++) {
      for (let z = dig.z - 40; z <= dig.z + 40; z++) {
        const y = topOf(world, x, z);
        if (y >= 0) world.set(x, y + 1, z, STEEN);
      }
    }
    expect(findMoleSpawn(world, kid, dig, [a], createRng(1))).toBeNull();
  });
  it('AC246: the shaft case, no spot within 5 of the kid or within 1 of the dig column', () => {
    const world = new World();
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, { ...kid, y: kid.y - 15 }, dig, [dino(2, 2)], createRng(seed))!;
      expect(cheb(s, kid)).toBeGreaterThan(5);
      expect(cheb({ x: Math.floor(s.x), z: Math.floor(s.z) }, dig)).toBeGreaterThan(1);
    }
  });
});

describe('the lines (AC293, AC294)', () => {
  const ctxOf = (world: World, extra: Partial<MonsterContext> = {}): MonsterContext =>
    ({ world, kid, rng: createRng(1), say: vi.fn(), play: vi.fn(), animals: () => [], ...extra }) as unknown as MonsterContext;

  it('AC294: the no fit map says the new line on the mole channel', () => {
    const world = new World();
    for (let x = dig.x - 8; x <= dig.x + 8; x++) {
      for (let z = dig.z - 8; z <= dig.z + 8; z++) {
        const y = topOf(world, x, z);
        if (y >= 0) world.set(x, y + 1, z, STEEN);
      }
    }
    const ctx = ctxOf(world);
    expect(finishRumble(ctx, dig)).toBeNull();
    expect(LINE_NO_FIT).toBe('Hmm... toch maar niet. De Monstermol slaapt verder.');
    expect(ctx.say).toHaveBeenCalledWith(LINE_NO_FIT, expect.any(Number), 'mole');
  });
  it('AC293: he comes up with the two toasts, "Hihi!" as a label and the sound, never "Hihi!" as a toast', () => {
    const show = vi.fn();
    const ctx = ctxOf(new World(), { labels: { show } as never });
    const mole = createMole({ x: 5.5, y: 20, z: 5.5 }, dig);
    mole.id = 2;
    announceMole(mole, ctx);
    const said = (ctx.say as ReturnType<typeof vi.fn>).mock.calls.map((c) => [c[0], c[2]]);
    expect(said).toEqual([[LINE_COME_UP, 'mole'], [LINE_HELP, 'mole']]);
    expect(LINE_COME_UP).toBe('De Monstermol is boven! Hij zoekt je dieren.');
    expect(LINE_HELP).toBe('Bouw een hek van 2 hoog om hem heen.');
    expect(said.some(([t]) => String(t).includes('Hihi'))).toBe(false);
    expect(show).toHaveBeenCalledWith('mole-2', LINE_HIHI, 'speech', 2000);
    expect(ctx.play).toHaveBeenCalledWith('hihihi');
  });
  it('AC293: without labels he still comes up', () => {
    const ctx = ctxOf(new World());
    const mole = createMole({ x: 5.5, y: 20, z: 5.5 }, dig);
    expect(() => announceMole(mole, ctx)).not.toThrow();
  });
});
