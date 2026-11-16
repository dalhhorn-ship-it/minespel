import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { hazardAt } from '../dinos/dino-ai';
import { LAVA } from '../world/blocks';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { box, buildMoleMap, GY, PEN2 } from '../../tests/fixtures/maps/mole-map';
import { createKnightBody, stepKnight, stepToward } from './knight-ai';
import { createMole } from '../monsters/mole';
import { stepMoleMoed } from '../monsters/mole-moed';
import type { MonsterContext } from '../monsters/monster-types';
import { KNIGHT_BOX, SALUTE_GAP_MS, type KnightMode, type KnightState } from './knight-types';

const DT = 1 / 30;
const STONE = 3;
function groundY(world: World, x: number, z: number): number {
  let y = 60;
  while (y > 0 && world.get(Math.floor(x), y - 1, Math.floor(z)) === 0) y--;
  return y;
}
function make(mode: KnightMode, x: number, z: number, world: World): KnightState {
  const y = groundY(world, x, z);
  const spot = mode === 'follow' ? null : { x, y, z };
  const body = createKnightBody({ x, y, z });
  body.stayX = x; body.stayZ = z;
  return { id: 'k', mode, spot, boughtFor: 0, body, chase: null, saluteClockMs: 0, visible: true };
}

describe('knight ai', () => {
  const sx = START_SPOT.x, sz = START_SPOT.z;
  it('AC204: a guard stays within 9 blocks of his spot over 2 minutes and moves every 10 seconds', () => {
    const world = new World();
    const k = make('guard', sx + 20, sz, world);
    const kid = { x: sx, y: START_SPOT.y, z: sz };
    const rng = createRng(7);
    let maxDist = 0, lastMove = 0, maxGap = 0, px = k.body.x, pz = k.body.z;
    for (let i = 0; i < 120 * 30; i++) {
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      maxDist = Math.max(maxDist, Math.hypot(k.body.x - k.spot!.x, k.body.z - k.spot!.z));
      if (Math.hypot(k.body.x - px, k.body.z - pz) > 0.05) { px = k.body.x; pz = k.body.z; lastMove = i; }
      maxGap = Math.max(maxGap, (i - lastMove) * DT);
    }
    expect(maxDist).toBeLessThanOrEqual(9);
    expect(maxGap).toBeLessThanOrEqual(10);
  });
  it('AC204: a knight on Blijf hier stays within 1 block of his spot over 2 minutes', () => {
    const world = new World();
    const k = make('stay', sx + 20, sz, world);
    const kid = { x: sx, y: START_SPOT.y, z: sz };
    const rng = createRng(3);
    let maxDist = 0;
    for (let i = 0; i < 120 * 30; i++) {
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      maxDist = Math.max(maxDist, Math.hypot(k.body.x - k.spot!.x, k.body.z - k.spot!.z));
    }
    expect(maxDist).toBeLessThanOrEqual(1);
  });
  it('AC204: a follower walks 3 blocks per second and ends up behind the kid', () => {
    const world = new World();
    const kid = { x: sx, y: START_SPOT.y, z: sz };
    const k = make('follow', sx - 3, sz, world);
    const rng = createRng(5);
    for (let i = 0; i < 90; i++) stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
    const start = { x: k.body.x, z: k.body.z };
    for (let i = 0; i < 5 * 30; i++) {
      kid.z += 3 * DT;
      kid.y = groundY(world, kid.x, kid.z);
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
    }
    const walked = Math.hypot(k.body.x - start.x, k.body.z - start.z);
    // He starts about 3 blocks behind and keeps pace: the kid walked 15 blocks.
    expect(walked).toBeGreaterThan(15 * 0.8 - 3);
    expect(walked).toBeLessThan(15 * 1.2);
    expect(k.body.z - kid.z).toBeLessThan(0);
  });
  it('AC204: stepToward pops next to a target behind a wall after 3 seconds', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    for (let yy = y - 4; yy < y + 8; yy++) for (let dz = -12; dz <= 12; dz++) world.set(Math.floor(sx) + 4, yy, Math.floor(sz) + dz, STONE);
    const cx = Math.floor(sx), cz = Math.floor(sz);
    const body = createKnightBody({ x: cx + 1.5, y, z: cz + 0.5 });
    const target = { x: cx + 8.5, y, z: cz + 0.5 };
    const rng = createRng(1);
    let t = 0, result = 'walking';
    while (result !== 'popped' && t < 10) {
      result = stepToward(world, body, target, rng, DT, { speed: 3, stuckSeconds: 3, arrive: 1.2, box: KNIGHT_BOX });
      t += DT;
    }
    expect(result).toBe('popped');
    // Walking to the wall takes about 1 s, then 3 s stuck (plus or minus 0.2).
    expect(t).toBeGreaterThan(3 - 0.2);
    expect(t).toBeLessThan(3 + 0.2 + 1.5);
    expect(Math.hypot(body.x - target.x, body.z - target.z)).toBeLessThanOrEqual(2.6);
  });
  it('AC204: a knight never walks into lava', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    const kid = { x: sx, y, z: sz };
    const k = make('guard', sx + 2, sz, world);
    for (let dx = -8; dx <= 12; dx++) for (let dz = -8; dz <= 8; dz++) {
      if ((dx + dz) % 2 === 0 && Math.hypot(dx, dz) > 1.5) world.set(Math.floor(sx) + 2 + dx, y - 1, Math.floor(sz) + dz, LAVA);
    }
    expect(hazardAt(world, k.body.x, k.body.y, k.body.z, 0.6)).toBe(false);
    const rng = createRng(11);
    for (let i = 0; i < 60 * 30; i++) {
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      expect(hazardAt(world, k.body.x, k.body.y, k.body.z, 0.6)).toBe(false);
    }
  });
  it('AC205: salutes within 3 blocks, not again within a minute, again after it', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    const k = make('stay', sx, sz, world);
    k.saluteClockMs = SALUTE_GAP_MS;
    const rng = createRng(2);
    const run = (kidX: number, ms: number): number => {
      let n = 0;
      for (let t = 0; t < ms; t += 1000 * DT) {
        if (stepKnight(k, { world, rng, player: { x: kidX, y, z: sz }, playerYaw: 0, dt: DT }) === 'salute') n++;
      }
      return n;
    };
    expect(run(sx + 10, 2000)).toBe(0);
    expect(run(sx + 2, 1000)).toBe(1);
    expect(run(sx + 10, 5000)).toBe(0);
    expect(run(sx + 2, 5000)).toBe(0);
    expect(run(sx + 10, 55000)).toBe(0);
    expect(run(sx + 2, 1000)).toBe(1);
  });
  it('AC205: a follower never salutes', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    const k = make('follow', sx, sz, world);
    k.saluteClockMs = SALUTE_GAP_MS * 2;
    expect(stepKnight(k, { world, rng: createRng(1), player: { x: sx + 1, y, z: sz }, playerYaw: 0, dt: DT })).toBeNull();
  });

  it('AC251: a chasing knight walks through the gap in a wall 2 high to the target and arrives', () => {
    const world = buildMoleMap();
    box(world, 88, 88, 0, 127, GY, GY + 1, STONE);
    box(world, 88, 88, 30, 30, GY, GY + 1, 0);
    const k = make('guard', 84.5, 10.5, world);
    k.chase = { x: 91.5, z: 10.5, y: GY };
    const rng = createRng(2);
    const kid = { x: 5.5, y: GY, z: 5.5 };
    let t = 0, maxJump = 0, throughGap = false;
    while (k.chase && t < 120) {
      const x = k.body.x, z = k.body.z;
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      maxJump = Math.max(maxJump, Math.hypot(k.body.x - x, k.body.z - z));
      if (x < 88 && k.body.x >= 88 && Math.abs(k.body.z - 30.5) < 1) throughGap = true;
      t += DT;
    }
    expect(k.chase).toBeNull();
    expect(throughGap).toBe(true);
    expect(maxJump).toBeLessThan(0.3);
    expect(Math.hypot(k.body.x - 91.5, k.body.z - 10.5)).toBeLessThanOrEqual(1.3);
  });
  it('AC251: with no path a chasing knight still pops next to the target after 3 s stuck', () => {
    const world = buildMoleMap();
    const k = make('guard', PEN2.x0 + 2.5, PEN2.z0 + 2.5, world);
    const tx = PEN2.x0 - 6.5, tz = PEN2.z0 + 2.5;
    k.chase = { x: tx, z: tz, y: GY };
    const rng = createRng(2);
    const kid = { x: 5.5, y: GY, z: 5.5 };
    let t = 0, popped = -1, px = k.body.x;
    while (k.chase && t < 20) {
      t += DT;
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      if (Math.abs(k.body.x - px) > 1.5) popped = t;
      px = k.body.x;
    }
    expect(popped).toBeGreaterThanOrEqual(3);
    expect(popped).toBeLessThanOrEqual(5.5);
    expect(Math.hypot(k.body.x - tx, k.body.z - tz)).toBeLessThan(3);
  });
});

