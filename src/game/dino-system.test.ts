import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { dinoCollides } from '../dinos/dino-ai';
import { createDinoStore } from '../dinos/dino-store';
import { EGG_HATCH_SECONDS } from '../dinos/egg';
import { createSaveQueue } from '../storage/save-queue';
import { createRecords } from '../storage/records';
import { openDb } from '../storage/db';
import { AIR, STEEN } from '../world/blocks';
import { placeBlock } from '../world/build';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { createDinoSave, createDinoSystem, type DinoWorldEvent } from './dino-system';

const FLOOR = 4;
const GY = FLOOR + 1;
const player = { x: 20.5, y: GY, z: 20.5 };

function flatWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++)
    for (let z = 0; z < WORLD_SIZE; z++) for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, y <= FLOOR ? STEEN : AIR);
  return w;
}

function setup() {
  const world = flatWorld();
  const store = createDinoStore();
  const events: DinoWorldEvent[] = [];
  const system = createDinoSystem({ world, store, player: () => player, rng: createRng(3), onEvent: (e) => events.push(e) });
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) system.step(1 / 60);
  };
  return { world, store, system, events, run };
}

describe('dino system', () => {
  it('a new game has no dinos and no eggs (AC12)', () => {
    const s = setup();
    s.run(2);
    expect(s.store.dinos).toHaveLength(0);
    expect(s.store.eggs).toHaveLength(0);
  });

  it('an egg lies next to the player and hatches after 5 seconds of play into a Volg mij dino (AC150)', () => {
    const s = setup();
    s.store.addEgg('triceratops');
    s.run(0.1);
    const e = s.store.eggs[0]!.egg;
    const dist = Math.hypot(e.x - player.x, e.z - player.z);
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(3);
    expect(e.y).toBe(GY);
    s.run(EGG_HATCH_SECONDS - 0.5);
    expect(s.store.eggs).toHaveLength(1);
    s.run(1);
    expect(s.store.eggs).toHaveLength(0);
    expect(s.store.dinos).toHaveLength(1);
    expect(s.store.dinos[0]!.state).toMatchObject({ kind: 'triceratops', mode: 'follow' });
    expect(s.events.some((ev) => ev.type === 'puff')).toBe(true);
  });

  it('an egg only grows with steps: no steps (menus, breaks), no hatching (AC150)', () => {
    const s = setup();
    s.store.addEgg('compy');
    s.run(1);
    const before = s.store.eggs[0]!.egg.playSeconds;
    s.system.step(0);
    s.system.step(-1);
    s.system.step(Number.NaN);
    expect(s.store.eggs[0]!.egg.playSeconds).toBe(before);
    s.system.step(5); // a long hiccup counts at most 100 ms
    expect(s.store.eggs[0]!.egg.playSeconds).toBeCloseTo(before + 0.1, 5);
  });

  it('a loaded egg keeps its progress and a loaded dino is placed next to the player', () => {
    const s = setup();
    s.store.load({ eggs: [{ kind: 'compy', x: 5, y: GY, z: 5, playSeconds: 4.5 }], dinos: [{ kind: 'stegosaurus' }] });
    s.run(0.6);
    expect(s.store.eggs).toHaveLength(0);
    expect(s.store.dinos).toHaveLength(2);
    const d = s.store.dinos.find((x) => x.state.kind === 'stegosaurus')!;
    expect(Math.hypot(d.state.x - player.x, d.state.z - player.z)).toBeLessThan(6);
  });

  it('an egg falls when the floor under it is mined, and is never inside a block', () => {
    const s = setup();
    s.store.load({ eggs: [{ kind: 'compy', x: 30.5, y: GY, z: 30.5, playSeconds: 0 }] });
    s.world.set(30, FLOOR, 30, AIR);
    s.run(0.1);
    expect(s.store.eggs[0]!.egg.y).toBe(FLOOR);
    s.world.set(30, FLOOR, 30, STEEN);
    s.world.set(30, FLOOR + 1, 30, STEEN);
    s.run(0.1);
    expect(s.store.eggs[0]!.egg.y).toBeGreaterThanOrEqual(FLOOR + 2);
  });

  it('building is refused where a dino or an egg stands (AC6)', () => {
    const s = setup();
    s.store.load({
      eggs: [{ kind: 'compy', x: 25.5, y: GY, z: 20.5, playSeconds: 0 }],
      dinos: [{ kind: 'triceratops', x: 28.5, y: GY, z: 20.5, growth: 2 }],
    });
    s.run(0.01);
    const d = s.store.dinos[0]!.state;
    const aimAt = (x: number, z: number) => ({ ox: x + 0.5, oy: GY + 3, oz: z + 0.5, dx: 0, dy: -1, dz: 0 });
    const onEgg = placeBlock(s.world, aimAt(25, 20), STEEN, player, s.system.isOccupied);
    expect(onEgg).toMatchObject({ ok: false, reason: 'occupied' });
    const onDino = placeBlock(s.world, aimAt(Math.floor(d.x), Math.floor(d.z)), STEEN, player, s.system.isOccupied);
    expect(onDino).toMatchObject({ ok: false, reason: 'occupied' });
    const free = placeBlock(s.world, aimAt(10, 10), STEEN, player, s.system.isOccupied);
    expect(free.ok).toBe(true);
  });

  it('a tap hits the nearest dino or egg, not a block behind it (AC104)', () => {
    const s = setup();
    s.store.load({ dinos: [{ kind: 'triceratops', x: 20.5, y: GY, z: 24.5, growth: 2 }] });
    s.run(0.01);
    const eye = { ox: 20.5, oy: GY + 1.6, oz: 20.5 };
    // Looking at the dino's body, and the same ray would go on into the floor.
    const aim = { ...eye, dx: 0, dy: -0.4, dz: 1 };
    const hit = s.system.hitTest(aim);
    expect(hit).toMatchObject({ kind: 'dino', id: s.store.dinos[0]!.id });
    // Looking well beside it: nothing.
    expect(s.system.hitTest({ ...eye, dx: 1, dy: -0.4, dz: 1 })).toBeNull();
    // A dino farther than 6 blocks is out of reach.
    s.store.dinos[0]!.state.z = 30.5;
    expect(s.system.hitTest({ ...eye, dx: 0, dy: -0.1, dz: 1 })).toBeNull();
  });

  it('a wall in front of the dino wins the tap', () => {
    const s = setup();
    s.store.load({ dinos: [{ kind: 'triceratops', x: 20.5, y: GY, z: 24.5, growth: 2 }] });
    s.run(0.01);
    s.store.dinos[0]!.state.mode = 'stay';
    for (let y = GY; y < GY + 3; y++) for (let x = 18; x < 23; x++) s.world.set(x, y, 22, STEEN);
    expect(s.system.hitTest({ ox: 20.5, oy: GY + 1, oz: 20.5, dx: 0, dy: 0, dz: 1 })).toBeNull();
  });

  it('an egg can be tapped too', () => {
    const s = setup();
    s.store.load({ eggs: [{ kind: 'compy', x: 20.5, y: GY, z: 23.5, playSeconds: 0 }] });
    s.run(0.01);
    const hit = s.system.hitTest({ ox: 20.5, oy: GY + 1.6, oz: 20.5, dx: 0, dy: -0.35, dz: 1 });
    expect(hit?.kind).toBe('egg');
  });

  it('teleported brings Volg mij dinos next to the player and leaves Blijf hier dinos (AC106)', () => {
    const s = setup();
    s.store.load({
      dinos: [
        { kind: 'compy', x: 40.5, y: GY, z: 40.5, growth: 2, mode: 'follow' },
        { kind: 'compy', x: 10.5, y: GY, z: 10.5, growth: 2, mode: 'stay' },
      ],
    });
    s.run(0.01);
    s.events.length = 0;
    s.system.teleported();
    const [follow, stay] = s.store.dinos;
    expect(Math.hypot(follow!.state.x - player.x, follow!.state.z - player.z)).toBeLessThan(3);
    expect(stay!.state.x).toBeCloseTo(10.5, 0);
    expect(s.events).toHaveLength(1);
    expect(dinoCollides(s.world, follow!.state)).toBe(false);
  });

  it('a dino in a block placed on top of it ends up out of it (AC21)', () => {
    const s = setup();
    s.store.load({ dinos: [{ kind: 'compy', x: 22.5, y: GY, z: 22.5, growth: 2, mode: 'stay' }] });
    s.run(0.01);
    const d = s.store.dinos[0]!.state;
    for (let x = 21; x <= 24; x++) for (let z = 21; z <= 24; z++) for (let y = GY; y < GY + 2; y++) s.world.set(x, y, z, STEEN);
    s.run(1);
    expect(dinoCollides(s.world, d)).toBe(false);
  });

  it('resetting the world and walking does not remove anyone (AC152)', () => {
    const s = setup();
    s.store.load({ dinos: [{ kind: 'compy', x: 22.5, y: GY, z: 22.5 }], eggs: [{ kind: 'compy', x: 20.5, y: GY, z: 22.5 }] });
    s.run(1);
    s.world.reset();
    s.system.teleported();
    s.run(2);
    expect(s.store.dinos.length + s.store.eggs.length).toBe(2);
  });
});

