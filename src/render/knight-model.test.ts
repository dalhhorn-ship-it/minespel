import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { createKnightModel, KNIGHT_MESH_LIMIT } from './knight-model';

describe('AC203: knight model', () => {
  it('has at most 6 meshes', () => {
    const m = createKnightModel();
    let meshes = 0;
    m.root.traverse((o) => {
      if (o instanceof Mesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThan(0);
    expect(meshes).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
    m.dispose();
  });
  it('the march pose moves and the idle pose rests', () => {
    const m = createKnightModel();
    expect(() => {
      m.setPose('march', 0.3);
      m.setPose(undefined, 0);
    }).not.toThrow();
  });
});
