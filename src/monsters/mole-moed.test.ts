import { beforeAll, describe, expect, it } from 'vitest';
import { buildMoleMap, GY, PEN2 } from '../../tests/fixtures/maps/mole-map';
import { createRng } from '../core/rng';
import { createKnightBody, stepKnight } from '../knights/knight-ai';
import type { KnightMode, KnightState } from '../knights/knight-types';
import type { World } from '../world/world';
import { createMole } from './mole';
import { moleMoedFraction, stepMoleMoed } from './mole-moed';
import { MOLE_MOED_FULL, type MonsterContext } from './monster-types';

let world: World;
beforeAll(() => {
  world = buildMoleMap();
});

const DT = 0.05;

function knight(mode: KnightMode, x: number, z: number, id = 'k'): KnightState {
  const body = createKnightBody({ x, y: GY, z });
  body.stayX = x;
  body.stayZ = z;
  return { id, mode, spot: mode === 'follow' ? null : { x, y: GY, z }, boughtFor: 0, body, chase: null, saluteClockMs: 0, visible: true };
}

function ctxFor(knights: KnightState[], said: string[] = []): MonsterContext {
  return {
    world, rng: createRng(1), dt: DT, kid: { x: 5.5, y: GY, z: 5.5 }, kidBox: [5.2, GY, 5.2, 5.8, GY + 1.8, 5.8],
    occupied: () => false, knights: () => knights, touch: () => {},
    say: (t) => said.push(t), play: () => {},
    labels: { show: (_key: string, text: string) => (said.push(text), true) } as unknown as MonsterContext['labels'], animals: () => [], markHintShown: () => {}, hintShown: () => true,
  };
}

/** Seconds until the bar is full with `n` knights standing next to him (the knights do not move). */
function secondsWith(n: number): number {
  const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
  const ks = Array.from({ length: n }, (_, i) => knight('stay', 31.5, 30.5 + i * 0.1, `k${i}`));
  const said: string[] = [];
  const ctx = ctxFor(ks, said);
  let t = 0;
  while (t < 60) {
    t += DT;
    if (stepMoleMoed(mole, ctx)) {
      expect(said).toContain('Wegwezen!');
      expect(said).toContain('Hmpf!');
      expect(ks.every((k) => k.chase === null)).toBe(true);
      return t;
    }
  }
  return Infinity;
}

describe('the mole Moed bar (v16, AC251)', () => {
  it('AC251: 1, 2 and 3 pokers take 15, 7.5 and 5 s (plus or minus 1), never under 3', () => {
    for (const [n, expected] of [[1, 15], [2, 7.5], [3, 5]] as const) {
      const t = secondsWith(n);
      expect(Math.abs(t - expected)).toBeLessThanOrEqual(1);
      expect(t).toBeGreaterThanOrEqual(3);
    }
  });

  it('AC251: the fraction follows the bar', () => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const ctx = ctxFor([knight('stay', 31.5, 30.5)]);
    for (let i = 0; i < 20 * 5; i++) stepMoleMoed(mole, ctx);
    expect(mole.pokers).toBe(1);
    expect(moleMoedFraction(mole)).toBeCloseTo(5 / MOLE_MOED_FULL, 1);
  });

  it('AC251: a knight on Volg mij 12 blocks away does not go; a guard does', () => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const follow = knight('follow', 42.5, 30.5, 'f');
    const guard = knight('guard', 42.5, 30.5, 'g');
    stepMoleMoed(mole, ctxFor([follow, guard]));
    expect(follow.chase).toBeNull();
    expect(guard.chase).not.toBeNull();
    expect(mole.pokers).toBe(0);
    // 17 blocks: out of reach of the guard too.
    guard.chase = null;
    guard.body.x = 47.6;
    stepMoleMoed(mole, ctxFor([guard]));
    expect(guard.chase).toBeNull();
  });

  it('AC251: with Klodder and the mole both out each knight goes to the nearer one', () => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const nearMole = knight('stay', 33.5, 30.5, 'a');
    const nearKlodder = knight('stay', 27.5, 30.5, 'b');
    // Klodder's step ran first: both knights point to him at (24.5, 30.5).
    nearMole.chase = { x: 24.5, z: 30.5 };
    nearKlodder.chase = { x: 24.5, z: 30.5 };
    const klodderChase = nearKlodder.chase;
    stepMoleMoed(mole, ctxFor([nearMole, nearKlodder]));
    expect(nearMole.chase).toMatchObject({ x: 30.5, z: 30.5 });
    expect(nearKlodder.chase).toBe(klodderChase);
  });

  it('AC251: a guard in a closed pen 2 high pops next to the mole after 3 s stuck, and the bar fills', () => {
    const mole = createMole({ x: PEN2.x0 - 6.5, y: GY, z: PEN2.z0 + 2.5 }, { x: 0, z: 0 });
    const k = knight('guard', PEN2.x0 + 2.5, PEN2.z0 + 2.5);
    const ctx = ctxFor([k]);
    const rng = createRng(3);
    let popped = -1;
    let t = 0;
    let px = k.body.x;
    while (t < 20 && popped < 0) {
      t += DT;
      stepMoleMoed(mole, ctx);
      stepKnight(k, { world, rng, player: ctx.kid, playerYaw: 0, dt: DT });
      if (Math.abs(k.body.x - px) > 1.5) popped = t;
      px = k.body.x;
    }
    expect(popped).toBeGreaterThanOrEqual(3);
    expect(popped).toBeLessThanOrEqual(5.5);
    expect(Math.hypot(k.body.x - mole.x, k.body.z - mole.z)).toBeLessThan(3);
    for (let i = 0; i < 40; i++) {
      stepMoleMoed(mole, ctx);
      stepKnight(k, { world, rng, player: ctx.kid, playerYaw: 0, dt: DT });
    }
    expect(mole.pokers).toBe(1);
    expect(mole.moed).toBeGreaterThan(1);
  });
});

