import { describe, expect, it } from 'vitest';
import { AIR, STEEN } from '../world/blocks';
import { EYE_HEIGHT, MAX_PLAYER_Y, PLAYER_HEIGHT, collides } from '../world/physics';
import { START_SPOT, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { createPlayerController, settlePlayer, stickToWorld } from './player-controller';

const FLOOR = 4;

function flatWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, y <= FLOOR ? STEEN : AIR);
    }
  }
  return w;
}

function setup(world = flatWorld()) {
  const stick = { v: { x: 0, y: 0 } };
  const lookDelta = { dx: 0, dy: 0 };
  const c = createPlayerController({
    world,
    stick: { vector: () => stick.v },
    look: {
      consumeDelta: () => {
        const d = { ...lookDelta };
        lookDelta.dx = 0;
        lookDelta.dy = 0;
        return d;
      },
    },
  });
  c.player.x = 20.5;
  c.player.z = 20.5;
  c.player.y = FLOOR + 1;
  for (let i = 0; i < 10; i++) c.update(1 / 60);
  return { c, stick, lookDelta, world };
}

describe('stickToWorld', () => {
  it('forward with yaw 0 is +z', () => {
    const m = stickToWorld(0, -1, 0);
    expect(m.moveX).toBeCloseTo(0);
    expect(m.moveZ).toBeCloseTo(1);
  });
  it('right with yaw 0 is -x (the camera looks along +z)', () => {
    const m = stickToWorld(1, 0, 0);
    expect(m.moveX).toBeCloseTo(-1);
    expect(m.moveZ).toBeCloseTo(0);
  });
  it('forward turns with the camera', () => {
    const m = stickToWorld(0, -1, Math.PI / 2);
    expect(m.moveX).toBeCloseTo(1);
    expect(m.moveZ).toBeCloseTo(0);
  });
});

describe('player controller', () => {
  it('starts on the start spot', () => {
    const c = createPlayerController({ world: new World(), stick: { vector: () => ({ x: 0, y: 0 }) }, look: { consumeDelta: () => ({ dx: 0, dy: 0 }) } });
    expect(c.player.x).toBe(START_SPOT.x);
    expect(c.pose().y).toBeCloseTo(START_SPOT.y + EYE_HEIGHT);
  });
  it('walks the way the camera looks', () => {
    const s = setup();
    const z0 = s.c.player.z;
    s.stick.v = { x: 0, y: -1 };
    for (let i = 0; i < 60; i++) s.c.update(1 / 60);
    expect(s.c.player.z - z0).toBeGreaterThan(3);
    expect(Math.abs(s.c.player.x - 20.5)).toBeLessThan(0.01);
  });
  it('dragging right turns right, dragging up looks up, pitch is limited', () => {
    const s = setup();
    s.lookDelta.dx = 50;
    s.lookDelta.dy = -50;
    s.c.update(1 / 60);
    expect(s.c.yaw).toBeLessThan(0);
    expect(s.c.pitch).toBeGreaterThan(0);
    s.lookDelta.dy = -100000;
    s.c.update(1 / 60);
    expect(s.c.pitch).toBeLessThanOrEqual(1.4);
  });
  it('one jump request is one frame and lifts the player once', () => {
    const s = setup();
    const y0 = s.c.player.y;
    s.c.jump();
    s.c.update(1 / 60);
    expect(s.c.player.y).toBeGreaterThan(y0);
    // A jump tapped in the air is dropped, not saved for the landing.
    s.c.jump();
    s.c.update(1 / 60);
    for (let i = 0; i < 120; i++) s.c.update(1 / 60);
    expect(s.c.player.y).toBeCloseTo(y0, 1);
    expect(s.c.player.onGround).toBe(true);
  });
  it('a frame too short for a physics step keeps the jump for the next frame', () => {
    const s = setup();
    s.c.player.leftover = 0;
    s.c.jump();
    s.c.update(0.001);
    expect(s.c.player.onGround).toBe(true);
    s.c.update(0.02);
    expect(s.c.player.y).toBeGreaterThan(FLOOR + 1);
  });
  it('jumps up a one block step (AC9)', () => {
    const s = setup();
    for (let x = 19; x <= 21; x++) for (let z = 22; z <= 26; z++) s.world.set(x, FLOOR + 1, z, STEEN);
    s.c.player.z = 21.5;
    s.stick.v = { x: 0, y: -1 };
    s.c.jump();
    for (let i = 0; i < 90; i++) s.c.update(1 / 60);
    expect(s.c.player.y).toBeCloseTo(FLOOR + 2, 1);
  });
  it('reset goes home standing still', () => {
    const s = setup();
    s.c.yaw = 2;
    s.c.reset();
    expect(s.c.player.x).toBe(START_SPOT.x);
    expect(s.c.player.z).toBe(START_SPOT.z);
    expect(s.c.yaw).toBe(0);
  });
});

