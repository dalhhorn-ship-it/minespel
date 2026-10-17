import { describe, expect, it } from 'vitest';
import { AIR, STEEN } from './blocks';
import { REACH, raycast } from './raycast';
import { WORLD_HEIGHT, WORLD_SIZE } from './terrain';
import { World } from './world';

function emptyWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, AIR);
    }
  }
  return w;
}

describe('raycast', () => {
  it('hits a block and reports the face (each axis, both ways)', () => {
    const w = emptyWorld();
    w.set(10, 10, 10, STEEN);
    const cases: [number[], number[], number[]][] = [
      [[7.5, 10.5, 10.5], [1, 0, 0], [-1, 0, 0]],
      [[13.5, 10.5, 10.5], [-1, 0, 0], [1, 0, 0]],
      [[10.5, 7.5, 10.5], [0, 1, 0], [0, -1, 0]],
      [[10.5, 13.5, 10.5], [0, -1, 0], [0, 1, 0]],
      [[10.5, 10.5, 7.5], [0, 0, 1], [0, 0, -1]],
      [[10.5, 10.5, 13.5], [0, 0, -1], [0, 0, 1]],
    ];
    for (const [o, d, n] of cases) {
      const hit = raycast(w, o[0]!, o[1]!, o[2]!, d[0]!, d[1]!, d[2]!);
      expect(hit).toMatchObject({ x: 10, y: 10, z: 10, nx: n[0], ny: n[1], nz: n[2] });
      expect(hit?.distance).toBeCloseTo(2.5, 6);
    }
  });

  it('reach is 6: a block 6.1 away is missed, 5.9 away is found', () => {
    const w = emptyWorld();
    expect(REACH).toBe(6);
    w.set(20, 10, 10, STEEN);
    expect(raycast(w, 13.9, 10.5, 10.5, 1, 0, 0)).toBeNull(); // face at 6.1
    expect(raycast(w, 14.1, 10.5, 10.5, 1, 0, 0)?.x).toBe(20); // face at 5.9
  });

  it('works on a diagonal ray and with a non normalised direction', () => {
    const w = emptyWorld();
    w.set(13, 13, 13, STEEN);
    const hit = raycast(w, 10.5, 10.5, 10.5, 5, 5, 5);
    expect(hit).toMatchObject({ x: 13, y: 13, z: 13 });
    expect(hit && Math.abs(hit.nx) + Math.abs(hit.ny) + Math.abs(hit.nz)).toBe(1);
  });

  it('hits the nearer of two blocks', () => {
    const w = emptyWorld();
    w.set(12, 10, 10, STEEN);
    w.set(14, 10, 10, STEEN);
    expect(raycast(w, 10.5, 10.5, 10.5, 1, 0, 0)?.x).toBe(12);
  });

  it('can start outside the world and ray into the edge block', () => {
    const w = emptyWorld();
    w.set(0, 10, 10, STEEN);
    const hit = raycast(w, -2.5, 10.5, 10.5, 1, 0, 0);
    expect(hit).toMatchObject({ x: 0, nx: -1 });
  });

  it('zero or bad direction gives nothing', () => {
    const w = emptyWorld();
    expect(raycast(w, 10.5, 10.5, 10.5, 0, 0, 0)).toBeNull();
    expect(raycast(w, 10.5, 10.5, 10.5, NaN, 0, 0)).toBeNull();
  });

  it('inside a solid block reports that block with no face', () => {
    const w = emptyWorld();
    w.set(10, 10, 10, STEEN);
    expect(raycast(w, 10.5, 10.5, 10.5, 1, 0, 0)).toMatchObject({ x: 10, nx: 0, ny: 0, nz: 0, distance: 0 });
  });
});
