import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial } from 'three';
import { DINO_KIND_IDS, DINO_KINDS } from '../dinos/kinds';
import {
  BABY_SCALE,
  GOLD_COLOR,
  createDinoModel,
  createEggModel,
  dinoHeight,
  dinoScale,
  setDinoBaby,
} from './dino-models';

function meshes(g: ReturnType<typeof createDinoModel>): Mesh[] {
  return g.children.filter((c): c is Mesh => c instanceof Mesh);
}
const colorOf = (m: Mesh): number => (m.material as MeshBasicMaterial).color.getHex();

describe('dino models', () => {
  for (const kind of DINO_KIND_IDS) {
    it(`${kind} builds with about 5 to 7 meshes and fits its box`, () => {
      const g = createDinoModel(kind);
      const n = meshes(g).length;
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(7);
      const size = DINO_KINDS[kind].size;
      let minY = Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      for (const m of meshes(g)) {
        m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox!;
        minY = Math.min(minY, b.min.y);
        maxY = Math.max(maxY, b.max.y);
        maxZ = Math.max(maxZ, b.max.z);
      }
      expect(minY).toBeCloseTo(0, 5);
      expect(maxY).toBeLessThanOrEqual(size.h + 0.05);
      expect(maxZ).toBeLessThanOrEqual(size.l / 2 + 0.15);
    });

    it(`${kind} shares geometry and materials between dinos`, () => {
      const a = meshes(createDinoModel(kind));
      const b = meshes(createDinoModel(kind));
      a.forEach((m, i) => {
        expect(m.geometry).toBe(b[i]!.geometry);
        expect(m.material).toBe(b[i]!.material);
      });
    });

    it(`${kind} golden uses gold and normal does not`, () => {
      const normal = createDinoModel(kind);
      const gold = createDinoModel(kind, { golden: true });
      expect(meshes(gold).some((m) => colorOf(m) === GOLD_COLOR)).toBe(true);
      expect(meshes(normal).some((m) => colorOf(m) === GOLD_COLOR)).toBe(false);
      expect(gold.userData.golden).toBe(true);
    });

    it(`${kind} has white eyes with dark pupils`, () => {
      const colors = meshes(createDinoModel(kind)).map(colorOf);
      expect(colors).toContain(0xffffff);
      expect(colors).toContain(0x263238);
    });
  }

  it('baby is half the size and can grow', () => {
    const g = createDinoModel('triceratops', { baby: true });
    expect(g.scale.x).toBe(BABY_SCALE);
    setDinoBaby(g, false);
    expect(g.scale.y).toBe(1);
    expect(dinoScale(true)).toBe(0.5);
    expect(dinoHeight('brachiosaurus', true)).toBeCloseTo(1.2);
    expect(dinoHeight('compy')).toBe(0.8);
  });

  it('egg has a shell and spots, golden gets gold spots', () => {
    const egg = createEggModel('compy');
    expect(egg.children).toHaveLength(2);
    const gold = createEggModel('compy', true);
    expect(colorOf(gold.children[1] as Mesh)).toBe(GOLD_COLOR);
    expect(colorOf(egg.children[1] as Mesh)).not.toBe(GOLD_COLOR);
  });
});