const DT = 1 / 60;

function run(c: ReturnType<typeof setup>['c'], seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) c.update(DT);
}

describe('flying (G4)', () => {
  it('AC164: holding Omhoog 1 s lifts 3 to 5 blocks and the player stays there', () => {
    const s = setup();
    const y0 = s.c.player.y;
    s.c.setAscending(true);
    run(s.c, 1);
    s.c.setAscending(false);
    const lifted = s.c.player.y - y0;
    expect(lifted).toBeGreaterThanOrEqual(3);
    expect(lifted).toBeLessThanOrEqual(5);
    expect(s.c.isFloating()).toBe(true);
    const y1 = s.c.player.y;
    run(s.c, 5);
    expect(s.c.player.y).toBeCloseTo(y1, 5);
    expect(s.c.isFloating()).toBe(true);
  });

  it('a very short Omhoog tap still floats up a little', () => {
    const s = setup();
    const y0 = s.c.player.y;
    s.c.setAscending(true);
    s.c.setAscending(false);
    run(s.c, 1);
    expect(s.c.player.y).toBeGreaterThan(y0);
    expect(s.c.isFloating()).toBe(true);
  });

  it('Omhoog while falling or jumping starts floating', () => {
    const s = setup();
    s.c.player.y = FLOOR + 10;
    s.c.update(DT);
    s.c.setAscending(true);
    run(s.c, 0.5);
    expect(s.c.isFloating()).toBe(true);
    expect(s.c.player.vy).toBeGreaterThanOrEqual(0);
  });

  it('AC165: the stick moves a floating player at the same height and a wall stops it', () => {
    const s = setup();
    s.c.setAscending(true);
    run(s.c, 1);
    s.c.setAscending(false);
    const y = s.c.player.y;
    for (let yy = 0; yy < 40; yy++) s.world.set(20, yy, 24, STEEN);
    s.stick.v = { x: 0, y: -1 };
    run(s.c, 3);
    expect(s.c.player.y).toBeCloseTo(y, 5);
    expect(s.c.player.z).toBeGreaterThan(21);
    expect(s.c.player.z + 0.3).toBeLessThanOrEqual(24);
    expect(collides(s.world, s.c.player.x, s.c.player.y, s.c.player.z)).toBe(false);
  });

  it('AC165: Omlaag sinks, lands on the first block below, ends floating, and a jump works again', () => {
    const s = setup();
    s.world.set(20, FLOOR + 1, 20, STEEN);
    s.c.player.y = FLOOR + 2;
    s.c.setAscending(true);
    run(s.c, 1);
    s.c.setAscending(false);
    s.c.setDescending(true);
    run(s.c, 3);
    s.c.setDescending(false);
    expect(s.c.player.y).toBeCloseTo(FLOOR + 2, 3);
    expect(s.c.player.onGround).toBe(true);
    expect(s.c.isFloating()).toBe(false);
    s.c.jump();
    run(s.c, 0.1);
    expect(s.c.player.y).toBeGreaterThan(FLOOR + 2.1);
  });

  it('AC166: the head stops under a block', () => {
    const s = setup();
    s.world.set(20, FLOOR + 6, 20, STEEN);
    s.c.setAscending(true);
    run(s.c, 3);
    expect(s.c.player.y + PLAYER_HEIGHT).toBeLessThanOrEqual(FLOOR + 6);
    expect(s.c.player.y + PLAYER_HEIGHT).toBeGreaterThan(FLOOR + 6 - 0.05);
    expect(collides(s.world, s.c.player.x, s.c.player.y, s.c.player.z)).toBe(false);
  });

  it('AC166: near the top the head never goes above layer 64', () => {
    const s = setup();
    s.c.setAscending(true);
    for (let i = 0; i < 60 * 30; i++) {
      s.c.update(DT);
      expect(s.c.player.y + PLAYER_HEIGHT).toBeLessThanOrEqual(WORLD_HEIGHT);
    }
    expect(s.c.player.y).toBeCloseTo(MAX_PLAYER_Y, 3);
    expect(s.c.pose().y).toBeLessThan(WORLD_HEIGHT);
  });

  it('AC166: 1000 random fly and walk steps never end inside a block', () => {
    const s = setup();
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 300; i++) {
      const x = Math.floor(rnd() * 20) + 10, z = Math.floor(rnd() * 20) + 10, y = FLOOR + 1 + Math.floor(rnd() * 12);
      if (x === 20 && z === 20) continue;
      s.world.set(x, y, z, STEEN);
    }
    for (let i = 0; i < 1000; i++) {
      if (i % 25 === 0) {
        s.c.setAscending(rnd() < 0.5);
        s.c.setDescending(rnd() < 0.4);
        s.stick.v = { x: rnd() * 2 - 1, y: rnd() * 2 - 1 };
        s.lookDelta.dx = (rnd() - 0.5) * 400;
        if (rnd() < 0.2) s.c.jump();
      }
      s.c.update(DT);
      const p = s.c.player;
      expect(collides(s.world, p.x, p.y, p.z)).toBe(false);
      expect(p.y + PLAYER_HEIGHT).toBeLessThanOrEqual(WORLD_HEIGHT);
    }
  });

  it('AC167: jump does nothing while floating', () => {
    const s = setup();
    s.c.setAscending(true);
    run(s.c, 1);
    s.c.setAscending(false);
    const y = s.c.player.y;
    s.c.jump();
    run(s.c, 1);
    expect(s.c.player.y).toBeCloseTo(y, 5);
    expect(s.c.isFloating()).toBe(true);
  });

  it('AC167: Omlaag on the ground does nothing, and it does not start floating', () => {
    const s = setup();
    const y = s.c.player.y;
    s.c.setDescending(true);
    run(s.c, 1);
    expect(s.c.player.y).toBeCloseTo(y, 5);
    expect(s.c.isFloating()).toBe(false);
  });

  it('AC167: Omhoog and Omlaag held together do not move up or down', () => {
    const s = setup();
    s.c.setAscending(true);
    run(s.c, 1);
    const y = s.c.player.y;
    s.c.setDescending(true);
    run(s.c, 2);
    expect(s.c.player.y).toBeCloseTo(y, 5);
    expect(s.c.isFloating()).toBe(true);
  });

  it('AC168: mining the block under a floating player keeps floating', () => {
    const s = setup();
    s.c.setAscending(true);
    run(s.c, 0.5);
    s.c.setAscending(false);
    s.world.set(20, FLOOR, 20, AIR);
    const y = s.c.player.y;
    run(s.c, 1);
    expect(s.c.isFloating()).toBe(true);
    expect(s.c.player.y).toBeCloseTo(y, 5);
  });

  it('AC168: nothing is placed above layer 64', () => {
    const w = flatWorld();
    expect(w.set(5, WORLD_HEIGHT, 5, STEEN)).toBe(false);
    expect(w.get(5, WORLD_HEIGHT, 5)).toBe(AIR);
  });

  it('AC169: Ik zit vast while floating: on the ground at the start, not floating', () => {
    const s = setup();
    s.c.setAscending(true);
    run(s.c, 1);
    s.c.setDescending(true);
    s.c.reset();
    expect(s.c.isFloating()).toBe(false);
    const w = new World();
    const c = createPlayerController({ world: w, stick: { vector: () => ({ x: 0, y: 0 }) }, look: { consumeDelta: () => ({ dx: 0, dy: 0 }) } });
    c.setAscending(true);
    for (let i = 0; i < 60; i++) c.update(DT);
    c.reset();
    expect(c.isFloating()).toBe(false);
    expect([c.player.x, c.player.y, c.player.z]).toEqual([START_SPOT.x, START_SPOT.y, START_SPOT.z]);
    c.setAscending(false);
    for (let i = 0; i < 60; i++) c.update(DT);
    expect(c.player.onGround).toBe(true);
    expect(c.player.y).toBeCloseTo(START_SPOT.y, 3);
  });

  it('AC169: start spot built over: reset uses the nearest free standing cell', () => {
    const w = new World();
    const sx = Math.floor(START_SPOT.x), sz = Math.floor(START_SPOT.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = START_SPOT.y - 1; y < START_SPOT.y + 6; y++) w.set(sx + dx, y, sz + dz, STEEN);
    const c = createPlayerController({ world: w, stick: { vector: () => ({ x: 0, y: 0 }) }, look: { consumeDelta: () => ({ dx: 0, dy: 0 }) } });
    c.reset();
    const p = c.player;
    expect(collides(w, p.x, p.y, p.z)).toBe(false);
    expect(collides(w, p.x, p.y - 0.01, p.z)).toBe(true);
    expect(Math.hypot(p.x - START_SPOT.x, p.z - START_SPOT.z)).toBeLessThan(4);
    expect(Math.abs(p.y - START_SPOT.y)).toBeLessThan(8);
  });

  it('settlePlayer clamps into the world and moves a player out of a block onto the ground in that column', () => {
    const w = flatWorld();
    for (let y = FLOOR + 1; y < 30; y++) w.set(10, y, 10, STEEN);
    const p = { x: 10.5, y: 15, z: 10.5, vy: 0, onGround: false, leftover: 0 };
    expect(settlePlayer(w, p)).toBe(true);
    expect(p.y).toBe(30);
    expect(collides(w, p.x, p.y, p.z)).toBe(false);
    const q = { x: -5, y: 500, z: 999, vy: 0, onGround: false, leftover: 0 };
    settlePlayer(w, q);
    expect(q.x).toBe(0.5);
    expect(q.z).toBe(WORLD_SIZE - 0.5);
    expect(q.y).toBeLessThanOrEqual(MAX_PLAYER_Y);
  });
});