describe('dino save', () => {
  let n = 0;
  it('registers a reader, restores a record and marks dirty on changes', async () => {
    const db = await openDb({ name: `dino-save-${n++}` });
    const queue = createSaveQueue({ db, setTimer: () => 1, clearTimer: () => {} });
    const records = createRecords(db);
    const a = createDinoStore();
    const saveA = createDinoSave({ store: a, queue, records });
    const stop = saveA.start();
    a.addEgg('compy', true);
    expect(queue.pendingCount()).toBe(1);
    await queue.flushNow();
    stop();

    const b = createDinoStore();
    const queueB = createSaveQueue({ db, setTimer: () => 1, clearTimer: () => {} });
    await createDinoSave({ store: b, queue: queueB, records }).restore();
    expect(b.eggs).toHaveLength(1);
    expect(b.eggs[0]!.egg.golden).toBe(true);
  });

  it('a cancelled restore does not touch the store', async () => {
    const db = await openDb({ name: `dino-save-${n++}` });
    const queue = createSaveQueue({ db, setTimer: () => 1, clearTimer: () => {} });
    const store = createDinoStore();
    const save = createDinoSave({ store, queue, records: createRecords(db) });
    save.cancel();
    await save.restore();
    expect(store.dinos).toHaveLength(0);
  });
});
