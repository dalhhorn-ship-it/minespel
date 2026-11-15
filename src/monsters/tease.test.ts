import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTeaseMap, GY } from '../../tests/fixtures/maps/tease-map';
import { createRng } from '../core/rng';
import { callDino, createDino, stepDino, viewForward, type DinoState } from '../dinos/dino-ai';
import { STEEN, WATER } from '../world/blocks';
import { WORLD_SIZE } from '../world/terrain';
import type { World } from '../world/world';
import type { KnightState } from '../knights/knight-types';
import type { MonsterContext } from './monster-types';
import { resetTease, setTeaseAnimals, stepTease, teaseNow, TEASE_MIN_S } from './tease';

const KID = { x: 32, y: GY, z: 20 };

function animal(x: number, z: number, mode: 'stay' | 'follow' = 'stay', kind: 'compy' | 'kip' = 'compy'): DinoState {
  const d = createDino({ kind, golden: false, x, y: GY, z }, true);
  d.mode = mode;
  d.onGround = true;
  return d;
}

function makeCtx(world: World, rng = createRng(1), play = vi.fn(), animals?: () => readonly DinoState[]): MonsterContext & { animals?: () => readonly DinoState[] } {
  return {
    world, rng, dt: 0, kid: KID, kidBox: [KID.x - 0.3, KID.y, KID.z - 0.3, KID.x + 0.3, KID.y + 1.8, KID.z + 0.3],
    occupied: () => false, knights: () => [] as readonly KnightState[], touch: () => {}, say: () => {}, play,
    markHintShown: () => {}, hintShown: () => false, animals,
  };
}

const wet = (w: World, d: DinoState): boolean =>
  w.get(Math.floor(d.x), Math.floor(d.y + 1e-3) - 1, Math.floor(d.z)) === WATER;

beforeEach(() => {
  resetTease();
  setTeaseAnimals(null);
});

