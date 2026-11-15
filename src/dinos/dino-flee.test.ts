import { describe, expect, it } from 'vitest';
import { buildTeaseMap, GY } from '../../tests/fixtures/maps/tease-map';
import { createRng } from '../core/rng';
import { STEEN, WATER } from '../world/blocks';
import { WORLD_SIZE } from '../world/terrain';
import {
  FLEE_BACK_GIVEUP, FLEE_SECONDS, FLEE_SPEED, callDino, createDino, startFlee, stepDino, viewForward,
  type DinoState, type Point,
} from './dino-ai';
import { serializeDino, type WorldDino } from './dino-store';

const KID: Point = { x: 5, y: GY, z: 60 };
const mk = (x: number, z: number): DinoState => {
  const d = createDino({ kind: 'compy', golden: false, x, y: GY, z }, true);
  d.onGround = true;
  return d;
};
function run(world: ReturnType<typeof buildTeaseMap>['world'], d: DinoState, seconds: number, seed = 3, each?: () => void): void {
  const rng = createRng(seed);
  for (let i = 0; i < Math.round(seconds * 30); i++) {
    stepDino(world, d, KID, rng, 1 / 30, {});
    each?.();
  }
}
const wet = (world: ReturnType<typeof buildTeaseMap>['world'], d: DinoState): boolean =>
  world.get(Math.floor(d.x), Math.floor(d.y + 1e-3), Math.floor(d.z)) === WATER ||
  world.get(Math.floor(d.x), Math.floor(d.y + 1e-3) - 1, Math.floor(d.z)) === WATER;

