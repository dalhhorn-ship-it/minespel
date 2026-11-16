// The mole cases that lived in monster-system.test.ts (v16), moved with the slot in v22 (decision 144). Two changed: a
// bubble no longer shows during the rumble (AC297), so it is refused and the mole still comes; and each mole view has the
// id mole-<id> (the first is mole-1), as his labels and targets do. The last describe tests the v22 seams.
import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import { createDino } from '../dinos/dino-ai';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createMonsterSystem } from './monster-system';
import type { Box } from '../world/build';
import { createTargetList } from './targets';

describe('mole slot (v16, moved in v22)', () => {
  function moleSetup(opts: { mole?: boolean; animals?: ReturnType<typeof createDino>[] } = {}) {
    const world = new World();
    const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
    const player = { player: kid, yaw: 0, pose: () => ({ x: kid.x, y: kid.y + 1.6, z: kid.z, yaw: 0, pitch: 0 }) };
    const syncActors = vi.fn();
    const say = vi.fn();
    const shake = vi.fn();
    const showMoleCard = vi.fn();
    const play = vi.fn();
    const animals = opts.animals ?? [createDino({ kind: 'kip', golden: false, x: kid.x + 10, y: kid.y, z: kid.z }, true)];
    const system = createMonsterSystem({
      world, player, renderer: { syncActors, blockChanged: vi.fn() },
      knights: { knights: () => [] as never, points: () => 0 },
      viewport: () => ({ width: 1024, height: 768 }),
      remainingPlayMs: () => 240_000, say, shake, showMoleCard, sound: { play }, rng: createRng(1),
      animals: () => animals,
    });
    system.applySwitches({ knights: true, bubble: false, mole: opts.mole ?? true });
    const loop = (ms: number) => { for (let t = 0; t < ms; t += 100) system.step(0.1); };
    return { system, world, kid, syncActors, say, shake, showMoleCard, play, loop };
  }
  const cx = Math.floor(START_SPOT.x);
  const cz = Math.floor(START_SPOT.z);

  it('AC245: a dig at y 3 rumbles with the line, the sound and the shake, and the mole comes after 3000 ms', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    expect(s.system.moleState().phase).toBe('rumble');
    expect(s.say).toHaveBeenCalledWith('Oei... de grond rommelt!', expect.anything());
    expect(s.play).toHaveBeenCalledWith('rommel');
    expect(s.shake).toHaveBeenCalledWith(800);
    s.loop(2800);
    expect(s.system.moleState().phase).toBe('rumble');
    s.loop(400);
    const m = s.system.moleState();
    expect(m.phase).toBe('out');
    expect((m.began.out ?? 0) - (m.began.rumble ?? 0)).toBeGreaterThanOrEqual(3000);
    expect(s.say).toHaveBeenCalledWith('Hihi! Waar zijn de dieren?', expect.anything());
    expect(s.syncActors).toHaveBeenLastCalledWith('monsters', [expect.objectContaining({ id: 'mole-1', model: 'mole' })]);
  });
  it('AC245: no second mole with a rumble or a mole out, and a new rumble after he left', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.system.onMined(cx, 2, cz, 3);
    expect(s.shake).toHaveBeenCalledTimes(1);
    s.loop(3200);
    s.system.onMined(cx, 2, cz, 3);
    expect(s.shake).toHaveBeenCalledTimes(1);
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    s.loop(1600);
    expect(s.system.moleState().phase).toBe('none');
    s.system.applySwitches({ knights: true, bubble: false, mole: true });
    s.system.onMined(cx, 2, cz, 3);
    expect(s.system.moleState().phase).toBe('rumble');
  });
  it('AC245: no rumble with a bubble or Klodder out', () => {
    const s = moleSetup();
    expect(s.system.spawnBubble()).toBe(true);
    s.system.onMined(cx, 3, cz, 3);
    expect(s.system.moleState().phase).toBe('none');
    const k = moleSetup();
    expect(k.system.spawnKlodder()).toBe(true);
    k.system.onMined(cx, 3, cz, 3);
    expect(k.system.moleState().phase).toBe('none');
  });
  it('AC297: a bubble is refused during the rumble, and the mole comes as always', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    expect(s.system.spawnBubble()).toBe(false);
    s.loop(3200);
    expect(s.system.moleState().phase).toBe('out');
    expect(s.system.state().phase).toBe('idle');
  });
  it('AC246: no spot that fits gives "Hmm... toch maar niet." and no mole', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    for (let x = cx - 40; x <= cx + 40; x++) {
      for (let z = cz - 40; z <= cz + 40; z++) {
        let y = 79;
        while (y > 0 && s.world.get(x, y, z) === 0) y--;
        s.world.set(x, y + 1, z, 1);
      }
    }
    s.loop(3200);
    expect(s.say).toHaveBeenCalledWith('Hmm... toch maar niet.', expect.anything());
    expect(s.system.moleState().phase).toBe('none');
  });
  it('AC244: with the switch off nothing happens on a dig, not even the toast or the card', () => {
    const s = moleSetup({ mole: false });
    s.system.onMined(cx, 3, cz, 3);
    s.system.onMined(cx, 6, cz, 3);
    s.system.onMined(cx, 5, cz, 42);
    expect(s.say).not.toHaveBeenCalled();
    expect(s.showMoleCard).not.toHaveBeenCalled();
    expect(s.shake).not.toHaveBeenCalled();
    expect(s.system.moleState().phase).toBe('none');
  });
  it('AC244: a dig at y 6 toasts once and a Waarschuwsteen shows the card every time', () => {
    const s = moleSetup();
    s.system.onMined(cx, 6, cz, 3);
    s.system.onMined(cx, 7, cz, 3);
    expect(s.say).toHaveBeenCalledTimes(1);
    s.system.onMined(cx, 5, cz, 42);
    s.system.onMined(cx, 5, cz, 42);
    expect(s.showMoleCard).toHaveBeenCalledTimes(2);
    expect(s.system.moleState().phase).toBe('none');
  });
  it('AC253: the switch going off during a rumble ends it with no mole, and a pause step (dt 0) moves nothing', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.system.step(0);
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    expect(s.system.moleState().phase).toBe('none');
    s.loop(4000);
    expect(s.system.moleState().phase).toBe('none');
  });
  it('AC253: the switch going off with the mole out sinks him within 1500 ms', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.loop(3200);
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    expect(s.system.moleState().phase).toBe('leaving');
    s.loop(1600);
    expect(s.system.moleState().phase).toBe('none');
    expect(s.syncActors).toHaveBeenLastCalledWith('monsters', []);
  });
  it('AC245: a world reset removes the mole and a rumble', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.loop(3200);
    s.system.onWorldReset?.({ x: 0, y: 0, z: 0 });
    expect(s.system.moleState().phase).toBe('none');
  });
  it('AC245: the mole box is occupied so the kid cannot build into him', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.loop(3200);
    const m = s.system.moleState();
    expect(s.system.isOccupied?.([m.x - 0.1, m.y, m.z - 0.1, m.x + 0.1, m.y + 1, m.z + 0.1])).toBe(true);
    expect(s.system.isOccupied?.([m.x + 5, m.y, m.z, m.x + 6, m.y + 1, m.z + 1])).toBe(false);
  });
  it('AC245: a bubble may come while the mole is out', () => {
    const s = moleSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.loop(3200);
    expect(s.system.moleState().phase).toBe('out');
    expect(s.system.spawnBubble()).toBe(true);
    expect(s.system.moleState().phase).toBe('out');
  });
});

