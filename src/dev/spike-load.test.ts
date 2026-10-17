import { describe, expect, it } from 'vitest';
import { World } from '../world/world';
import { WORLD_SIZE } from '../world/terrain';
import { SPIKE_DINO_COUNT, createSpikeDinos, groundY, isSpikeEnabled, stepSpikeDinos } from './spike-load';

describe('spike load', () => {
  const world = new World();
  it('reads ?spike=1', () => {
    expect(isSpikeEnabled('')).toBe(false);
    expect(isSpikeEnabled('?fps=1&spike=1')).toBe(true);
  });
  it('makes 14 dinos of 5 boxes, always the same', () => {
    const a = createSpikeDinos(world);
    expect(a).toHaveLength(SPIKE_DINO_COUNT);
    expect(SPIKE_DINO_COUNT).toBe(14);
    for (const d of a) expect(d.parts).toHaveLength(5);
    expect(createSpikeDinos(world)).toEqual(a);
  });
  it('stands on the ground and stays inside the world while walking', () => {
    const dinos = createSpikeDinos(world);
    for (let i = 0; i < 6000; i++) stepSpikeDinos(world, dinos, 1 / 30);
    for (const d of dinos) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(WORLD_SIZE);
      expect(d.z).toBeGreaterThanOrEqual(0);
      expect(d.z).toBeLessThanOrEqual(WORLD_SIZE);
      expect(d.y).toBe(groundY(world, d.x, d.z));
    }
  });
});