describe('Klodder teases the animals (v18, AC220, AC221)', () => {
  it('AC220: 50 teases on the map with a pen, a cliff of 4 and a pond follow every rule', () => {
    const { world, spots } = buildTeaseMap();
    const all: DinoState[] = [
      animal(spots.open[0]!.x, spots.open[0]!.z), animal(spots.open[1]!.x, spots.open[1]!.z, 'stay', 'kip'),
      animal(spots.pen[0]!.x, spots.pen[0]!.z), animal(spots.pen[1]!.x, spots.pen[1]!.z, 'stay', 'kip'),
      animal(spots.cliffTop.x, spots.cliffTop.z), animal(spots.cliffFoot.x, spots.cliffFoot.z),
      animal(spots.pond.x, spots.pond.z), animal(spots.hole.x, spots.hole.z),
      animal(spots.walled.x, spots.walled.z), animal(spots.sealed.x, spots.sealed.z),
      animal(spots.corner.x, spots.corner.z),
      animal(KID.x - 1, KID.z - 3, 'follow'), animal(KID.x + 1, KID.z - 3, 'follow'),
    ];
    const before = all.map((d) => ({ kind: d.kind, golden: d.golden, mode: d.mode, growth: d.growth }));
    const rng = createRng(11);
    const walkRng = createRng(5);
    const play = vi.fn();
    const ctx = makeCtx(world, rng, play, () => all);
    const f = viewForward(0);
    let lastTeased: DinoState | null = null;
    let ran = 0;
    for (let n = 0; n < 50; n++) {
      const spotOf = new Map(all.map((d) => [d, { x: d.x, z: d.z, y: d.y }]));
      expect(teaseNow(ctx)).toBe(true);
      const teased = all.find((d) => d.flee || d.vy > 0 || !d.onGround)!;
      // The tease picked exactly one animal, never the one before.
      const moving = all.filter((d) => d.vy > 0);
      expect(moving.length).toBe(1);
      expect(moving[0]).not.toBe(lastTeased);
      lastTeased = moving[0]!;
      void teased;
      if (lastTeased.flee) ran++;
      const start = spotOf.get(lastTeased)!;
      for (let i = 0; i < 10 * 30; i++) {
        for (const d of all) stepDino(world, d, KID, walkRng, 1 / 30, { playerYaw: 0 });
        if (lastTeased.flee) {
          expect(wet(world, lastTeased)).toBe(false);
          expect(lastTeased.y).toBeGreaterThanOrEqual(start.y - 1 - 1e-3);
          expect(lastTeased.x).toBeGreaterThan(0);
          expect(lastTeased.z).toBeGreaterThan(0);
          expect(lastTeased.x).toBeLessThan(WORLD_SIZE);
          expect(lastTeased.z).toBeLessThan(WORLD_SIZE);
        }
      }
      expect(lastTeased.flee).toBeUndefined();
      if (lastTeased.mode === 'stay') expect(Math.hypot(lastTeased.x - start.x, lastTeased.z - start.z)).toBeLessThanOrEqual(3);
      else expect((lastTeased.x - KID.x) * f.x + (lastTeased.z - KID.z) * f.z).toBeLessThan(0);
      expect(world.get(Math.floor(lastTeased.x), Math.floor(lastTeased.y + 0.5), Math.floor(lastTeased.z))).toBe(0);
    }
    expect(play).toHaveBeenCalledTimes(50);
    expect(play).toHaveBeenCalledWith('boing');
    expect(ran).toBeGreaterThan(20);
    // Nobody lost, changed kind or mode.
    expect(all.length).toBe(before.length);
    all.forEach((d, i) => {
      expect(d.kind).toBe(before[i]!.kind);
      expect(d.mode).toBe(before[i]!.mode);
      expect(d.golden).toBe(before[i]!.golden);
    });
  });

  it('AC220: Klodder also teases a chicken (kip) from the animal list', () => {
    const { world, spots } = buildTeaseMap();
    const kip = animal(spots.open[0]!.x, spots.open[0]!.z, 'stay', 'kip');
    expect(teaseNow(makeCtx(world, createRng(1), vi.fn(), () => [kip]))).toBe(true);
    expect(kip.vy > 0 || !!kip.flee).toBe(true);
  });

  it('AC220: the pen stays closed: a penned animal never leaves it over 50 teases', () => {
    const { world, spots } = buildTeaseMap();
    const d = animal(spots.pen[0]!.x, spots.pen[0]!.z);
    const other = animal(spots.pen[1]!.x, spots.pen[1]!.z);
    const ctx = makeCtx(world, createRng(3), vi.fn(), () => [d, other]);
    const walk = createRng(2);
    for (let n = 0; n < 50; n++) {
      teaseNow(ctx);
      for (let i = 0; i < 6 * 30; i++) {
        stepDino(world, d, KID, walk, 1 / 30, {});
        stepDino(world, other, KID, walk, 1 / 30, {});
        for (const a of [d, other]) {
          expect(a.x).toBeGreaterThan(20);
          expect(a.x).toBeLessThan(28);
          expect(a.z).toBeGreaterThan(20);
          expect(a.z).toBeLessThan(28);
        }
      }
    }
  });

  it('AC221: a walled in roaming dino only jumps, plays its sound and stays', () => {
    const { world, spots } = buildTeaseMap();
    for (const p of [spots.walled, spots.sealed]) {
      const d = animal(p.x, p.z);
      const play = vi.fn();
      const ctx = makeCtx(world, createRng(8), play, () => [d]);
      stepDino(world, d, KID, createRng(1), 1 / 30, {});
      expect(teaseNow(ctx)).toBe(true);
      expect(d.flee).toBeUndefined();
      expect(d.vy).toBeGreaterThan(0);
      expect(play).toHaveBeenCalledWith('boing');
      const walk = createRng(1);
      for (let i = 0; i < 5 * 30; i++) stepDino(world, d, KID, walk, 1 / 30, {});
      expect(Math.abs(d.x - p.x)).toBeLessThan(2);
      expect(Math.abs(d.z - p.z)).toBeLessThan(2);
      expect(d.mode).toBe('stay');
    }
  });

  it('AC220: an animal is never teased twice in a row, and a lone animal is teased once', () => {
    const { world, spots } = buildTeaseMap();
    const a = animal(spots.open[0]!.x, spots.open[0]!.z);
    const b = animal(spots.open[2]!.x, spots.open[2]!.z);
    const ctx = makeCtx(world, createRng(21), vi.fn(), () => [a, b]);
    let prev: DinoState | null = null;
    for (let n = 0; n < 30; n++) {
      a.flee = undefined; b.flee = undefined; a.vy = 0; b.vy = 0; a.onGround = true; b.onGround = true;
      expect(teaseNow(ctx)).toBe(true);
      const hit = a.vy > 0 ? a : b;
      expect(hit).not.toBe(prev);
      prev = hit;
    }
    resetTease();
    const lone = animal(spots.open[0]!.x, spots.open[0]!.z);
    const ctx1 = makeCtx(world, createRng(2), vi.fn(), () => [lone]);
    expect(teaseNow(ctx1)).toBe(true);
    lone.flee = undefined;
    expect(teaseNow(ctx1)).toBe(false);
  });

  it('AC221: a dino on a Dinofluit call is never teased and still arrives at the kid', () => {
    const { world, spots } = buildTeaseMap();
    const called = animal(spots.open[0]!.x, spots.open[0]!.z);
    callDino(called);
    const ctx = makeCtx(world, createRng(3), vi.fn(), () => [called]);
    for (let n = 0; n < 10; n++) expect(teaseNow(ctx)).toBe(false);
    expect(called.flee).toBeUndefined();
    const other = animal(spots.open[2]!.x, spots.open[2]!.z);
    const both = makeCtx(world, createRng(3), vi.fn(), () => [called, other]);
    for (let n = 0; n < 5; n++) {
      other.flee = undefined;
      resetTease();
      expect(teaseNow(both)).toBe(true);
      expect(called.flee).toBeUndefined();
    }
    const walk = createRng(1);
    for (let i = 0; i < 40 * 30 && called.called; i++) stepDino(world, called, { x: 32, y: GY, z: 8 }, walk, 1 / 30, {});
    expect(Math.hypot(called.x - 32, called.z - 8)).toBeLessThanOrEqual(2.6);
  });

  it('AC221: with no animals, nothing is teased; the list can come from the boot setter', () => {
    const { world, spots } = buildTeaseMap();
    const ctx = makeCtx(world);
    expect(teaseNow(ctx)).toBe(false);
    const d = animal(spots.open[0]!.x, spots.open[0]!.z);
    setTeaseAnimals(() => [d]);
    expect(teaseNow(ctx)).toBe(true);
  });

  it('AC220: Klodder teases on his own every 8 to 14 loop seconds, and not while time stands still', () => {
    const { world, spots } = buildTeaseMap();
    const list = [animal(spots.open[0]!.x, spots.open[0]!.z), animal(spots.open[2]!.x, spots.open[2]!.z)];
    const play = vi.fn();
    const ctx = makeCtx(world, createRng(4), play, () => list);
    stepTease(ctx, 0);
    expect(play).not.toHaveBeenCalled();
    let teases = 0, t = 0, firstAt = -1;
    while (t < 100) {
      const c = play.mock.calls.length;
      for (const d of list) { d.flee = undefined; d.onGround = true; }
      stepTease(ctx, 0.1);
      t += 0.1;
      if (play.mock.calls.length > c) { teases++; if (firstAt < 0) firstAt = t; }
    }
    expect(firstAt).toBeLessThanOrEqual(TEASE_MIN_S);
    expect(teases).toBeGreaterThanOrEqual(7);
    expect(teases).toBeLessThanOrEqual(13);
  });

  it('AC221: a wall of stone around a teased animal keeps it inside', () => {
    const { world } = buildTeaseMap();
    const d = animal(10.5, 10.5);
    for (let y = GY; y < GY + 2; y++) for (let x = 8; x <= 12; x++) for (let z = 8; z <= 12; z++) {
      if (x === 8 || x === 12 || z === 8 || z === 12) world.set(x, y, z, STEEN);
    }
    const ctx = makeCtx(world, createRng(6), vi.fn(), () => [d]);
    teaseNow(ctx);
    const walk = createRng(2);
    for (let i = 0; i < 12 * 30; i++) {
      stepDino(world, d, KID, walk, 1 / 30, {});
      expect(d.x).toBeGreaterThan(8);
      expect(d.x).toBeLessThan(13);
    }
  });
});
