import { describe, expect, it } from 'vitest';
import { AIR, STEEN } from '../world/blocks';
import { EYE_HEIGHT } from '../world/physics';
import { START_SPOT, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { createPlayerController, stickToWorld } from './player-controller';

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
  it('smoothly eases camera angle with arrow input and allows ascending higher in the sky', () => {
    const s = setup();
    s.c.setLookInput(1, 1);
    s.c.update(1 / 60);
    const firstPitch = s.c.pitch;
    expect(firstPitch).toBeGreaterThan(0);
    s.c.update(1 / 60);
    // Easing accelerates on the second frame
    expect(s.c.pitch - firstPitch).toBeGreaterThan(firstPitch);
    // Releasing look input still glides briefly before stopping
    s.c.setLookInput(0, 0);
    const beforeGlide = s.c.pitch;
    s.c.update(1 / 60);
    expect(s.c.pitch).toBeGreaterThan(beforeGlide);

    // Ascending lifts the player high into the sky (with WORLD_HEIGHT = 64)
    const y0 = s.c.player.y;
    s.c.setAscending(true);
    for (let i = 0; i < 90; i++) s.c.update(1 / 60);
    s.c.setAscending(false);
    expect(s.c.player.y).toBeGreaterThan(y0 + 8);
    expect(WORLD_HEIGHT).toBe(64);
  });
});
