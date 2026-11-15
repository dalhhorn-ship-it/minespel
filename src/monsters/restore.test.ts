import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import type { Box } from '../world/build';
import { STEEN } from '../world/blocks';
import { World } from '../world/world';
import type { MonsterContext } from './monster-types';
import { RESTORE_TOTAL_MS, startRestore, stepRestore } from './restore';

function setup(n: number, kid = { x: 0, y: 0, z: 0 }, occupied: (b: Box) => boolean = () => false) {
  const world = new World();
  for (let i = 0; i < n; i++) {
    world.hide(30 + i, 20, 30);
  }
  const ctx = (dt: number): MonsterContext => ({
    world, rng: createRng(1), dt, kid,
    kidBox: [kid.x - 0.3, kid.y, kid.z - 0.3, kid.x + 0.3, kid.y + 1.8, kid.z + 0.3],
    occupied, knights: () => [], touch: () => {}, say: () => {}, play: () => {}, markHintShown: () => {}, hintShown: () => false,
  });
  return { world, ctx };
}

describe('Klodder restore (v18, AC217)', () => {
  it('AC217: 10 cells are back within 3 seconds, not all in the same frame', () => {
    const { world, ctx } = setup(10);
    const r = startRestore({ world });
    const counts: number[] = [];
    let t = 0;
    let done = false;
    while (!done && t < 3000) {
      t += 33;
      done = stepRestore(r, ctx(0.033));
      counts.push(world.hiddenCount());
    }
    expect(done).toBe(true);
    expect(t).toBeLessThanOrEqual(3000);
    expect(world.hiddenCount()).toBe(0);
    expect(new Set(counts).size).toBeGreaterThan(4);
    expect(counts[0]).toBeGreaterThan(0);
    expect(RESTORE_TOTAL_MS).toBe(2000);
  });

  it('AC217: 20 cells are back in about 2 seconds', () => {
    const { world, ctx } = setup(20);
    const r = startRestore({ world });
    let t = 0;
    while (!stepRestore(r, ctx(0.033)) && t < 4000) t += 33;
    expect(t).toBeLessThanOrEqual(2200);
  });

  it('AC217: a cell with the kid in it waits and is back within 1 second after the kid leaves', () => {
    const kid = { x: 30.5, y: 20, z: 30.5 };
    const { world, ctx } = setup(3, kid);
    const r = startRestore({ world });
    for (let t = 0; t < 3000; t += 33) stepRestore(r, ctx(0.033));
    expect(world.isHidden(30, 20, 30)).toBe(true);
    expect(world.hiddenCount()).toBe(1);
    kid.x = 5;
    let t = 0;
    let done = false;
    while (!done && t < 2000) {
      t += 33;
      done = stepRestore(r, ctx(0.033));
    }
    expect(done).toBe(true);
    expect(t).toBeLessThanOrEqual(1000);
  });

  it('AC217: an animal in a cell holds it too', () => {
    let busy = true;
    const { world, ctx } = setup(2, { x: 0, y: 0, z: 0 }, () => busy);
    const r = startRestore({ world });
    for (let t = 0; t < 2000; t += 33) stepRestore(r, ctx(0.033));
    expect(world.hiddenCount()).toBe(2);
    busy = false;
    for (let t = 0; t < 1000; t += 33) stepRestore(r, ctx(0.033));
    expect(world.hiddenCount()).toBe(0);
  });

  it('AC217: a cell the kid built in keeps the kid block', () => {
    const { world, ctx } = setup(4);
    const r = startRestore({ world });
    world.set(30, 20, 30, STEEN);
    world.set(31, 20, 30, STEEN);
    for (let t = 0; t < 3000; t += 33) stepRestore(r, ctx(0.033));
    expect(world.hiddenCount()).toBe(0);
    expect(world.get(30, 20, 30)).toBe(STEEN);
    expect(world.get(31, 20, 30)).toBe(STEEN);
  });
});
