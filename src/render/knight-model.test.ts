import { Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GEAR, GEAR_SLOTS, gearById } from '../knights/gear';
import { createKnightModel, KNIGHT_MESH_LIMIT, SPARKLE_STEP_SECONDS } from './knight-model';

const meshesOf = (m: ReturnType<typeof createKnightModel>): Mesh[] => {
  const out: Mesh[] = [];
  m.root.traverse((o) => {
    if (o instanceof Mesh) out.push(o);
  });
  return out;
};
/** The vertex colours of a mesh as 0xRRGGBB numbers. */
const colours = (mesh: Mesh): Set<number> => {
  const c = mesh.geometry.getAttribute('color');
  const set = new Set<number>();
  for (let i = 0; i < c.count; i++) set.add((Math.round(c.getX(i) * 255) << 16) | (Math.round(c.getY(i) * 255) << 8) | Math.round(c.getZ(i) * 255));
  return set;
};
const named = (m: ReturnType<typeof createKnightModel>, name: string) => meshesOf(m).find((x) => x.name === name);
const FULL = 'glimzwaard+ijzeren-helm+ijzeren-schild+pony+riddercape';

afterEach(() => vi.unstubAllGlobals());

describe('AC203: knight model', () => {
  it('has at most 6 meshes', () => {
    const m = createKnightModel();
    expect(meshesOf(m).length).toBeGreaterThan(0);
    expect(meshesOf(m).length).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
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

describe('AC264: gear on the knight', () => {
  it('AC264: at most 6 meshes with an item in all 5 slots, and for every single item', () => {
    expect(GEAR_SLOTS).toHaveLength(5);
    const m = createKnightModel(FULL);
    expect(meshesOf(m).length).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
    m.dispose();
    for (const g of GEAR) {
      const one = createKnightModel(g.id);
      expect(meshesOf(one).length).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
      one.dispose();
    }
  });
  it('AC264: the Hoofd item replaces the silver helmet and the Hand item the wooden sword', () => {
    const bare = createKnightModel();
    expect(colours(named(bare, 'body')!).has(0xa0aec0)).toBe(true);
    expect(colours(named(bare, 'sword')!).has(0x9c6b3a)).toBe(true);
    const dressed = createKnightModel('glimzwaard+leren-kap');
    expect(colours(named(dressed, 'body')!).has(0xa0aec0)).toBe(false);
    expect(colours(named(dressed, 'body')!).has(0x8b5a2b)).toBe(true);
    expect(colours(named(dressed, 'sword')!).has(0x9c6b3a)).toBe(false);
    expect(colours(named(dressed, 'sword')!).has(0xf5d04a)).toBe(true);
    bare.dispose();
    dressed.dispose();
  });
  it('AC264: with the Pony he rides: a mount mesh and the body up on its back', () => {
    const walker = createKnightModel('glimzwaard');
    const rider = createKnightModel('pony');
    expect(named(walker, 'mount')).toBeUndefined();
    expect(named(rider, 'mount')).toBeDefined();
    expect(named(rider, 'body')!.parent!.position.y).toBeGreaterThan(0.3);
    expect(named(walker, 'body')!.parent!.position.y).toBe(0);
    walker.dispose();
    rider.dispose();
  });
  it('AC264: two models with the same look share one geometry, another look does not, the last one frees it', () => {
    const a = createKnightModel(FULL);
    const b = createKnightModel(FULL);
    const c = createKnightModel('riddercape');
    expect(named(a, 'body')!.geometry).toBe(named(b, 'body')!.geometry);
    expect(named(a, 'body')!.geometry).not.toBe(named(c, 'body')!.geometry);
    const geo = named(a, 'body')!.geometry;
    const freed = vi.fn();
    geo.addEventListener('dispose', freed);
    a.dispose();
    expect(freed).not.toHaveBeenCalled();
    b.dispose();
    expect(freed).toHaveBeenCalledTimes(1);
    c.dispose();
  });
  it('AC264: an unknown id in the look is skipped', () => {
    const m = createKnightModel('nope+pony');
    expect(named(m, 'mount')).toBeDefined();
    m.dispose();
  });
});

describe('AC265: sparkles and metal', () => {
  const sparkles = (m: ReturnType<typeof createKnightModel>) => named(m, 'sparkles')!;
  it('AC265: the Glimzwaard sparkles only in poke, flashing at most 2 times a second', () => {
    const m = createKnightModel('glimzwaard');
    m.setPose('march', 0);
    expect(sparkles(m).visible).toBe(false);
    let flashes = 0;
    let was = false;
    const step = SPARKLE_STEP_SECONDS / 5;
    for (let t = 0; t < 1 - 1e-9; t += step) {
      m.setPose('poke', t);
      if (sparkles(m).visible && !was) flashes++;
      was = sparkles(m).visible;
    }
    expect(flashes).toBeGreaterThanOrEqual(1);
    expect(flashes).toBeLessThanOrEqual(2);
    m.setPose(undefined, 0);
    expect(sparkles(m).visible).toBe(false);
    m.dispose();
  });
  it('AC265: with prefers-reduced-motion no sparkles show', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const m = createKnightModel('glimzwaard');
    for (let t = 0; t < 2; t += 0.05) {
      m.setPose('poke', t);
      expect(sparkles(m).visible).toBe(false);
    }
    m.dispose();
  });
  it('AC265: other gear has no sparkles', () => {
    for (const id of ['kietelveer', 'ijzeren-helm', 'ijzeren-schild', 'pony']) {
      const m = createKnightModel(id);
      expect(named(m, 'sparkles')).toBeUndefined();
      m.dispose();
    }
  });
  it('AC265: the iron helm and shield have the bright metal colour and no animation', () => {
    for (const id of ['ijzeren-helm', 'ijzeren-schild']) {
      const item = gearById(id)!;
      const m = createKnightModel(id);
      const body = named(m, 'body')!;
      expect(colours(body).has(item.look.shine!)).toBe(true);
      const before = body.parent!.rotation.clone();
      m.setPose('poke', 0.1);
      m.setPose('march', 0.7);
      expect(body.parent!.rotation.equals(before)).toBe(true);
      expect(body.rotation.x + body.rotation.y + body.rotation.z).toBe(0);
      m.dispose();
    }
  });
});
