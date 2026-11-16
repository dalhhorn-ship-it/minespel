import { describe, expect, it } from 'vitest';
import type { Mesh } from 'three';
import { createMoleModel, MOLE_MESH_LIMIT } from './mole-model';

function meshes(model: ReturnType<typeof createMoleModel>): Mesh[] {
  const out: Mesh[] = [];
  model.root.traverse((o) => {
    if ((o as Mesh).isMesh) out.push(o as Mesh);
  });
  return out;
}

describe('mole model (v22, AC296)', () => {
  it('keeps to the mesh cap', () => {
    expect(meshes(createMoleModel()).length).toBeLessThanOrEqual(MOLE_MESH_LIMIT);
  });

  it('AC296: the sleep pose shuts his eyes (the lenses become a thin line) and walking opens them again', () => {
    const model = createMoleModel();
    const lens = meshes(model).find((m) => m.position.z > 0.43 && m.position.y > 0.6) as Mesh;
    model.setPose('walk', 0);
    expect(lens.scale.y).toBe(1);
    model.setPose('sleep', 0);
    expect(lens.scale.y).toBeLessThan(0.3);
    model.setPose('walk', 1);
    expect(lens.scale.y).toBe(1);
    model.dispose();
  });
});