describe('AC262: Kracht in the mole bar', () => {
  const secondsDressed = (gears: KnightState['gear'][]): number => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const ks = gears.map((g, i) => ({ ...knight('stay', 31.5, 30.5 + i * 0.1, `k${i}`), gear: g }));
    const ctx = ctxFor(ks);
    let t = 0;
    while (t < 60) {
      t += DT;
      if (stepMoleMoed(mole, ctx)) return t;
    }
    return Infinity;
  };
  const KRACHT3 = { hoofd: 'ijzeren-helm', schild: 'houten-schild' } as const;
  const KRACHT5 = { hoofd: 'leren-kap', schild: 'houten-schild', hand: 'glimzwaard', rug: 'riddercape' } as const;

  it('AC262: Kracht 3 takes 5 seconds, Kracht 5 takes 3, bare 15 (plus or minus 1)', () => {
    expect(Math.abs(secondsDressed([KRACHT3]) - 5)).toBeLessThanOrEqual(1);
    expect(Math.abs(secondsDressed([KRACHT5]) - 3)).toBeLessThanOrEqual(1);
    expect(Math.abs(secondsDressed([{ ...KRACHT5, rijdier: 'pony' }]) - 3)).toBeLessThanOrEqual(1);
    expect(Math.abs(secondsDressed([undefined]) - 15)).toBeLessThanOrEqual(1);
  });
  it('AC262: 3 knights with Kracht 5 never fill the bar under 3 seconds', () => {
    expect(secondsDressed([KRACHT5, KRACHT5, KRACHT5])).toBeGreaterThanOrEqual(3 - 1e-6); // float sum of 60 steps
  });
});

describe('AC265: the Kietelveer giggle in the mole bar', () => {
  const plays = (gear: KnightState['gear']): string[] => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const played: string[] = [];
    const ctx = { ...ctxFor([{ ...knight('stay', 31.5, 30.5), gear }]), play: (n: string) => { played.push(n); } } as MonsterContext;
    for (let t = 0; t < 9; t += DT) stepMoleMoed(mole, ctx);
    return played;
  };
  it('AC265: each "Tok!" of a poker with the Kietelveer also plays hihihi', () => {
    const played = plays({ hand: 'kietelveer' });
    const toks = played.filter((n) => n === 'tok').length;
    expect(toks).toBeGreaterThanOrEqual(2);
    expect(played.filter((n) => n === 'hihihi')).toHaveLength(toks);
  });
  it('AC265: a bare poker does not giggle', () => {
    const played = plays(undefined);
    expect(played).toContain('tok');
    expect(played).not.toContain('hihihi');
  });
});

