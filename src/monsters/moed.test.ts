import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import { BANNED_WORDS } from '../core/kid-words';
import { createKnightBody, stepKnight } from '../knights/knight-ai';
import type { KnightMode, KnightState } from '../knights/knight-types';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createKlodder } from './klodder';
import { HINT_TEXT, MOED_FULL, stepMoed } from './moed';
import type { MonsterContext } from './monster-types';

const sx = START_SPOT.x, sy = START_SPOT.y, sz = START_SPOT.z;
function knight(mode: KnightMode, x: number, z: number): KnightState {
  const body = createKnightBody({ x, y: sy, z });
  return { id: `k${x}${z}`, mode, spot: null, boughtFor: 0, body, chase: null, saluteClockMs: 0, visible: true };
}
function setup(knights: KnightState[], hint = true) {
  const k = createKlodder({ x: sx, y: sy, z: sz });
  const say = vi.fn();
  const play = vi.fn();
  const markHintShown = vi.fn();
  let shown = hint;
  const ctx = (dt: number): MonsterContext => ({
    world: new World(), rng: createRng(1), dt, kid: { x: sx + 30, y: sy, z: sz }, kidBox: [0, 0, 0, 1, 1, 1],
    occupied: () => false, knights: () => knights, touch: () => undefined, say, play,
    markHintShown: () => { shown = true; markHintShown(); }, hintShown: () => shown,
  });
  const run = (maxS: number) => {
    let t = 0;
    while (t < maxS) {
      t += 0.1;
      if (stepMoed(k, ctx(0.1))) return t;
    }
    return -1;
  };
  return { k, say, play, markHintShown, ctx, run };
}

describe('moed (v18d)', () => {
  it('AC216: 1, 2 and 3 pokers take 30, 15 and 10 seconds', () => {
    for (const [n, secs] of [[1, 30], [2, 15], [3, 10]] as const) {
      const ks = Array.from({ length: n }, (_, i) => knight('stay', sx + 1 + i * 0.1, sz));
      const s = setup(ks);
      expect(Math.abs(s.run(60) - secs)).toBeLessThanOrEqual(1);
    }
  });
  it('AC216: the bar never fills in under 3 seconds, even with many pokers', () => {
    const ks = Array.from({ length: 6 }, (_, i) => knight('stay', sx + 1, sz + i * 0.1));
    const s = setup(ks);
    expect(s.run(60)).toBeGreaterThanOrEqual(3);
  });
  it('AC216: full says Wegwezen and Doei, frees every chase, and the bar keeps its value without pokers', () => {
    const near = knight('follow', sx + 1, sz);
    const far = knight('guard', sx + 12, sz);
    const s = setup([near, far]);
    s.run(5);
    expect(far.chase).not.toBeNull();
    near.body.x = sx + 5;
    s.run(1);
    const kept = s.k.moed;
    expect(kept).toBeGreaterThan(4);
    s.run(1);
    expect(s.k.moed).toBe(kept);
    near.body.x = sx + 1;
    expect(s.run(40)).toBeGreaterThan(0);
    expect(s.say).toHaveBeenCalledWith('Wegwezen!', expect.anything());
    expect(s.say).toHaveBeenCalledWith('Doei!', expect.anything());
    expect(s.play).toHaveBeenCalledWith('doei');
    expect(s.play).toHaveBeenCalledWith('tok');
    expect(near.chase).toBeNull();
    expect(far.chase).toBeNull();
    expect(s.k.moed).toBe(MOED_FULL);
  });
  it('AC216: a follow knight at 12 blocks does not go, a guard at 12 does', () => {
    const f = knight('follow', sx + 12, sz);
    const g = knight('guard', sx + 12, sz + 1);
    const s = setup([f, g]);
    s.run(1);
    expect(f.chase).toBeNull();
    expect(g.chase).not.toBeNull();
    expect(s.k.pokers).toBe(0);
  });
  it('AC216: Klodder stands still while poked', () => {
    const s = setup([knight('stay', sx + 1, sz)]);
    s.k.target = { x: 1, y: 1, z: 1 };
    s.run(1);
    expect(s.k.target).toBeNull();
    expect(s.k.nibbleWaitMs).toBeGreaterThan(0);
  });
  it('AC216: a guard knight in a closed pen pops out after 3 seconds and reaches him', () => {
    const world = new World();
    const gx = Math.floor(sx) + 6, gz = Math.floor(sz);
    const y = Math.floor(sy);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue;
      for (let h = 0; h < 4; h++) world.set(gx + dx, y + h, gz + dz, 3);
    }
    const kn = knight('guard', gx + 0.5, gz + 0.5);
    kn.body.y = y;
    const s = setup([kn]);
    const rng = createRng(2);
    let t = 0;
    while (t < 12 && s.k.pokers === 0) {
      stepMoed(s.k, s.ctx(1 / 30));
      stepKnight(kn, { world, rng, player: { x: sx + 30, y: sy, z: sz }, playerYaw: 0, dt: 1 / 30 });
      t += 1 / 30;
    }
    expect(s.k.pokers).toBe(1);
    expect(t).toBeGreaterThanOrEqual(2.8);
  });
  it('AC222: the hint shows once, only without a knight, and is marked', () => {
    const none = setup([], false);
    none.run(0.2);
    expect(none.say).toHaveBeenCalledWith(HINT_TEXT, expect.anything());
    expect(none.markHintShown).toHaveBeenCalledTimes(1);
    none.run(1);
    expect(none.say).toHaveBeenCalledTimes(1);
    const owned = setup([knight('stay', sx + 20, sz)], false);
    owned.run(0.2);
    expect(owned.say).not.toHaveBeenCalled();
    expect(owned.markHintShown).toHaveBeenCalledTimes(1);
    const later = setup([], true);
    later.run(0.5);
    expect(later.say).not.toHaveBeenCalled();
    expect(later.markHintShown).not.toHaveBeenCalled();
  });
  it('AC222: the hint is kind, does not point at the shop, and has no banned word', () => {
    expect(HINT_TEXT).toBe('Klodder wordt vanzelf moe. Een ridder kan hem sneller wegsturen.');
    const words = HINT_TEXT.toLowerCase().match(/[a-zà-ÿ]+/g) ?? [];
    for (const w of words) expect(BANNED_WORDS).not.toContain(w);
    expect(HINT_TEXT.toLowerCase()).not.toMatch(/koop|winkel|punten/);
  });
});