describe('mole slot seams (decision 144)', () => {
  function seamSetup() {
    const world = new World();
    const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
    const player = { player: kid, yaw: 0, pose: () => ({ x: kid.x, y: kid.y + 1.6, z: kid.z, yaw: 0, pitch: 0 }) };
    const say = vi.fn();
    const play = vi.fn();
    const animals = [createDino({ kind: 'kip', golden: false, x: kid.x + 10, y: kid.y, z: kid.z }, true)];
    const system = createMonsterSystem({
      world, player, renderer: { syncActors: vi.fn(), blockChanged: vi.fn() },
      knights: { knights: () => [{}] as never, points: () => 0 },
      viewport: () => ({ width: 1024, height: 768 }),
      remainingPlayMs: () => 240_000, say, sound: { play }, rng: createRng(1), animals: () => animals,
    });
    system.applySwitches({ knights: true, bubble: false, mole: true });
    const loop = (ms: number) => { for (let t = 0; t < ms; t += 100) system.step(0.1); };
    return { system, loop, say };
  }
  const cx = Math.floor(START_SPOT.x);
  const cz = Math.floor(START_SPOT.z);
  const up = () => {
    const s = seamSetup();
    s.system.onMined(cx, 3, cz, 3);
    s.loop(3200);
    return s;
  };

  it('moleState keeps its fields and lists no mole before he is up, then one free mole with id 1', () => {
    const s = seamSetup();
    expect(s.system.moleState().moles).toEqual([]);
    s.system.onMined(cx, 3, cz, 3);
    expect(s.system.moleState().moles).toEqual([]);
    s.loop(3200);
    const v = s.system.moleState();
    expect(v.moles).toEqual([{ id: 1, x: v.x, y: v.y, z: v.z, state: 'free', awayMsLeft: 0 }]);
    expect(Object.keys(v)).toEqual(expect.arrayContaining(['phase', 'x', 'y', 'z', 'heading', 'target', 'noPathMs', 'outMs', 'moed', 'pokers', 'loopMs', 'began', 'moles']));
  });

  it('collectTargets adds the free mole once, with kind mole and his id, and no mole while rumbling', () => {
    const s = seamSetup();
    const list = createTargetList();
    s.system.onMined(cx, 3, cz, 3);
    s.system.collectTargets(list);
    expect(list.count).toBe(0);
    s.loop(3200);
    s.system.collectTargets(list);
    const v = s.system.moleState();
    expect(list.count).toBe(1);
    expect(list.items[0]).toEqual({ id: 'mole-1', kind: 'mole', x: v.x, y: v.y, z: v.z });
  });

  it('tapMole is true for a mole that is out and false for an unknown index', () => {
    const s = up();
    expect(s.system.tapMole(0)).toBe(true);
    expect(s.system.tapMole(1)).toBe(false);
    expect(s.system.tapMole(-1)).toBe(false);
  });

  it('a rumble holds the bubble: the clock asks again after 5 s of play time (AC297)', () => {
    const s = seamSetup();
    s.system.applySwitches({ knights: true, bubble: true, mole: true });
    s.system.setBubbleClockMs(599_000);
    s.system.onMined(cx, 3, cz, 3);
    s.system.onPlayElapsed(1000);
    expect(s.system.state().phase).toBe('idle');
    s.loop(3200);
    for (let i = 0; i < 4; i++) s.system.onPlayElapsed(1000);
    expect(s.system.state().phase).toBe('idle');
    s.system.onPlayElapsed(1000);
    expect(s.system.state().phase).toBe('bubble');
  });

  it('sendMoleAway sinks the free mole, takes him out of the world, counts his away time on loop time and then lets him go', () => {
    const s = up();
    const list = createTargetList();
    const box = (m: { x: number; y: number; z: number }): Box => [m.x - 0.1, m.y, m.z - 0.1, m.x + 0.1, m.y + 1, m.z + 0.1];
    const before = s.system.moleState();
    expect(s.system.isOccupied?.(box(before))).toBe(true);
    expect(s.system.sendMoleAway(3000)).toBe(true);
    expect(s.system.moleState().phase).toBe('leaving');
    s.loop(1600);
    const away = s.system.moleState();
    expect(away.phase).toBe('away');
    expect(away.moles).toEqual([{ id: 1, x: before.x, y: expect.any(Number), z: before.z, state: 'away', awayMsLeft: expect.any(Number) }]);
    // The away time counts from the moment he is under the ground (after the 1500 ms sink).
    expect(away.moles[0]?.awayMsLeft).toBeGreaterThan(2000);
    expect(away.moles[0]?.awayMsLeft).toBeLessThanOrEqual(3000);
    expect(s.system.isOccupied?.(box(before))).toBe(false);
    s.system.collectTargets(list);
    expect(list.count).toBe(0);
    expect(s.system.sendMoleAway(1)).toBe(false);
    // The away time stands still while the loop stops (dt 0 steps), and runs on loop time.
    for (let i = 0; i < 20; i++) s.system.step(0);
    expect(s.system.moleState().moles[0]?.awayMsLeft).toBe(away.moles[0]?.awayMsLeft);
    s.loop(3000);
    expect(s.system.moleState().phase).toBe('none');
    expect(s.system.moleState().moles).toEqual([]);
  });

  it('sendMoleAway with no time takes 60 to 90 s, seeded; no away mole while none is out', () => {
    const s = seamSetup();
    expect(s.system.sendMoleAway()).toBe(false);
    const t = up();
    expect(t.system.sendMoleAway()).toBe(true);
    t.loop(1600);
    const left = t.system.moleState().moles[0]?.awayMsLeft ?? 0;
    expect(left).toBeGreaterThanOrEqual(59_000);
    expect(left).toBeLessThanOrEqual(90_000);
  });

  it('the switch going off ends an away mole at once, and a world reset too', () => {
    const s = up();
    s.system.sendMoleAway(60_000);
    s.loop(1600);
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    expect(s.system.moleState().moles).toEqual([]);
    const r = up();
    r.system.sendMoleAway(60_000);
    r.loop(1600);
    r.system.onWorldReset?.({ x: 0, y: 0, z: 0 });
    expect(r.system.moleState().phase).toBe('none');
  });

  it('onBlockChanged and load are safe no ops until V22c', () => {
    const s = up();
    const before = JSON.stringify(s.system.moleState());
    s.system.onBlockChanged(cx, cz);
    s.system.load({ knights: [], bubbleClockMs: 0, hintShown: false, moles: [{ x: 5, y: 9, z: 5, state: 'caught' }] });
    expect(JSON.stringify(s.system.moleState())).toBe(before);
  });
});