describe('AC263: the Pony speed', () => {
  const world = buildMoleMap();
  const kid = { x: 40.5, y: GY, z: 5.5 };
  const rider = (mode: KnightMode, pony: boolean): KnightState => {
    const k = make(mode, 5.5, 5.5, world);
    k.body.y = GY;
    if (pony) k.gear = { rijdier: 'pony' };
    return k;
  };
  const rng = createRng(3);
  const walked = (k: KnightState, seconds: number): number => {
    const x0 = k.body.x, z0 = k.body.z;
    for (let i = 0; i < seconds * 30; i++) stepKnight(k, { world, rng, player: kid, playerYaw: Math.PI / 2, dt: DT });
    return Math.hypot(k.body.x - x0, k.body.z - z0);
  };

  it('AC263: in the chase over 3 seconds he walks 4.5 blocks per second with the Pony and 3 without (20 percent)', () => {
    for (const [pony, speed] of [[true, 4.5], [false, 3]] as const) {
      const k = rider('guard', pony);
      k.chase = { x: 21.5, z: 5.5 };
      const d = walked(k, 3);
      expect(Math.abs(d / 3 - speed)).toBeLessThanOrEqual(speed * 0.2);
    }
  });

  it('AC263: a follower far behind the kid keeps up at 4.5 with the Pony and 3 without', () => {
    for (const [pony, speed] of [[true, 4.5], [false, 3]] as const) {
      const k = rider('follow', pony);
      const d = walked(k, 3);
      expect(Math.abs(d / 3 - speed)).toBeLessThanOrEqual(speed * 0.2);
    }
  });

  it('AC263: a guard on his way to a goal walks 4.5 with the Pony and 3 without', () => {
    for (const [pony, speed] of [[true, 4.5], [false, 3]] as const) {
      const k = rider('guard', pony);
      k.body.goal = { x: 11.5, z: 5.5 };
      k.body.goalLeft = 10;
      k.body.idleLeft = 5;
      const d = walked(k, 1);
      expect(Math.abs(d - speed)).toBeLessThanOrEqual(speed * 0.2);
    }
  });
});

