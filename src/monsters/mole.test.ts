import { beforeAll, describe, expect, it } from 'vitest';
import {
  box, buildMoleMap, GY, PEN1, PEN2, ring,
} from '../../tests/fixtures/maps/mole-map';
import { createRng } from '../core/rng';
import { callDino, createDino, type DinoState } from '../dinos/dino-ai';
import type { KnightState } from '../knights/knight-types';
import type { World } from '../world/world';
import { createMole, moleBox, stepMole } from './mole';
import { FENCE_MS, LEAVE_MS, LONELY_MS, MOLE_TIRED_MS, type Cell, type MoleState, type MonsterContext } from './monster-types';

let world: World;
beforeAll(() => {
  world = buildMoleMap();
});

const DT = 0.05;

function animal(x: number, z: number, mode: 'stay' | 'follow' = 'stay'): DinoState {
  const d = createDino({ kind: 'compy', golden: false, x, y: GY, z }, true);
  d.mode = mode;
  d.onGround = true;
  return d;
}

interface Run {
  mole: MoleState;
  said: Array<{ text: string; at: number }>;
  played: string[];
  teased: DinoState[];
  /** Loop ms. */
  now: number;
  minKidDistance: number;
  overlapped: boolean;
  step(n: number): void;
  until(done: () => boolean, maxMs: number): void;
}

/** Runs the mole like the monster system does: it adds dt to the clocks first, and an animal that fled comes back. */
function start(w: World, at: { x: number; z: number }, animals: DinoState[], kid = { x: 5.5, y: GY, z: 5.5 }, seed = 1): Run {
  const rng = createRng(seed);
  const mole = createMole({ x: at.x, y: GY, z: at.z }, { x: 0, z: 0 });
  const said: Run['said'] = [];
  const played: string[] = [];
  const run: Run = {
    mole, said, played, teased: [], now: 0, minKidDistance: Infinity, overlapped: false,
    step(n) {
      for (let i = 0; i < n; i++) {
        const ms = DT * 1000;
        run.now += ms;
        mole.phaseMs += ms;
        if (mole.phase === 'out') mole.outMs += ms;
        const ctx: MonsterContext = {
          world: w, rng, dt: DT, kid, kidBox: [kid.x - 0.3, kid.y, kid.z - 0.3, kid.x + 0.3, kid.y + 1.8, kid.z + 0.3],
          occupied: () => false, knights: () => [] as readonly KnightState[], touch: () => {},
          say: (text) => said.push({ text, at: run.now }),
          play: (name) => { played.push(name); },
          animals: () => animals, markHintShown: () => {}, hintShown: () => false,
        };
        for (const a of animals) a.vy = 0;
        stepMole(mole, ctx);
        // A tease makes an animal jump (and maybe flee); here it is back and still at once so it can be teased again.
        for (const a of animals) {
          if (a.vy > 0 || a.flee) run.teased.push(a);
          a.flee = undefined;
        }
        if (mole.phase === 'out') {
          const cell: Cell = { x: Math.floor(mole.x), y: Math.round(mole.y), z: Math.floor(mole.z) };
          const kc: Cell = { x: Math.floor(kid.x), y: Math.floor(kid.y), z: Math.floor(kid.z) };
          run.minKidDistance = Math.min(run.minKidDistance, Math.max(Math.abs(cell.x - kc.x), Math.abs(cell.z - kc.z)));
          const b = moleBox(mole);
          const k = ctx.kidBox;
          if (b[0] < k[3] && b[3] > k[0] && b[1] < k[4] && b[4] > k[1] && b[2] < k[5] && b[5] > k[2]) run.overlapped = true;
        }
      }
    },
    until(done, maxMs) {
      const end = run.now + maxMs;
      while (run.now < end && !done()) run.step(1);
    },
  };
  return run;
}

const sayTimes = (r: Run, text: string): number[] => r.said.filter((s) => s.text === text).map((s) => s.at);

