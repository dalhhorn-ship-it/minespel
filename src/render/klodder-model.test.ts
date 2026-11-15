import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mesh } from 'three';
import { createBubbleModel, createKlodderModel, KLODDER_MESH_LIMIT } from './klodder-model';

function meshes(root: { children: unknown[] }): number {
  return root.children.filter((c) => (c as Mesh).isMesh).length;
}

afterEach(() => vi.unstubAllGlobals());

describe('Klodder and bubble models (v18)', () => {
  it('AC216: each model stays within the 6 mesh cap', () => {
    expect(KLODDER_MESH_LIMIT).toBe(6);
    expect(meshes(createKlodderModel().root)).toBeLessThanOrEqual(6);
    expect(meshes(createBubbleModel().root)).toBeLessThanOrEqual(6);
  });
  it('AC228: with reduced motion nothing bounces or pulses', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const k = createKlodderModel();
    const body = k.root.children[0] as Mesh;
    k.setPose('jump', 1.3);
    expect(body.scale.y).toBe(1);
    const b = createBubbleModel();
    b.setPose('', 1.3);
    expect((b.root.children[0] as Mesh).scale.x).toBe(1);
  });
  it('AC228: without reduced motion Klodder jumps out with a stretch', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const k = createKlodderModel();
    k.setPose('jump', 1);
    expect((k.root.children[0] as Mesh).scale.y).toBeGreaterThan(1.1);
  });
});
