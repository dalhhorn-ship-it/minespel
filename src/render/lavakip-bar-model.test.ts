import { describe, expect, it } from 'vitest';
import type { Mesh } from 'three';
import { BAR_MESH_LIMIT, createLavakipBarModel } from './lavakip-bar-model';

describe('Lavakip-bar model (v23)', () => {
  it('AC312: at most 4 meshes', () => {
    expect(BAR_MESH_LIMIT).toBe(4);
    const meshes: Mesh[] = [];
    createLavakipBarModel().root.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh);
    });
    expect(meshes.length).toBeGreaterThan(1);
    expect(meshes.length).toBeLessThanOrEqual(4);
  });
  it('AC312: the footprint is 2 x 3 and the truck has no animation', () => {
    const m = createLavakipBarModel();
    const before = m.root.children.map((c) => [c.position.x, c.position.y, c.position.z, c.rotation.x, c.rotation.y, c.scale.x]);
    m.setPose('walk', 3);
    m.setPose(undefined, 9);
    expect(m.root.children.map((c) => [c.position.x, c.position.y, c.position.z, c.rotation.x, c.rotation.y, c.scale.x])).toEqual(before);
    const body = (m.root.children[0] as Mesh).geometry;
    body.computeBoundingBox();
    const b = body.boundingBox!;
    expect(b.max.x - b.min.x).toBeGreaterThanOrEqual(2);
    expect(b.max.x).toBeLessThanOrEqual(1.55);
    expect(b.min.x).toBeGreaterThanOrEqual(-0.55);
    expect(b.max.z - b.min.z).toBeGreaterThanOrEqual(3);
    expect(b.max.z).toBeLessThanOrEqual(2.6);
    m.dispose();
  });
});
