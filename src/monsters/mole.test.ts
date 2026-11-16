import { beforeAll, describe, expect, it } from 'vitest';
import {
  box, buildMoleMap, GY, PEN1, PEN2, ring,
} from '../../tests/fixtures/maps/mole-map';
import { createRng } from '../core/rng';
import { callDino, createDino, type DinoState } from '../dinos/dino-ai';
import type { KnightState } from '../knights/knight-types';
import type { World } from '../world/world';
import { canTeaseFrom, createMole, HOME_RADIUS, LINE_ALL_GUARDED, moleBox, stepMole, TEASE_GAP_MS } from './mole';
import { FENCE_MS, LEAVE_MS, LONELY_MS, type Cell, type MoleState, type MonsterContext } from './monster-types';

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
interface Extras {
  /** Animals a guard knight watches. */
  guarded?: readonly DinoState[];
  knights?: readonly KnightState[];
}

/** A guard knight at a spot, for the distance rule. */
function guard(x: number, z: number): KnightState {
  return { mode: 'guard', visible: true, body: { x, y: GY, z } } as unknown as KnightState;
}

function start(w: World, at: { x: number; z: number }, animals: DinoState[], kid = { x: 5.5, y: GY, z: 5.5 }, seed = 1, extras: Extras = {}): Run {
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
          occupied: () => false, knights: () => extras.knights ?? ([] as readonly KnightState[]), touch: () => {},
          isGuarded: (a) => extras.guarded?.includes(a) === true,
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

describe('the fence rule: he waits and never leaves (v22, AC249, AC295)', () => {
  const HMPF = 'Hmpf! Ik kan er niet bij.';

  it('AC295: an animal in a pen 2 high: Hmpf after 10 s plus at most 2 s, and he stays out', () => {
    const inside = animal(PEN2.x0 + 2.5, PEN2.z0 + 2.5);
    const r = start(world, { x: PEN2.x0 - 7.5, z: PEN2.z0 + 2.5 }, [inside]);
    r.until(() => sayTimes(r, HMPF).length > 0, 20_000);
    const [at] = sayTimes(r, HMPF);
    expect(at).toBeGreaterThanOrEqual(FENCE_MS);
    expect(at).toBeLessThanOrEqual(FENCE_MS + 2000);
    expect(r.mole.phase).toBe('out');
    expect(r.played).toContain('hmpf');
    expect(r.teased).toHaveLength(0);
    r.step(LEAVE_MS / (DT * 1000));
    expect(r.mole.phase).toBe('out');
    expect(r.mole.pose).not.toBe('sink');
  });

  it('AC295: a pen around every animal: 30 minutes later he is still out and Hmpf showed at most once per minute', () => {
    const w = buildMoleMap();
    const a = animal(PEN2.x0 + 1.5, PEN2.z0 + 1.5);
    const b = animal(PEN2.x0 + 4.5, PEN2.z0 + 4.5);
    const r = start(w, { x: PEN2.x0 - 7.5, z: PEN2.z0 + 2.5 }, [a, b]);
    r.step(30 * 60_000 / (DT * 1000));
    expect(r.mole.phase).toBe('out');
    const times = sayTimes(r, HMPF);
    expect(times.length).toBeGreaterThanOrEqual(25);
    for (let i = 1; i < times.length; i++) expect((times[i] as number) - (times[i - 1] as number)).toBeGreaterThanOrEqual(60_000 - DT * 1000);
    expect(r.teased).toHaveLength(0);
    // 36 000 steps: about 3 seconds here, more on a busy CI runner, so this case gets its own time limit.
  }, 30_000);

  it('AC295: walls 2 high around the mole are the same as a pen: he waits and says Hmpf once', () => {
    const w = buildMoleMap();
    ring(w, { x0: 60, x1: 62, z0: 100, z1: 102 }, 2);
    const dino = animal(66.5, 101.5);
    const r = start(w, { x: 61.5, z: 101.5 }, [dino]);
    r.step(50_000 / (DT * 1000));
    expect(sayTimes(r, HMPF)).toHaveLength(1);
    expect(r.mole.phase).toBe('out');
    expect(r.teased).toHaveLength(0);
  });

  it('AC249: a pen 1 high is stepped over and the animal is teased', () => {
    const inside = animal(PEN1.x0 + 2.5, PEN1.z0 + 2.5);
    const r = start(world, { x: PEN1.x0 - 6.5, z: PEN1.z0 + 2.5 }, [inside]);
    r.until(() => r.teased.length > 0, 30_000);
    expect(r.teased[0]).toBe(inside);
    expect(sayTimes(r, HMPF)).toHaveLength(0);
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

describe('no tease across a wall (v16, AC249)', () => {
  /** A pen 2 high whose four corner cells are left open: closed for walking, but a corner touches the animal diagonally. */
  const CORNERS = { x0: 85, x1: 87, z0: 60, z1: 62 };
  function cornerlessPen(height: number): World {
    const w = buildMoleMap();
    ring(w, CORNERS, height);
    for (const x of [CORNERS.x0 - 1, CORNERS.x1 + 1]) {
      for (const z of [CORNERS.z0 - 1, CORNERS.z1 + 1]) box(w, x, x, z, z, GY, GY + 1, 0);
    }
    return w;
  }

  it('AC249: canTeaseFrom: a diagonal with both side cells blocked 2 high is no tease, one open side is', () => {
    const w = cornerlessPen(2);
    const animalCell = { x: CORNERS.x0, y: GY, z: CORNERS.z0 };
    expect(canTeaseFrom(w, { x: CORNERS.x0 - 1, y: GY, z: CORNERS.z0 - 1 }, animalCell)).toBe(false);
    // A gap in the wall at the side makes the diagonal a way.
    box(w, CORNERS.x0 - 1, CORNERS.x0 - 1, CORNERS.z0, CORNERS.z0, GY, GY + 1, 0);
    expect(canTeaseFrom(w, { x: CORNERS.x0 - 1, y: GY, z: CORNERS.z0 - 1 }, animalCell)).toBe(true);
    // The same cell, a side neighbour and a cell 2 away.
    expect(canTeaseFrom(w, animalCell, animalCell)).toBe(true);
    expect(canTeaseFrom(w, { x: CORNERS.x0 - 1, y: GY, z: CORNERS.z0 }, animalCell)).toBe(true);
    expect(canTeaseFrom(w, { x: CORNERS.x0 - 2, y: GY, z: CORNERS.z0 }, animalCell)).toBe(false);
  });

  it('AC249: an animal in a corner of a pen 2 high is not teased through the corner: Hmpf, no tease', () => {
    const w = cornerlessPen(2);
    const inside = animal(CORNERS.x0 + 0.5, CORNERS.z0 + 0.5);
    const r = start(w, { x: CORNERS.x0 - 7.5, z: CORNERS.z0 - 7.5 }, [inside]);
    r.until(() => sayTimes(r, 'Hmpf! Ik kan er niet bij.').length > 0, 20_000);
    expect(sayTimes(r, 'Hmpf! Ik kan er niet bij.')).toHaveLength(1);
    expect(r.teased).toHaveLength(0);
    expect(sayTimes(r, 'Boe!')).toHaveLength(0);
  });

  it('AC249: the same pen 1 high is stepped over and teased', () => {
    const w = cornerlessPen(1);
    const inside = animal(CORNERS.x0 + 0.5, CORNERS.z0 + 0.5);
    const r = start(w, { x: CORNERS.x0 - 7.5, z: CORNERS.z0 - 7.5 }, [inside]);
    r.until(() => r.teased.length > 0, 30_000);
    expect(r.teased[0]).toBe(inside);
  });
});

describe('he stays: nobody to play with, tease gap, guards (v22, AC295, AC332)', () => {
  const dist = (r: Run): number => Math.hypot(r.mole.x - r.mole.home.x, r.mole.z - r.mole.home.z);

  it('AC295: no animal at all: 30 minutes later he is out, within 6 of home, and the lonely line showed exactly once at 60 s', () => {
    const r = start(world, { x: 10.5, z: 10.5 }, []);
    let far = 0;
    for (let i = 0; i < 30 * 60_000 / (DT * 1000); i++) {
      r.step(1);
      far = Math.max(far, dist(r));
    }
    expect(r.mole.phase).toBe('out');
    expect(far).toBeLessThanOrEqual(HOME_RADIUS);
    const times = sayTimes(r, 'Niemand om mee te spelen...');
    expect(times).toHaveLength(1);
    expect(Math.abs((times[0] as number) - LONELY_MS)).toBeLessThanOrEqual(1000);
    expect(r.mole.outMs).toBeGreaterThan(1_790_000);
    // He did waddle about.
    expect(far).toBeGreaterThan(1);
  });

  it('AC295: all animals on Volg mij: the same, once', () => {
    const r = start(world, { x: 10.5, z: 10.5 }, [animal(14.5, 10.5, 'follow'), animal(8.5, 12.5, 'follow')]);
    r.step(5 * 60_000 / (DT * 1000));
    const times = sayTimes(r, 'Niemand om mee te spelen...');
    expect(times).toHaveLength(1);
    expect(Math.abs((times[0] as number) - LONELY_MS)).toBeLessThanOrEqual(1000);
    expect(r.mole.phase).toBe('out');
  });

  it('AC295: 5 minutes with 3 animals: no two teases are less than 15 000 ms apart', () => {
    const r = start(world, { x: 10.5, z: 14.5 }, [animal(12.5, 12.5), animal(8.5, 18.5), animal(14.5, 20.5)]);
    r.step(5 * 60_000 / (DT * 1000));
    const times = sayTimes(r, 'Boe!');
    expect(times.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < times.length; i++) expect((times[i] as number) - (times[i - 1] as number)).toBeGreaterThanOrEqual(TEASE_GAP_MS - 1);
    expect(r.mole.phase).toBe('out');
  });

  it('AC332: 10 minutes with 4 guarded and 3 unguarded animals: only the unguarded ones are teased', () => {
    const guarded = [animal(12.5, 12.5), animal(14.5, 14.5), animal(16.5, 12.5), animal(14.5, 10.5)];
    const free = [animal(8.5, 18.5), animal(12.5, 22.5), animal(18.5, 20.5)];
    const r = start(world, { x: 10.5, z: 16.5 }, [...guarded, ...free], undefined, 3, { guarded });
    r.step(10 * 60_000 / (DT * 1000));
    expect(r.teased.length).toBeGreaterThan(5);
    for (const t of r.teased) expect(guarded).not.toContain(t);
    expect(new Set(r.teased).size).toBeGreaterThan(1);
  });

  it('AC332: every animal guarded: nobody is teased for 5 minutes, he keeps more than 16 from the knight and says the line once a minute at most', () => {
    const animals = [animal(12.5, 12.5), animal(14.5, 14.5)];
    const knight = guard(13.5, 13.5);
    const r = start(world, { x: 18.5, z: 18.5 }, animals, { x: 3.5, y: GY, z: 3.5 }, 4, { guarded: animals, knights: [knight] });
    let nearest = Infinity;
    for (let i = 0; i < 5 * 60_000 / (DT * 1000); i++) {
      r.step(1);
      if (i * DT * 1000 > 40_000) nearest = Math.min(nearest, Math.max(Math.abs(r.mole.x - 13.5), Math.abs(r.mole.z - 13.5)));
    }
    expect(r.teased).toHaveLength(0);
    expect(sayTimes(r, 'Boe!')).toHaveLength(0);
    expect(nearest).toBeGreaterThan(16);
    const times = sayTimes(r, LINE_ALL_GUARDED);
    expect(times.length).toBeGreaterThanOrEqual(1);
    expect(times.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < times.length; i++) expect((times[i] as number) - (times[i - 1] as number)).toBeGreaterThanOrEqual(60_000 - DT * 1000);
    expect(r.mole.phase).toBe('out');
  });

  it('AC332: when the knight stops guarding, he heads to the animal within 3 s', () => {
    const a = animal(12.5, 12.5);
    const guarded = [a];
    const knights = [guard(13.5, 13.5)];
    const r = start(world, { x: 12.5, z: 20.5 }, [a], { x: 3.5, y: GY, z: 3.5 }, 4, { guarded, knights });
    r.step(40_000 / (DT * 1000));
    expect(r.teased).toHaveLength(0);
    expect(r.mole.target).toBeNull();
    guarded.length = 0;
    knights.length = 0;
    r.until(() => r.mole.target !== null || r.teased.length > 0, 3000);
    expect(r.mole.target !== null || r.teased.length > 0).toBe(true);
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