describe('AC262: Kracht in the Klodder bar', () => {
  const dressed = (worn: KnightState['gear'], z = sz): KnightState => ({ ...knight('stay', sx + 1, z), gear: worn });
  const KRACHT3 = { hoofd: 'ijzeren-helm', schild: 'houten-schild' } as const;
  const KRACHT5 = { hoofd: 'leren-kap', schild: 'houten-schild', hand: 'glimzwaard', rug: 'riddercape' } as const;

  it('AC262: Kracht 3 takes 10 seconds, Kracht 5 takes 6, with the Pony still 6, bare 30 (plus or minus 1)', () => {
    for (const [worn, secs] of [[KRACHT3, 10], [KRACHT5, 6], [{ ...KRACHT5, rijdier: 'pony' }, 6], [undefined, 30]] as const) {
      const s = setup([dressed(worn)]);
      expect(Math.abs(s.run(60) - secs)).toBeLessThanOrEqual(1);
    }
  });
  it('AC262: 3 knights with Kracht 5 never fill the bar under 3 seconds', () => {
    const s = setup([dressed(KRACHT5, sz), dressed(KRACHT5, sz + 0.1), dressed(KRACHT5, sz + 0.2)]);
    const t = s.run(60);
    expect(t).toBeGreaterThanOrEqual(3);
    expect(t).toBeLessThanOrEqual(4);
  });
  it('AC262: a poking knight gets poking = true for the frame, a knight out of reach does not', () => {
    const near = dressed(KRACHT3);
    const far = { ...knight('stay', sx + 6, sz), gear: undefined };
    const s = setup([near, far]);
    stepMoed(s.k, s.ctx(0.1));
    expect(near.poking).toBe(true);
    expect(far.poking).toBeUndefined();
  });
});

describe('AC265: the Kietelveer giggle in the Klodder bar', () => {
  const poker = (gear: KnightState['gear']): KnightState => ({ ...knight('stay', sx + 1, sz), gear });
  it('AC265: each "Tok!" of a poker with the Kietelveer also plays hihihi', () => {
    const s = setup([poker({ hand: 'kietelveer' })]);
    s.run(9);
    const toks = s.play.mock.calls.filter((c) => c[0] === 'tok').length;
    expect(toks).toBeGreaterThanOrEqual(2);
    expect(s.play.mock.calls.filter((c) => c[0] === 'hihihi')).toHaveLength(toks);
  });
  it('AC265: a bare poker and a poker with another Hand item do not giggle', () => {
    for (const gear of [undefined, { hand: 'glimzwaard' }] as const) {
      const s = setup([poker(gear)]);
      s.run(9);
      expect(s.play).toHaveBeenCalledWith('tok');
      expect(s.play).not.toHaveBeenCalledWith('hihihi');
    }
  });
});
