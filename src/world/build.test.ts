import { describe, expect, it } from 'vitest';
import { AIR, GRAS, OERSTEEN, STEEN } from './blocks';
import { mineBlock, placeBlock, type Aim, type Box } from './build';
import { EYE_HEIGHT } from './physics';
import { WORLD_HEIGHT, WORLD_SIZE } from './terrain';
import { World } from './world';

const FLOOR = 4; // top of the floor is y = 5

function flatWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, y <= FLOOR ? STEEN : AIR);
    }
  }
  return w;
}

const down = (x: number, y: number, z: number): Aim => ({ ox: x, oy: y, oz: z, dx: 0, dy: -1, dz: 0 });
const east = (x: number, y: number, z: number): Aim => ({ ox: x, oy: y, oz: z, dx: 1, dy: 0, dz: 0 });
const player = { x: 20.5, y: 5, z: 20.5 };
const eye = (p: { x: number; y: number; z: number }) => p.y + EYE_HEIGHT;

describe('mineBlock', () => {
  it('AC3: removes a minable block within reach', () => {
    const w = flatWorld();
    w.set(30, 5, 20, GRAS);
    const r = mineBlock(w, east(25, 5.5, 20.5));
    expect(r).toEqual({ ok: true, x: 30, y: 5, z: 20, block: GRAS });
    expect(w.get(30, 5, 20)).toBe(AIR);
  });

  it('AC4: nothing changes beyond 6 blocks', () => {
    const w = flatWorld();
    w.set(30, 5, 20, GRAS);
    const r = mineBlock(w, east(23, 5.5, 20.5));
    expect(r.ok).toBe(false);
    expect(w.get(30, 5, 20)).toBe(GRAS);
  });

  it('AC4: oersteen is never mined', () => {
    const w = flatWorld();
    w.set(22, 5, 20, OERSTEEN);
    const r = mineBlock(w, east(20, 5.5, 20.5));
    expect(r).toEqual({ ok: false, reason: 'unminable' });
    expect(w.get(22, 5, 20)).toBe(OERSTEEN);
  });

  it('does nothing when aiming at open sky', () => {
    const w = flatWorld();
    expect(mineBlock(w, { ox: 20, oy: 10, oz: 20, dx: 0, dy: 1, dz: 0 }).ok).toBe(false);
  });
});

