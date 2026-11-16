import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import type { KnightFlow } from '../app/knight-flow';
import { createKnightSystem } from './knight-system';
import { KNIGHT_NEAR, MAX_KNIGHTS, type KnightRecord } from './knight-types';

const rec = (id: string, mode: KnightRecord['mode'] = 'follow', spot: KnightRecord['spot'] = null): KnightRecord => ({ id, mode, spot, boughtFor: 30 });

function setup() {
  const world = new World();
  const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
  const player = { player: kid, yaw: 0, pose: () => ({ x: kid.x, y: kid.y + 1.6, z: kid.z, yaw: 0, pitch: 0 }) };
  const flow: KnightFlow = { onEvent: vi.fn(), openMenu: vi.fn() };
  const syncActors = vi.fn();
  let saved: KnightRecord[] = [];
  const persist = vi.fn((change: (k: KnightRecord[]) => KnightRecord[]) => { saved = change(saved); });
  const system = createKnightSystem({ world, player, renderer: { syncActors }, flow, viewport: () => ({ width: 1024, height: 768 }), persist, rng: createRng(1) });
  const dist = (id: string) => {
    const k = system.knights().find((x) => x.id === id)!;
    return Math.hypot(k.body.x - kid.x, k.body.z - kid.z);
  };
  return { system, kid, flow, syncActors, persist, saved: () => saved, setSaved: (s: KnightRecord[]) => { saved = s; }, dist, player };
}