describe('the mole walks to an animal and teases it (v16, AC247)', () => {
  it('AC247: walks 1 block per second to the nearest of 3 roaming dinos and teases it', () => {
    const near = animal(14.5, 10.5);
    const mid = animal(6.5, 22.5);
    const far = animal(15.5, 33.5);
    const r = start(world, { x: 10.5, z: 10.5 }, [far, mid, near]);
    r.until(() => r.teased.length > 0, 20_000);
    expect(r.teased[0]).toBe(near);
    expect(sayTimes(r, 'Boe!')).toHaveLength(1);
    expect(r.played).toContain('boe');
    // 4 blocks apart: he needs to get within 1 cell, so it takes 2 to 3 s plus the first search.
    expect(r.now).toBeGreaterThan(1500);
    expect(r.now).toBeLessThan(4500);
  });

  it('AC247: never the same animal twice in a row', () => {
    const a = animal(12.5, 12.5);
    const b = animal(8.5, 18.5);
    const teases: DinoState[] = [];
    const r = start(world, { x: 10.5, z: 14.5 }, [a, b]);
    for (let i = 0; i < 3000 && teases.length < 6; i++) {
      r.step(1);
      teases.length = 0;
      teases.push(...r.teased);
    }
    expect(teases.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < teases.length; i++) expect(teases[i]).not.toBe(teases[i - 1]);
  });

  it('AC247: a follower and a called dino are never a target', () => {
    const f = animal(12.5, 12.5, 'follow');
    const c = animal(14.5, 12.5);
    callDino(c);
    const r = start(world, { x: 10.5, z: 12.5 }, [f, c]);
    r.step(1200);
    expect(r.teased).toHaveLength(0);
    expect(sayTimes(r, 'Boe!')).toHaveLength(0);
  });
});

describe('the fence rule (v16, AC249)', () => {
  it('AC249: an animal in a pen 2 high: Hmpf after 10 s plus at most 2 s, gone within 3 s', () => {
    const inside = animal(PEN2.x0 + 2.5, PEN2.z0 + 2.5);
    const r = start(world, { x: PEN2.x0 - 7.5, z: PEN2.z0 + 2.5 }, [inside]);
    r.until(() => sayTimes(r, 'Hmpf! Ik kan er niet bij.').length > 0, 20_000);
    const [at] = sayTimes(r, 'Hmpf! Ik kan er niet bij.');
    expect(at).toBeGreaterThanOrEqual(FENCE_MS);
    expect(at).toBeLessThanOrEqual(FENCE_MS + 2000);
    expect(r.mole.phase).toBe('leaving');
    expect(r.played).toContain('hmpf');
    expect(r.teased).toHaveLength(0);
    // Leaving: he sinks within LEAVE_MS (the system removes him then).
    const y0 = r.mole.y;
    r.step(LEAVE_MS / (DT * 1000));
    expect(r.mole.y).toBeLessThan(y0 - 0.5);
    expect(r.mole.pose).toBe('sink');
  });

  it('AC249: walls 2 high around the mole are the same as a pen', () => {
    const w = buildMoleMap();
    ring(w, { x0: 60, x1: 62, z0: 100, z1: 102 }, 2);
    const dino = animal(66.5, 101.5);
    const r = start(w, { x: 61.5, z: 101.5 }, [dino]);
    r.until(() => r.mole.phase === 'leaving', 20_000);
    expect(sayTimes(r, 'Hmpf! Ik kan er niet bij.')).toHaveLength(1);
    expect(r.now).toBeLessThanOrEqual(FENCE_MS + 2000);
    expect(r.teased).toHaveLength(0);
  });

  it('AC249: a pen 1 high is stepped over and the animal is teased', () => {
    const inside = animal(PEN1.x0 + 2.5, PEN1.z0 + 2.5);
    const r = start(world, { x: PEN1.x0 - 6.5, z: PEN1.z0 + 2.5 }, [inside]);
    r.until(() => r.teased.length > 0, 30_000);
    expect(r.teased[0]).toBe(inside);
    expect(sayTimes(r, 'Hmpf! Ik kan er niet bij.')).toHaveLength(0);
    expect(r.mole.phase).toBe('out');
  });

  it('AC249: a gap in the fence is a way in', () => {
    const w = buildMoleMap();
    box(w, PEN2.x0 - 1, PEN2.x0 - 1, PEN2.z0 + 2, PEN2.z0 + 2, GY, GY + 1, 0);
    const inside = animal(PEN2.x0 + 2.5, PEN2.z0 + 2.5);
    const r = start(w, { x: PEN2.x0 - 7.5, z: PEN2.z0 + 2.5 }, [inside]);
    r.until(() => r.teased.length > 0, 30_000);
    expect(r.teased[0]).toBe(inside);
  });
});

