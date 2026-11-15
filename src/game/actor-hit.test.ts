import { describe, expect, it } from 'vitest';
import { World } from '../world/world';
import { START_SPOT } from '../world/terrain';
import { aimFromScreen } from './build-controller';
import { pickActor, screenPointOf } from './actor-hit';
import type { Box } from '../world/build';

const pose = { x: 10, y: 20, z: 10, yaw: 0, pitch: 0 };
const boxAt = (x: number, y: number, z: number): Box => [x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3];

describe('pickActor', () => {
  it('AC209: the closest box on the ray wins', () => {
    const aim = aimFromScreen(pose, 1000, 800, 500, 400);
    const id = pickActor(aim, [{ id: 'far', box: boxAt(10, 19, 16) }, { id: 'near', box: boxAt(10, 19, 13) }], 8);
    expect(id).toBe('near');
  });
  it('a box beyond the reach is not hit', () => {
    const aim = aimFromScreen(pose, 1000, 800, 500, 400);
    expect(pickActor(aim, [{ id: 'far', box: boxAt(10, 19, 20) }], 6)).toBeNull();
  });
  it('a box the eye is inside is skipped', () => {
    const aim = aimFromScreen(pose, 1000, 800, 500, 400);
    expect(pickActor(aim, [{ id: 'in', box: boxAt(10, 19, 10) }], 6)).toBeNull();
  });
  it('a box behind a solid block is not hit when the world is given', () => {
    const world = new World();
    const p = { x: START_SPOT.x, y: START_SPOT.y + 1.6, z: START_SPOT.z };
    const aim = { ox: p.x, oy: p.y, oz: p.z, dx: 0, dy: 0, dz: 1 };
    world.set(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z) + 2, 1);
    const behind = { id: 'k', box: boxAt(p.x, p.y - 1, p.z + 4) };
    expect(pickActor(aim, [behind], 8)).toBe('k');
    expect(pickActor(aim, [behind], 8, world)).toBeNull();
  });
});

describe('screenPointOf', () => {
  it('is the reverse of aimFromScreen', () => {
    for (const [yaw, pitch, sx, sy] of [[0, 0, 300, 200], [1.2, -0.4, 800, 600], [-2.5, 0.3, 100, 700]] as const) {
      const p = { ...pose, yaw, pitch };
      const aim = aimFromScreen(p, 1024, 768, sx, sy);
      const len = Math.hypot(aim.dx, aim.dy, aim.dz);
      const point = { x: aim.ox + (aim.dx / len) * 7, y: aim.oy + (aim.dy / len) * 7, z: aim.oz + (aim.dz / len) * 7 };
      const back = screenPointOf(p, 1024, 768, point);
      expect(back?.x).toBeCloseTo(sx, 3);
      expect(back?.y).toBeCloseTo(sy, 3);
    }
  });
  it('a point behind the camera has no screen point', () => {
    expect(screenPointOf(pose, 1024, 768, { x: 10, y: 20, z: 5 })).toBeNull();
  });
});
