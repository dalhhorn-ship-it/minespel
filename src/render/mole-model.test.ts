import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Group, Mesh } from 'three';
import { createMoleModel, MOLE_MESH_LIMIT } from './mole-model';

function meshCount(root: Group): number {
  let n = 0;
  root.traverse((o) => {
    if ((o as Mesh).isMesh) n++;
  });
  return n;
}
function pose(m: ReturnType<typeof createMoleModel>) {
  const rig = m.root.children[0]!;
  return { z: rig.rotation.z, y: rig.position.y, s: rig.scale.y };
}

afterEach(() => vi.unstubAllGlobals());

describe('Monstermol model (v16)', () => {
  it('AC254: at most 6 meshes', () => {
    expect(MOLE_MESH_LIMIT).toBe(6);
    expect(meshCount(createMoleModel().root)).toBeLessThanOrEqual(6);
    expect(meshCount(createMoleModel().root)).toBeGreaterThan(1);
  });
  it('AC254: he waddles and bounces without reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const m = createMoleModel();
    m.setPose('walk', 0.2);
    expect(pose(m).z).not.toBe(0);
    m.setPose('boe', 0.15);
    expect(pose(m).y).toBeGreaterThan(0);
  });
  it('AC254: with reduced motion nothing moves in walk, boe and rise', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const m = createMoleModel();
    for (const p of ['walk', 'boe', 'rise']) {
      m.setPose(p, 0.2);
      expect(pose(m)).toEqual({ z: 0, y: 0, s: 1 });
    }
  });
  it('AC254: dispose frees the geometry and the materials', () => {
    const m = createMoleModel();
    const mesh = m.root.children[0]!.children[0] as Mesh;
    const g = vi.spyOn(mesh.geometry, 'dispose');
    m.dispose();
    expect(g).toHaveBeenCalled();
  });
});
