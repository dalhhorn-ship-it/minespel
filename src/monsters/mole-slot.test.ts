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
import { LINE_COME_UP, LINE_HELP, LINE_NO_FIT } from './mole-lines';
import { AIR, STEEN } from '../world/blocks';
import type { MonstersRecord } from '../storage/schema';
import type { MoleListEntry } from './monster-types';
import { LINE_ALREADY, LINE_BACK, LINE_CAUGHT, LINE_FREED, LINE_FULL, LINE_SLEEPS_ON } from './mole-slot';

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
    expect(s.say).toHaveBeenCalledWith('Oei... de grond rommelt!', 2500, 'mole');
    expect(s.play).toHaveBeenCalledWith('rommel');
    expect(s.shake).toHaveBeenCalledWith(800);
    s.loop(2800);
    expect(s.system.moleState().phase).toBe('rumble');
    s.loop(400);
    const m = s.system.moleState();
    expect(m.phase).toBe('out');
    expect((m.began.out ?? 0) - (m.began.rumble ?? 0)).toBeGreaterThanOrEqual(3000);
    expect(s.say).toHaveBeenCalledWith(LINE_COME_UP, expect.anything(), 'mole');
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
    expect(s.say).toHaveBeenCalledWith(LINE_NO_FIT, expect.anything(), 'mole');
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
    // He comes back (AC330): he is never removed.
    s.loop(3000);
    expect(s.system.moleState().phase).toBe('out');
    expect(s.system.moleState().moles).toHaveLength(1);
    expect(s.system.moleState().moles[0]?.state).toBe('free');
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
});