describe('the safe flee step (v18, AC220, AC221)', () => {
  it('AC220: on open ground it runs about 6 blocks within 3 s, then walks back to within 3 blocks of its spot', () => {
    const { world, spots } = buildTeaseMap();
    for (let seed = 1; seed <= 20; seed++) {
      const d = mk(spots.open[0]!.x, spots.open[0]!.z);
      const rng = createRng(seed);
      expect(startFlee(world, d, rng)).toBe(true);
      const f = d.flee!;
      const run0 = Math.hypot(f.x - d.x, f.z - d.z);
      expect(run0).toBeGreaterThanOrEqual(5 - 1e-6);
      expect(run0).toBeLessThanOrEqual(7 + 1e-6);
      expect(FLEE_SPEED * FLEE_SECONDS).toBeGreaterThanOrEqual(run0);
      let far = 0;
      let seconds = 0;
      const r2 = createRng(9);
      while (d.flee && seconds < FLEE_SECONDS + FLEE_BACK_GIVEUP + 1) {
        stepDino(world, d, KID, r2, 1 / 30, {});
        far = Math.max(far, Math.hypot(d.x - spots.open[0]!.x, d.z - spots.open[0]!.z));
        seconds += 1 / 30;
      }
      expect(d.flee).toBeUndefined();
      expect(far).toBeGreaterThan(3.5);
      expect(Math.hypot(d.x - spots.open[0]!.x, d.z - spots.open[0]!.z)).toBeLessThanOrEqual(3);
      expect(d.mode).toBe('stay');
    }
  });

  it('AC220: never into water, lava, off a cliff of 4, into a deep hole, outside the world or through a wall', () => {
    const { world, spots } = buildTeaseMap();
    const places = [spots.pond, spots.cliffTop, spots.cliffFoot, spots.hole, spots.corner, spots.lava, spots.pen[0]!];
    let fled = 0;
    for (const p of places) {
      for (let seed = 1; seed <= 40; seed++) {
        const d = mk(p.x, p.z);
        if (p === spots.lava) d.y = GY;
        if (startFlee(world, d, createRng(seed * 7))) fled++;
        run(world, d, 3 + FLEE_BACK_GIVEUP, seed, () => {
          // Plain roaming after the tease is the old behaviour (decision 128); the rules hold while the tease runs.
          if (!d.flee) return;
          expect(wet(world, d)).toBe(false);
          expect(d.y).toBeGreaterThanOrEqual(GY - 1 - 1e-3);
          expect(d.x).toBeGreaterThan(0);
          expect(d.z).toBeGreaterThan(0);
          expect(d.x).toBeLessThan(WORLD_SIZE);
          expect(d.z).toBeLessThan(WORLD_SIZE);
          if (p === spots.pen[0]) {
            expect(d.x).toBeGreaterThan(20);
            expect(d.x).toBeLessThan(28);
            expect(d.z).toBeGreaterThan(20);
            expect(d.z).toBeLessThan(28);
          }
        });
      }
    }
    expect(fled).toBeGreaterThan(20); // the places are not all dead ends
  });

  it('AC221: a dino walled in on all sides, with or without a ceiling, only jumps and stays', () => {
    const { world, spots } = buildTeaseMap();
    for (const p of [spots.walled, spots.sealed]) {
      const d = mk(p.x, p.z);
      run(world, d, 1);
      let peak = d.y;
      expect(startFlee(world, d, createRng(5))).toBe(false);
      expect(d.flee).toBeUndefined();
      run(world, d, 3, 4, () => { peak = Math.max(peak, d.y); });
      expect(peak).toBeGreaterThan(GY + 0.2);
      expect(Math.abs(d.x - p.x)).toBeLessThan(2);
      expect(Math.abs(d.z - p.z)).toBeLessThan(2);
      expect(d.mode).toBe('stay');
    }
  });

  it('AC220: a stuck animal gives up the walk back and is never lost', () => {
    const { world, spots } = buildTeaseMap();
    const d = mk(spots.open[1]!.x, spots.open[1]!.z);
    expect(startFlee(world, d, createRng(2))).toBe(true);
    // Walls rise around it right away: it cannot move at all.
    const cx = Math.floor(d.x), cz = Math.floor(d.z);
    for (let y = GY; y < GY + 3; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) {
        if (x !== cx || z !== cz) world.set(x, y, z, STEEN);
      }
    }
    const x0 = d.x, z0 = d.z;
    let seconds = 0;
    const rng = createRng(1);
    while (d.flee && seconds < FLEE_SECONDS + FLEE_BACK_GIVEUP + 1) {
      stepDino(world, d, KID, rng, 1 / 30, {});
      seconds += 1 / 30;
    }
    expect(d.flee).toBeUndefined();
    expect(Math.hypot(d.x - x0, d.z - z0)).toBeLessThan(1);
  });

  it('AC220: an animal on Volg mij goes back to following', () => {
    const { world, spots } = buildTeaseMap();
    const d = mk(spots.open[0]!.x, spots.open[0]!.z);
    d.mode = 'follow';
    expect(startFlee(world, d, createRng(4))).toBe(true);
    run(world, d, FLEE_SECONDS + 0.5);
    expect(d.flee).toBeUndefined();
    expect(d.mode).toBe('follow');
    // Behind the kid again some seconds later.
    const kid = { x: 32, y: GY, z: 20 };
    const rng = createRng(1);
    for (let i = 0; i < 12 * 30; i++) stepDino(world, d, kid, rng, 1 / 30, { playerYaw: 0 });
    const f = viewForward(0);
    expect((d.x - kid.x) * f.x + (d.z - kid.z) * f.z).toBeLessThan(0);
    expect(d.mode).toBe('follow');
  });

  it('AC221: a Dinofluit call wins over a flee and the dino arrives at the kid', () => {
    const { world, spots } = buildTeaseMap();
    const d = mk(spots.open[0]!.x, spots.open[0]!.z);
    expect(startFlee(world, d, createRng(4))).toBe(true);
    callDino(d);
    const kid = { x: 32, y: GY, z: 8 };
    const rng = createRng(1);
    for (let i = 0; i < 40 * 30 && d.called; i++) stepDino(world, d, kid, rng, 1 / 30, {});
    expect(d.flee).toBeUndefined();
    expect(Math.hypot(d.x - kid.x, d.z - kid.z)).toBeLessThanOrEqual(2.6);
  });

  it('AC220: the saved record has no flee field', () => {
    const { world, spots } = buildTeaseMap();
    const d = mk(spots.open[0]!.x, spots.open[0]!.z);
    startFlee(world, d, createRng(4));
    expect(d.flee).toBeDefined();
    const saved = serializeDino({ ...d, id: 'a', name: '' } as WorldDino);
    expect(Object.keys(saved)).not.toContain('flee');
    expect(Object.keys(saved)).not.toContain('called');
  });
});
