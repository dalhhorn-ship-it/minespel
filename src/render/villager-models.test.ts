import { Box3, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { VILLAGER_LOOKS } from '../villagers/villager';
import { createVillagerModel, disposeVillagerModels } from './villager-models';

const meshes = (m: ReturnType<typeof createVillagerModel>): Mesh[] => {
  const out: Mesh[] = [];
  m.root.traverse((o) => { if (o instanceof Mesh) out.push(o); });
  return out;
};
const colorOf = (m: Mesh): number => (m.material as MeshBasicMaterial).color.getHex();

describe('villager models (V11c)', () => {
  it('AC180: each look builds with 7 meshes or fewer and fits the villager box in height', () => {
    for (const look of VILLAGER_LOOKS) {
      const model = createVillagerModel(look);
      const list = meshes(model);
      expect(list.length).toBeLessThanOrEqual(7);
      model.root.updateMatrixWorld(true);
      const box = new Box3().setFromObject(model.root);
      const bottom = box.min.y;
      const top = box.max.y;
      expect(bottom).toBeCloseTo(0, 5);
      expect(top).toBeLessThan(2.1);
    }
  });

  it('AC180: the 8 looks can be told apart: shirt colour and hat or hair differ', () => {
    const shirts = new Set<number>();
    const hats = new Set<string>();
    for (const look of VILLAGER_LOOKS) {
      const model = createVillagerModel(look);
      expect(meshes(model).some((m) => colorOf(m) === look.shirt)).toBe(true);
      shirts.add(look.shirt);
      hats.add(model.root.userData.style as string);
    }
    expect(shirts.size).toBe(8);
    expect(hats.size).toBeGreaterThanOrEqual(7);
  });

  it('shares geometries and materials between villagers and frees them', () => {
    const a = createVillagerModel(VILLAGER_LOOKS[0]!);
    const b = createVillagerModel(VILLAGER_LOOKS[0]!);
    expect(meshes(a)[0]?.geometry).toBe(meshes(b)[0]?.geometry);
    expect(meshes(a)[0]?.material).toBe(meshes(b)[0]?.material);
    disposeVillagerModels();
    const c = createVillagerModel(VILLAGER_LOOKS[0]!);
    expect(meshes(c)[0]?.geometry).not.toBe(meshes(a)[0]?.geometry);
  });

  it('has two arms to wave', () => {
    const m = createVillagerModel(VILLAGER_LOOKS[3]!);
    expect(m.armLeft.position.x).toBeLessThan(0);
    expect(m.armRight.position.x).toBeGreaterThan(0);
  });
});