describe('knight system skeleton', () => {
  it('AC209: add puts him within 3 blocks of the kid and emits arrived', () => {
    const s = setup();
    expect(s.system.add(rec('a'))).toBe(true);
    expect(s.dist('a')).toBeLessThanOrEqual(KNIGHT_NEAR);
    expect(s.flow.onEvent).toHaveBeenCalledWith('arrived', expect.objectContaining({ id: 'a' }));
  });
  it('AC200: the cap is 3 knights and a known id is refused', () => {
    const s = setup();
    for (let i = 0; i < MAX_KNIGHTS; i++) expect(s.system.add(rec(`k${i}`))).toBe(true);
    expect(s.system.add(rec('more'))).toBe(false);
    expect(s.system.knights()).toHaveLength(3);
    expect(s.system.remove('k0')).toBe(true);
    expect(s.system.add(rec('k1'))).toBe(false);
    expect(s.system.remove('nope')).toBe(false);
  });
  it('AC209: load places a follower next to the kid and a stay knight at his spot on the first step, with no event', () => {
    const s = setup();
    const spot = { x: s.kid.x + 8, y: s.kid.y, z: s.kid.z + 1 };
    s.system.load([rec('f'), rec('g', 'guard', spot)]);
    s.system.step(1 / 30);
    expect(s.dist('f')).toBeLessThanOrEqual(KNIGHT_NEAR);
    const g = s.system.knights().find((k) => k.id === 'g')!;
    expect([g.body.x, g.body.y, g.body.z]).toEqual([spot.x, spot.y, spot.z]);
    expect(s.flow.onEvent).not.toHaveBeenCalled();
  });
  it('AC209: setMode stay and guard take the spot where he stands and save it at once; follow clears it', () => {
    const s = setup();
    s.setSaved([rec('a')]);
    s.system.add(rec('a'));
    const k = s.system.knights()[0]!;
    expect(s.system.setMode('a', 'guard')).toBe(true);
    expect(k.spot).toEqual({ x: k.body.x, y: k.body.y, z: k.body.z });
    expect(s.saved()[0]).toEqual({ id: 'a', mode: 'guard', spot: k.spot, boughtFor: 30 });
    s.system.setMode('a', 'follow');
    expect(s.saved()[0]).toEqual({ id: 'a', mode: 'follow', spot: null, boughtFor: 30 });
    expect(s.system.setMode('nope', 'stay')).toBe(false);
  });
  it('AC209: a world reset puts every knight within 3 blocks of the kid, moves the spots and saves', () => {
    const s = setup();
    s.setSaved([rec('a', 'stay', { x: 1, y: 1, z: 1 }), rec('b', 'guard', { x: 2, y: 1, z: 2 })]);
    s.system.load(s.saved());
    s.system.step(1 / 30);
    s.kid.x += 20;
    s.system.onWorldReset?.({ ...s.kid });
    for (const id of ['a', 'b']) expect(s.dist(id)).toBeLessThanOrEqual(KNIGHT_NEAR);
    for (const r of s.saved()) {
      expect(Math.hypot(r.spot!.x - s.kid.x, r.spot!.z - s.kid.z)).toBeLessThanOrEqual(KNIGHT_NEAR);
    }
    expect(s.saved().map((r) => r.mode)).toEqual(['stay', 'guard']);
  });
  it('knights off hide and stop taking taps and space; on again brings them back with their modes', () => {
    const s = setup();
    s.system.add(rec('a', 'stay'));
    const k = s.system.knights()[0]!;
    const box: [number, number, number, number, number, number] = [k.body.x - 0.2, k.body.y, k.body.z - 0.2, k.body.x + 0.2, k.body.y + 1, k.body.z + 0.2];
    expect(s.system.isOccupied?.(box)).toBe(true);
    s.system.applySwitches({ knights: false, bubble: false, mole: false });
    // Klodder and the mole skip a knight that is not visible, so a switched off knight must not count as one.
    expect(k.visible).toBe(false);
    expect(s.syncActors).toHaveBeenLastCalledWith('knights', []);
    expect(s.system.isOccupied?.(box)).toBe(false);
    expect(s.system.handleTap?.(512, 384)).toBe(false);
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    s.system.step(1 / 30);
    expect(s.syncActors).toHaveBeenLastCalledWith('knights', [expect.objectContaining({ id: 'a', model: 'knight' })]);
    expect(k.mode).toBe('stay');
  });
  it('knights off from the start (loaded while on, switch applied off) are not visible either', () => {
    const s = setup();
    s.system.load([rec('a', 'stay', { x: s.kid.x + 8, y: s.kid.y, z: s.kid.z })]);
    expect(s.system.knights()[0]!.visible).toBe(true);
    s.system.applySwitches({ knights: false, bubble: false, mole: false });
    expect(s.system.knights()[0]!.visible).toBe(false);
  });
  it('step tells the renderer every frame, and tells it nothing when there never was a knight', () => {
    const s = setup();
    s.system.step(1 / 30);
    expect(s.syncActors).not.toHaveBeenCalled();
    s.system.add(rec('a'));
    s.syncActors.mockClear();
    s.system.step(1 / 30);
    expect(s.syncActors).toHaveBeenCalledTimes(1);
  });
  it('AC204: a knight on Blijf hier stays within 1 block of where he stands', () => {
    const s = setup();
    s.system.add(rec('a', 'stay'));
    const k = s.system.knights()[0]!;
    const before = [k.body.x, k.body.z];
    for (let i = 0; i < 90; i++) s.system.step(1 / 30);
    expect(Math.hypot(k.body.x - before[0]!, k.body.z - before[1]!)).toBeLessThanOrEqual(1);
  });
  it('a tap on a knight opens his menu and takes the tap; a tap elsewhere does not', () => {
    const s = setup();
    s.system.add(rec('a'));
    const k = s.system.knights()[0]!;
    // Put him straight ahead of the kid, who looks to +z at yaw 0.
    k.body.x = s.kid.x; k.body.z = s.kid.z + 3; k.body.y = s.kid.y;
    expect(s.system.handleTap?.(512, 384)).toBe(true);
    expect(s.flow.openMenu).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(s.system.handleTap?.(20, 20)).toBe(false);
  });
  it('setPoints keeps the points of the kid', () => {
    const s = setup();
    s.system.setPoints(29);
    expect(s.system.points()).toBe(29);
  });
});