describe('no one to tease and tired (v16, AC250)', () => {
  it('AC250: no animal at all: "Niemand om mee te spelen..." at 60 s plus or minus 1', () => {
    const r = start(world, { x: 10.5, z: 10.5 }, []);
    r.until(() => r.mole.phase === 'leaving', 90_000);
    const at = sayTimes(r, 'Niemand om mee te spelen...')[0] ?? -1;
    expect(at).toBeGreaterThanOrEqual(LONELY_MS - 1000);
    expect(at).toBeLessThanOrEqual(LONELY_MS + 1000);
    expect(r.played).toContain('hmpf');
  });

  it('AC250: all animals on Volg mij: the same', () => {
    const r = start(world, { x: 10.5, z: 10.5 }, [animal(14.5, 10.5, 'follow'), animal(8.5, 12.5, 'follow')]);
    r.until(() => r.mole.phase === 'leaving', 90_000);
    const at = sayTimes(r, 'Niemand om mee te spelen...')[0] ?? -1;
    expect(Math.abs(at - LONELY_MS)).toBeLessThanOrEqual(1000);
  });

  it('AC250: after 10 minutes he yawns "Ik ga slapen" and goes', () => {
    const r = start(world, { x: 10.5, z: 14.5 }, [animal(12.5, 12.5), animal(8.5, 18.5)]);
    r.until(() => r.mole.phase === 'leaving', MOLE_TIRED_MS + 5000);
    const at = sayTimes(r, 'Ik ga slapen')[0] ?? -1;
    expect(Math.abs(at - MOLE_TIRED_MS)).toBeLessThanOrEqual(1000);
    expect(r.played).toContain('geeuw');
    expect(r.mole.phase).toBe('leaving');
  });
});

describe('he is a good guest (v16, AC252)', () => {
  it('AC252: 2 minutes seeded: the world, the animals and the kid are unchanged, he keeps clear of the kid', () => {
    const w = buildMoleMap();
    // A small village in the way: huts with a door gap 2 high.
    for (const x of [30, 34]) {
      ring(w, { x0: x, x1: x + 1, z0: 28, z1: 29 }, 3);
      box(w, x - 1, x - 1, 28, 29, GY, GY + 1, 0);
    }
    const before = w.diff();
    const dinos = [animal(37.5, 28.5), animal(8.5, 24.5), animal(16.5, 40.5)];
    const snapshot = dinos.map((d) => ({ ...d }));
    const kid = { x: 12.5, y: GY, z: 26.5 };
    const r = start(w, { x: 25.5, z: 28.5 }, dinos, kid, 7);
    r.step(120_000 / (DT * 1000));
    expect(r.mole.phase).toBe('out');
    expect(w.diff()).toEqual(before);
    expect(w.hiddenCount()).toBe(0);
    expect(r.overlapped).toBe(false);
    expect(r.minKidDistance).toBeGreaterThan(1);
    expect(r.teased.length).toBeGreaterThan(0);
    for (let i = 0; i < dinos.length; i++) {
      const d = dinos[i] as DinoState;
      const s = snapshot[i] as DinoState;
      expect([d.x, d.y, d.z, d.mode, d.kind]).toEqual([s.x, s.y, s.z, s.mode, s.kind]);
    }
    expect(r.played.filter((p) => p !== 'boe' && p !== 'boing')).toEqual([]);
  });

  it('AC252: the kid standing in his way: he goes round and never within 1 block', () => {
    const dino = animal(20.5 - 8, 20.5);
    const kid = { x: 10.5, y: GY, z: 20.5 };
    const r = start(world, { x: 17.5, z: 20.5 }, [dino], kid);
    r.step(60_000 / (DT * 1000));
    expect(r.minKidDistance).toBeGreaterThan(1);
    expect(r.overlapped).toBe(false);
    expect(r.teased.length).toBeGreaterThan(0);
  });

  it('AC252: the kid walks up to him and he steps away', () => {
    const r = start(world, { x: 10.5, z: 20.5 }, [animal(14.5, 25.5)], { x: 10.5, y: GY, z: 20.5 + 1.5 });
    // The kid is within 1 block of him at the start.
    const d0 = Math.hypot(r.mole.x - 10.5, r.mole.z - 22);
    r.step(60);
    expect(Math.hypot(r.mole.x - 10.5, r.mole.z - 22)).toBeGreaterThan(d0);
  });
});