describe('AC285: the banners and the mole', () => {
  it('AC285: a guard with the Koningsbanier goes to the mole at 21 blocks and not at 23', () => {
    const mole = createMole({ x: 10.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const near = { ...knight('guard', 31.5, 30.5, 'n'), gear: { vlag: 'koningsbanier' } };
    const far = { ...knight('guard', 33.5, 30.5, 'f'), gear: { vlag: 'koningsbanier' } };
    stepMoleMoed(mole, ctxFor([near, far]));
    expect(near.chase).not.toBeNull();
    expect(far.chase).toBeNull();
  });
  it('AC285: a follower with the Banier goes at 11 blocks and not at 13', () => {
    const mole = createMole({ x: 10.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const near = { ...knight('follow', 21.5, 30.5, 'n'), gear: { vlag: 'banier' } };
    const far = { ...knight('follow', 23.5, 30.5, 'f'), gear: { vlag: 'banier' } };
    stepMoleMoed(mole, ctxFor([near, far]));
    expect(near.chase).not.toBeNull();
    expect(far.chase).toBeNull();
  });
});

describe('AC329: a full bar chases him off and never removes him', () => {
  function fight(rngSeed = 1) {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    mole.id = 1;
    const k = knight('guard', 31.5, 30.5);
    const lines: { text: string; kind?: string }[] = [];
    const ctx = {
      ...ctxFor([k]),
      rng: createRng(rngSeed),
      labels: { show: (_key: string, text: string, style: string) => (lines.push({ text, kind: `label-${style}` }), true) } as unknown as MonsterContext['labels'],
      say: (text: string, _ms?: number, kind?: string) => { lines.push({ text, kind }); },
    } as MonsterContext;
    let full = false;
    for (let t = 0; t < 30 && !full; t += DT) full = stepMoleMoed(mole, ctx);
    return { mole, k, lines, full };
  }

  it('AC329: a full bar sets him away, says the four lines and frees the knight', () => {
    const { mole, k, lines, full } = fight();
    expect(full).toBe(true);
    expect(mole.dove).toEqual({ x: mole.x, z: mole.z });
    expect(mole.awayMs).toBeGreaterThanOrEqual(60_000);
    expect(mole.awayMs).toBeLessThanOrEqual(90_000);
    expect(k.chase).toBeNull();
    const texts = lines.map((l) => l.text);
    expect(texts).toEqual(expect.arrayContaining(['Wegwezen!', 'Hmpf!']));
    // "Hmpf!" comes at the moment he runs, as a label over him, between "Wegwezen!" and the toast.
    expect(texts.filter((t) => t !== 'Tok!')).toEqual(['Wegwezen!', 'Hmpf!', 'De Monstermol rent weg. Hij komt vast stiekem terug!', 'Bouw een hek van 2 hoog om hem heen.']);
    expect(lines.find((l) => l.text === 'Hmpf!')?.kind).toBe('label-speech');
    // The toast and the help line are mole lines: the help line follows the toast within 1 second (speech.ts).
    expect(lines.filter((l) => l.kind === 'mole').map((l) => l.text)).toEqual(['De Monstermol rent weg. Hij komt vast stiekem terug!', 'Bouw een hek van 2 hoog om hem heen.']);
  });

  it('AC329: 20 seeded chase offs give away times of 60 to 90 seconds', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { mole } = fight(seed);
      expect(mole.awayMs).toBeGreaterThanOrEqual(60_000);
      expect(mole.awayMs).toBeLessThanOrEqual(90_000);
    }
  });

  it('AC329: a caught mole is never noticed, poked or chased off', () => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    mole.caught = true;
    const ks = [knight('guard', 31.5, 30.5, 'a'), knight('chase', 32.5, 30.5, 'b'), knight('follow', 31.5, 31.5, 'c')];
    const ctx = ctxFor(ks);
    for (let t = 0; t < 40; t += DT) expect(stepMoleMoed(mole, ctx)).toBe(false);
    expect(ks.every((k) => k.chase === null && !k.poking)).toBe(true);
    expect(mole.pokers).toBe(0);
    expect(mole.moed).toBe(0);
    expect(mole.dove).toBeNull();
  });

  it('AC337: a knight on Jaag monsters weg notices him 80 blocks away, a Blijf hier knight does not', () => {
    const mole = createMole({ x: 10.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const chaser = knight('chase', 90.5, 30.5, 'c');
    const stayer = knight('stay', 90.5, 30.5, 's');
    stepMoleMoed(mole, ctxFor([chaser, stayer]));
    expect(chaser.chase).toMatchObject({ x: 10.5, z: 30.5 });
    expect(stayer.chase).toBeNull();
  });

  it('AC337: 3 knights on Jaag monsters weg fill the bar in 5 seconds (plus or minus 1)', () => {
    const mole = createMole({ x: 30.5, y: GY, z: 30.5 }, { x: 0, z: 0 });
    const ks = [0, 1, 2].map((i) => knight('chase', 31.5, 30.5 + i * 0.1, `k${i}`));
    const ctx = ctxFor(ks);
    let t = 0;
    while (t < 60 && !stepMoleMoed(mole, ctx)) t += DT;
    expect(Math.abs(t - 5)).toBeLessThanOrEqual(1);
  });
});