describe('AC284: the boots and the new mounts', () => {
  const world = buildMoleMap();
  const kid = { x: 40.5, y: GY, z: 5.5 };
  it('AC284: a follower far behind walks 4 with the boots, 5.5 on the Strijdpaard, 5 on the Rij-triceratops (20 percent)', () => {
    const cases: [KnightState['gear'], number][] = [
      [{ voeten: 'snelle-laarzen' }, 4], [{ rijdier: 'strijdpaard' }, 5.5], [{ rijdier: 'rij-triceratops' }, 5],
      [{ voeten: 'snelle-laarzen', rijdier: 'strijdpaard' }, 5.5],
    ];
    for (const [gear, speed] of cases) {
      const k = make('follow', 5.5, 5.5, world);
      k.body.y = GY;
      k.gear = gear;
      const rng = createRng(3);
      const x0 = k.body.x, z0 = k.body.z;
      for (let i = 0; i < 90; i++) stepKnight(k, { world, rng, player: kid, playerYaw: Math.PI / 2, dt: DT });
      expect(Math.abs(Math.hypot(k.body.x - x0, k.body.z - z0) / 3 - speed)).toBeLessThanOrEqual(speed * 0.2);
    }
  });
});

describe('AC337: a knight on Jaag monsters weg', () => {
  const kid = { x: 5.5, y: GY, z: 5.5 };
  /** The knight's loop for a mole at `mole`: the Moed step sets his chase, the knight walks. */
  function fight(k: KnightState, world: World, mole: ReturnType<typeof createMole>, seconds: number) {
    const rng = createRng(4);
    const ctx = {
      world, rng, dt: DT, kid, kidBox: [5.2, GY, 5.2, 5.8, GY + 1.8, 5.8], occupied: () => false, knights: () => [k], touch: () => {},
      say: () => {}, play: () => {}, animals: () => [], markHintShown: () => {}, hintShown: () => true,
    } as MonsterContext;
    let t = 0, full = false;
    while (t < seconds && !full) {
      full = stepMoleMoed(mole, ctx);
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      t += DT;
    }
    return { t, full };
  }

  it('AC337: he reaches a mole 40 blocks away behind a wall 2 high with a gap, pokes, and the bar fills', () => {
    const world = buildMoleMap();
    box(world, 88, 88, 0, 127, GY, GY + 1, STONE);
    box(world, 88, 88, 30, 30, GY, GY + 1, 0);
    const k = make('chase', 53.5, 10.5, world);
    const mole = createMole({ x: 93.5, y: GY, z: 10.5 }, { x: 0, z: 0 });
    const { full, t } = fight(k, world, mole, 120);
    expect(full).toBe(true);
    expect(t).toBeLessThan(80);
    expect(mole.dove).not.toBeNull();
    expect(Math.hypot(k.body.x - mole.x, k.body.z - mole.z)).toBeLessThan(3);
  });

  it('AC337: while the mole is away he walks back to his spot and stays within 1 block of it', () => {
    const world = buildMoleMap();
    const k = make('chase', 55.5, 10.5, world);
    const mole = createMole({ x: 65.5, y: GY, z: 10.5 }, { x: 0, z: 0 });
    fight(k, world, mole, 60);
    expect(mole.dove).not.toBeNull();
    const rng = createRng(6);
    for (let i = 0; i < 40 * 30; i++) stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
    expect(k.chase).toBeNull();
    expect(k.mode).toBe('chase');
    expect(Math.hypot(k.body.x - 55.5, k.body.z - 10.5)).toBeLessThanOrEqual(1);
  });

  it('AC337: with a pen 2 high round the mole he pops next to him after 3 s stuck', () => {
    const world = buildMoleMap();
    const k = make('chase', PEN2.x0 + 2.5, PEN2.z0 + 2.5, world);
    const mole = createMole({ x: PEN2.x0 - 6.5, y: GY, z: PEN2.z0 + 2.5 }, { x: 0, z: 0 });
    const { full } = fight(k, world, mole, 40);
    expect(full).toBe(true);
  });
});