// ---- V22c: the pen, the next mole rule, away and back, the tap cards and the save ----
describe('mole slot V22c (decision 144)', () => {
  function setup(opts: { animals?: ReturnType<typeof createDino>[]; seed?: number; knights?: unknown[] } = {}) {
    const world = new World();
    const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
    const player = { player: kid, yaw: 0, pose: () => ({ x: kid.x, y: kid.y + 1.6, z: kid.z, yaw: 0, pitch: 0 }) };
    const say = vi.fn();
    const play = vi.fn();
    const shake = vi.fn();
    const showMoleTapCard = vi.fn();
    const animals = opts.animals ?? [createDino({ kind: 'kip', golden: false, x: kid.x + 10, y: kid.y, z: kid.z }, true)];
    let record: MonstersRecord = { knights: [], bubbleClockMs: 0, hintShown: false };
    const writes: MonstersRecord[] = [];
    const system = createMonsterSystem({
      world, player, renderer: { syncActors: vi.fn(), blockChanged: vi.fn() },
      knights: { knights: () => (opts.knights ?? []) as never, points: () => 0 },
      viewport: () => ({ width: 1024, height: 768 }),
      remainingPlayMs: () => 240_000, say, shake, sound: { play }, rng: createRng(opts.seed ?? 1), animals: () => animals,
      showMoleTapCard,
      persist: (change) => {
        record = change(record);
        writes.push(record);
      },
    });
    system.applySwitches({ knights: true, bubble: false, mole: true });
    const loop = (ms: number) => { for (let t = 0; t < ms; t += 100) system.step(0.1); };
    const cx = Math.floor(START_SPOT.x);
    const cz = Math.floor(START_SPOT.z);
    const up = () => {
      system.onMined(cx, 3, cz, 3);
      loop(3200);
    };
    const mole = () => system.moleState().moles[0] as MoleListEntry;
    /** Flat ground round the mole, so a pen of walls 2 high is a clean test. */
    const flatten = (mx: number, my: number, mz: number) => {
      for (let x = mx - 8; x <= mx + 8; x++) {
        for (let z = mz - 8; z <= mz + 8; z++) {
          world.set(x, my - 1, z, STEEN);
          for (let y = my; y < my + 6; y++) world.set(x, y, z, AIR);
        }
      }
    };
    /** A ring of walls 2 high with `r` blocks inside each way from the cell (mx, mz). */
    const pen = (mx: number, my: number, mz: number, r: number, open?: { x: number; z: number }) => {
      for (let x = mx - r - 1; x <= mx + r + 1; x++) {
        for (let z = mz - r - 1; z <= mz + r + 1; z++) {
          if (Math.max(Math.abs(x - mx), Math.abs(z - mz)) !== r + 1) continue;
          if (open && open.x === x && open.z === z) continue;
          world.set(x, my, z, STEEN);
          world.set(x, my + 1, z, STEEN);
          system.onBlockChanged(x, z);
        }
      }
    };
    return { system, world, say, play, shake, showMoleTapCard, loop, cx, cz, up, mole, flatten, pen, animals, get record() { return record; }, writes };
  }

  /** A mole up, his ground flat, and a pen around him (3 x 3 inside by default). */
  function caught(s: ReturnType<typeof setup>, r = 1) {
    s.up();
    // The animals stay out of the way of the test: he stands still in the pen anyway.
    const m = s.mole();
    const mx = Math.floor(m.x);
    const mz = Math.floor(m.z);
    const my = Math.round(m.y);
    s.flatten(mx, my, mz);
    s.pen(mx, my, mz, r);
    s.loop(3000);
    return { mx, my, mz };
  }

  it('AC296: a closed wall 2 high round him gives gevangen within 3 s, the line, the sleep pose and the labels', () => {
    const s = setup();
    caught(s);
    expect(s.mole().state).toBe('caught');
    expect(s.say).toHaveBeenCalledWith(LINE_CAUGHT, expect.anything(), 'mole');
    const views = s.system.collectTargets;
    expect(views).toBeDefined();
    const list = createTargetList();
    s.system.collectTargets(list);
    expect(list.items[0]?.kind).toBe('mole-caught');
  });

  it('AC296: a pen with 6 x 6 inside holds him too, a wall 1 high never does', () => {
    const six = setup();
    six.up();
    const m = six.mole();
    six.flatten(Math.floor(m.x), Math.round(m.y), Math.floor(m.z));
    const mx = Math.floor(m.x);
    const mz = Math.floor(m.z);
    // Inside x from mx to mx + 5 and z from mz to mz + 5, with him in the corner cell.
    for (let x = mx - 1; x <= mx + 6; x++) {
      for (let z = mz - 1; z <= mz + 6; z++) {
        if (x >= mx && x <= mx + 5 && z >= mz && z <= mz + 5) continue;
        six.world.set(x, Math.round(m.y), z, STEEN);
        six.world.set(x, Math.round(m.y) + 1, z, STEEN);
      }
    }
    six.loop(3000);
    // He walks inside the pen, still caught only when he stayed in; he never leaves a closed pen.
    expect(six.mole().state).toBe('caught');
    const low = setup();
    low.up();
    const l = low.mole();
    low.flatten(Math.floor(l.x), Math.round(l.y), Math.floor(l.z));
    for (let x = Math.floor(l.x) - 2; x <= Math.floor(l.x) + 2; x++) {
      for (let z = Math.floor(l.z) - 2; z <= Math.floor(l.z) + 2; z++) {
        if (Math.max(Math.abs(x - Math.floor(l.x)), Math.abs(z - Math.floor(l.z))) === 2) low.world.set(x, Math.round(l.y), z, STEEN);
      }
    }
    low.loop(10_000);
    expect(low.mole().state).toBe('free');
  });

  it('AC296: a caught mole stays and teases nobody for 10 minutes; one wall block mined frees him within 3 s', () => {
    const s = setup();
    const { mx, my, mz } = caught(s);
    const at = { x: s.mole().x, z: s.mole().z };
    s.say.mockClear();
    s.loop(10 * 60_000);
    expect(s.mole().state).toBe('caught');
    expect({ x: s.mole().x, z: s.mole().z }).toEqual(at);
    expect(s.say).not.toHaveBeenCalledWith('Boe!', expect.anything());
    // Open the wall on one side (both blocks).
    s.world.set(mx + 2, my, mz, AIR);
    s.world.set(mx + 2, my + 1, mz, AIR);
    s.system.onBlockChanged(mx + 2, mz);
    s.loop(3000);
    expect(s.mole().state).toBe('free');
    expect(s.say).toHaveBeenCalledWith(LINE_FREED, expect.anything(), 'mole');
  });

  it('AC296: a block change near the pen is seen at once (the next step), not after 2 s', () => {
    const s = setup();
    const { mx, my, mz } = caught(s);
    s.world.set(mx + 2, my, mz, AIR);
    s.world.set(mx + 2, my + 1, mz, AIR);
    s.system.onBlockChanged(mx + 2, mz);
    s.loop(200);
    expect(s.mole().state).toBe('free');
  });

  it('AC297: with a free mole no rumble starts and "Er loopt al een Monstermol rond." shows at most once per 10 s', () => {
    const s = setup();
    s.up();
    s.shake.mockClear();
    s.say.mockClear();
    s.system.onMined(s.cx, 2, s.cz, 3);
    s.system.onMined(s.cx, 2, s.cz + 1, 3);
    expect(s.shake).not.toHaveBeenCalled();
    expect(s.say.mock.calls.filter((c) => c[0] === LINE_ALREADY)).toHaveLength(1);
    s.loop(10_100);
    s.system.onMined(s.cx, 2, s.cz, 3);
    expect(s.say.mock.calls.filter((c) => c[0] === LINE_ALREADY)).toHaveLength(2);
  });

  it('AC297: 1 caught mole and no free one: a rumble and a new mole come; the list never holds more than 4 or 2 free', () => {
    const s = setup();
    caught(s);
    s.system.onMined(s.cx, 3, s.cz, 3);
    expect(s.system.moleState().began.rumble).not.toBeNull();
    s.loop(3200);
    const moles = s.system.moleState().moles;
    expect(moles.map((m) => m.state)).toEqual(['caught', 'free']);
    expect(moles.map((m) => m.id)).toEqual([1, 2]);
  });

  it('AC297: 3 caught moles: digging brings none and "Er slapen al 3 Monstermollen. Meer passen er niet." shows, at most once per 10 s', () => {
    const s = setup();
    const three = [1, 2, 3].map((n) => ({ x: 5.5 + n * 3, y: 20, z: 5.5, state: 'caught' as const }));
    s.system.load({ knights: [], bubbleClockMs: 0, hintShown: false, moles: three });
    s.system.onMined(s.cx, 3, s.cz, 3);
    s.system.onMined(s.cx, 2, s.cz, 3);
    expect(s.shake).not.toHaveBeenCalled();
    expect(s.say.mock.calls.filter((c) => c[0] === LINE_FULL)).toHaveLength(1);
    expect(s.system.moleState().moles).toHaveLength(3);
  });

  it('AC297: a bubble or Klodder out: "De Monstermol slaapt nog even door." and no mole', () => {
    const s = setup();
    expect(s.system.spawnBubble()).toBe(true);
    s.system.onMined(s.cx, 3, s.cz, 3);
    expect(s.say).toHaveBeenCalledWith(LINE_SLEEPS_ON, expect.anything(), 'mole');
    expect(s.system.moleState().phase).toBe('none');
  });

  it('AC298: tapMole on a caught mole shows the tap card and nothing else; on a free one the help line at most once per 5 s', () => {
    const c = setup();
    caught(c);
    expect(c.system.tapMole(0)).toBe(true);
    expect(c.showMoleTapCard).toHaveBeenCalledWith({ id: 1, caught: true });
    const f = setup();
    f.up();
    f.say.mockClear();
    expect(f.system.tapMole(0)).toBe(true);
    expect(f.system.tapMole(0)).toBe(true);
    expect(f.say.mock.calls.filter((x) => x[0] === LINE_HELP)).toHaveLength(1);
    f.loop(5100);
    f.system.tapMole(0);
    expect(f.say.mock.calls.filter((x) => x[0] === LINE_HELP)).toHaveLength(2);
    expect(f.showMoleTapCard).not.toHaveBeenCalled();
  });

  it('AC330: 20 seeded chase offs give 60 to 90 s away; he comes back with a rumble, a spot within 16 of the animal and the two lines', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const s = setup({ seed });
      s.up();
      const animal = s.animals[0] as ReturnType<typeof createDino>;
      expect(JSON.stringify(s.system.moleState().moles), `seed ${seed}`).toContain('free');
      expect(s.system.sendMoleAway()).toBe(true);
      s.loop(1600);
      const left = s.mole().awayMsLeft;
      expect(left + 100).toBeGreaterThanOrEqual(60_000);
      expect(left + 100).toBeLessThanOrEqual(90_000);
      seen.add(Math.round((left + 100) / 1000));
      // A pause of 30 s changes nothing.
      for (let i = 0; i < 300; i++) s.system.step(0);
      expect(s.mole().awayMsLeft).toBe(left);
      s.say.mockClear();
      s.play.mockClear();
      s.loop(left + 500);
      expect(s.system.moleState().phase).toBe('out');
      expect(s.mole().state).toBe('free');
      expect(s.play).toHaveBeenCalledWith('rommel');
      const texts = s.say.mock.calls.map((c) => c[0]);
      expect(texts).toContain(LINE_BACK);
      expect(Math.max(Math.abs(s.mole().x - animal.x), Math.abs(s.mole().z - animal.z))).toBeLessThanOrEqual(16.5);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('AC330: with no target animal he comes back 4 to 6 blocks from where he dove under', () => {
    const s = setup({ animals: [] });
    s.up();
    const before = s.mole();
    s.system.sendMoleAway(2000);
    s.loop(1600);
    const dove = s.mole();
    s.loop(2200);
    expect(s.mole().state).toBe('free');
    const d = Math.max(Math.abs(Math.floor(s.mole().x) - Math.floor(dove.x)), Math.abs(Math.floor(s.mole().z) - Math.floor(dove.z)));
    expect(d).toBeGreaterThanOrEqual(4);
    expect(d).toBeLessThanOrEqual(6);
    expect(before.id).toBe(s.mole().id);
  });

  it('AC330: when no spot fits he stays away and comes up within 5 s (plus or minus 1) after a spot fits', () => {
    const s = setup();
    s.up();
    s.system.sendMoleAway(2000);
    s.loop(1600);
    const placed: Array<[number, number, number]> = [];
    for (let x = s.cx - 60; x <= s.cx + 60; x++) {
      for (let z = s.cz - 60; z <= s.cz + 60; z++) {
        let y = 79;
        while (y > 0 && s.world.get(x, y, z) === 0) y--;
        s.world.set(x, y + 1, z, 1);
        placed.push([x, y + 1, z]);
      }
    }
    s.loop(12_000);
    expect(s.system.moleState().phase).toBe('away');
    for (const [x, y, z] of placed) s.world.set(x, y, z, 0);
    let waited = 0;
    while (s.system.moleState().phase === 'away' && waited < 12_000) {
      s.loop(100);
      waited += 100;
    }
    expect(s.system.moleState().phase).toBe('out');
    expect(waited).toBeLessThanOrEqual(6000);
  });

  it('AC330: the away time stands still while the loop stops, and he cannot be tapped or collected while away', () => {
    const s = setup();
    s.up();
    s.system.sendMoleAway(60_000);
    s.loop(1600);
    expect(s.system.tapMole(0)).toBe(false);
    const left = s.mole().awayMsLeft;
    for (let i = 0; i < 100; i++) s.system.step(0);
    expect(s.mole().awayMsLeft).toBe(left);
  });

  it('AC299: the moles are saved on every change and loaded again: caught at his spot, a free one, an away one with his time', () => {
    const s = setup();
    caught(s);
    expect(s.record.moles).toEqual([expect.objectContaining({ state: 'caught' })]);
    const t = setup();
    t.up();
    expect(t.record.moles?.map((m) => m.state)).toEqual(['free']);
    t.system.sendMoleAway(40_000);
    t.loop(100);
    expect(t.record.moles?.[0]?.state).toBe('away');
    t.loop(1600);
    t.loop(2000);
    expect(t.record.moles?.[0]?.awayMs).toBeGreaterThan(30_000);
    expect(t.record.moles?.[0]?.awayMs).toBeLessThanOrEqual(40_000);
    const fresh = setup();
    fresh.system.load({ knights: [], bubbleClockMs: 0, hintShown: false, moles: t.record.moles });
    expect(fresh.mole().state).toBe('away');
    expect(fresh.mole().awayMsLeft).toBeLessThanOrEqual(40_000);
    fresh.loop(45_000);
    expect(fresh.mole().state).toBe('free');
  });

  it('AC299: the free mole spot is saved while he walks (about every second), and a rumble is never saved', () => {
    const s = setup();
    s.system.onMined(s.cx, 3, s.cz, 3);
    s.loop(1000);
    expect(s.record.moles ?? []).toEqual([]);
    s.loop(2500);
    const first = s.record.moles?.[0];
    expect(first?.state).toBe('free');
    s.loop(5000);
    const m = s.mole();
    const last = s.record.moles?.[0] as { x: number; z: number };
    expect(Math.hypot(last.x - m.x, last.z - m.z)).toBeLessThanOrEqual(2);
  });

  it('AC300 AC335: the switch off, a world reset and Alles wissen leave no mole saved, also an away one', () => {
    const a = setup();
    caught(a);
    a.system.applySwitches({ knights: true, bubble: false, mole: false });
    expect(a.record.moles).toEqual([]);
    a.loop(2000);
    expect(a.record.moles).toEqual([]);
    expect(a.system.moleState().moles).toEqual([]);
    a.system.applySwitches({ knights: true, bubble: false, mole: true });
    a.loop(2000);
    expect(a.system.moleState().moles).toEqual([]);
    const b = setup();
    b.up();
    b.system.sendMoleAway(50_000);
    b.loop(2000);
    b.system.applySwitches({ knights: true, bubble: false, mole: false });
    expect(b.record.moles).toEqual([]);
    const c = setup();
    caught(c);
    c.system.onWorldReset?.({ x: 0, y: 0, z: 0 });
    expect(c.record.moles).toEqual([]);
    expect(c.system.moleState().moles).toEqual([]);
  });

  it('AC299: a teardown (dispose) never erases the saved moles, an away one and a caught one included', () => {
    const a = setup();
    caught(a);
    a.loop(3000);
    const before = a.record.moles;
    expect(before?.length).toBe(1);
    const writes = a.writes.length;
    a.system.dispose?.();
    expect(a.writes.length).toBe(writes);
    expect(a.record.moles).toEqual(before);
    expect(a.system.moleState().moles).toEqual([]);
    const b = setup();
    b.up();
    b.system.sendMoleAway(50_000);
    b.loop(3000);
    const away = b.record.moles;
    expect(away?.[0]).toMatchObject({ state: 'away' });
    b.system.dispose?.();
    expect(b.record.moles).toEqual(away);
  });

  it('AC299: with the switch off at boot a saved list is dropped and no mole shows', () => {
    const s = setup();
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    s.system.load({ knights: [], bubbleClockMs: 0, hintShown: false, moles: [{ x: 5, y: 9, z: 5, state: 'caught' }] });
    s.system.applySwitches({ knights: true, bubble: false, mole: false });
    expect(s.system.moleState().moles).toEqual([]);
    expect(s.record.moles).toEqual([]);
  });

  it('AC299: a save from 0.12.0 holds no moles and loads none', () => {
    const s = setup();
    s.system.load({ knights: [], bubbleClockMs: 0, hintShown: false });
    expect(s.system.moleState().moles).toEqual([]);
    expect(s.writes).toHaveLength(0);
  });
});