describe('placeBlock', () => {
  it('AC5: places the chosen block against the tapped face', () => {
    const w = flatWorld();
    const r = placeBlock(w, down(25.5, 8, 25.5), GRAS, player);
    expect(r).toEqual({ ok: true, x: 25, y: 5, z: 25, block: GRAS });
    expect(w.get(25, 5, 25)).toBe(GRAS);
  });

  it('AC5: no limit, same block can be placed again and again', () => {
    const w = flatWorld();
    for (let i = 0; i < 3; i++) expect(placeBlock(w, down(25.5, 8, 25.5), STEEN, player).ok).toBe(true);
    expect(w.get(25, 7, 25)).toBe(STEEN);
  });

  it('AC5: refuses beyond reach', () => {
    const w = flatWorld();
    const r = placeBlock(w, down(25.5, 12, 25.5), GRAS, player);
    expect(r.ok).toBe(false);
    expect(w.get(25, 5, 25)).toBe(AIR);
  });

  it('never places oersteen or air', () => {
    const w = flatWorld();
    expect(placeBlock(w, down(25.5, 8, 25.5), OERSTEEN, player)).toEqual({ ok: false, reason: 'unplaceable' });
    expect(placeBlock(w, down(25.5, 8, 25.5), AIR, player).ok).toBe(false);
    expect(w.get(25, 5, 25)).toBe(AIR);
  });

  it('AC6: refuses a block that would overlap the player', () => {
    const w = flatWorld();
    // Player stands at x 20.5; tap the side of a wall so the new cell is inside the player's body.
    w.set(19, 5, 20, STEEN);
    const r = placeBlock(w, { ox: 24, oy: 5.5, oz: 20.5, dx: -1, dy: 0, dz: 0 }, GRAS, player);
    expect(r).toEqual({ ok: false, reason: 'player' });
    expect(w.get(20, 5, 20)).toBe(AIR);
  });

  it('AC6: refuses a block that would overlap a dino or egg', () => {
    const w = flatWorld();
    let seen: Box | undefined;
    const r = placeBlock(w, down(25.5, 8, 25.5), GRAS, player, (b) => { seen = b; return true; });
    expect(r).toEqual({ ok: false, reason: 'occupied' });
    expect(seen).toEqual([25, 5, 25, 26, 6, 26]);
    expect(w.get(25, 5, 25)).toBe(AIR);
  });

  it('AC6: allows a block right next to the player', () => {
    const w = flatWorld();
    // Player body spans x 20.2 to 20.8, so cell x 21 only touches.
    const r = placeBlock(w, down(21.5, 8, 20.5), GRAS, player);
    expect(r.ok).toBe(true);
  });

  it('AC103: tapping the top of the block under the player lifts the player', () => {
    const w = flatWorld();
    const r = placeBlock(w, down(20.4, eye(player), 20.4), GRAS, player);
    expect(r).toEqual({ ok: true, x: 20, y: 5, z: 20, block: GRAS, liftPlayerTo: 6 });
    expect(w.get(20, 5, 20)).toBe(GRAS);
  });

  it('AC103: building up twice stacks two blocks', () => {
    const w = flatWorld();
    const p = { ...player };
    const a = placeBlock(w, down(20.5, eye(p), 20.5), GRAS, p);
    if (a.ok && a.liftPlayerTo !== undefined) p.y = a.liftPlayerTo;
    const b = placeBlock(w, down(20.5, eye(p), 20.5), GRAS, p);
    expect(b).toMatchObject({ ok: true, y: 6, liftPlayerTo: 7 });
  });

  it('AC103: no room above the head means nothing is placed', () => {
    const w = flatWorld();
    w.set(20, 7, 20, STEEN); // ceiling: new feet at y 6, head reaches 7.8
    const r = placeBlock(w, down(20.5, 6.5, 20.5), GRAS, player);
    expect(r).toEqual({ ok: false, reason: 'no-room' });
    expect(w.get(20, 5, 20)).toBe(AIR);
  });

  it('AC103: a dino above the head also blocks building up', () => {
    const w = flatWorld();
    const r = placeBlock(w, down(20.5, eye(player), 20.5), GRAS, player, (b) => b[1] >= 6);
    expect(r).toMatchObject({ ok: false, reason: 'no-room' });
    expect(w.get(20, 5, 20)).toBe(AIR);
  });

  it('AC105: two taps on the same cell place one block', () => {
    const w = flatWorld();
    const first = placeBlock(w, down(25.5, 8, 25.5), GRAS, player);
    const second = placeBlock(w, down(25.5, 8, 25.5), STEEN, player);
    expect(first.ok).toBe(true);
    // The second ray now hits the new block, so it builds on top of it, never in the same cell.
    expect(second).toMatchObject({ ok: true, y: 6 });
    expect(w.get(25, 5, 25)).toBe(GRAS);
  });

  it('AC105: two taps on different faces place two blocks', () => {
    const w = flatWorld();
    const a = placeBlock(w, down(25.5, 8, 25.5), GRAS, player);
    const b = placeBlock(w, down(28.5, 8, 25.5), GRAS, player);
    expect(a.ok && b.ok).toBe(true);
    expect(w.get(25, 5, 25)).toBe(GRAS);
    expect(w.get(28, 5, 25)).toBe(GRAS);
  });

  it('does not place outside the world', () => {
    const w = flatWorld();
    const r = placeBlock(w, { ox: 5, oy: 5.5, oz: 0.5, dx: -1, dy: 0, dz: 0 }, GRAS, player);
    expect(r.ok).toBe(false);
  });
});
