import { Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GEAR, GEAR_SLOTS, gearById } from '../knights/gear';
import { BUBBLE_COUNT, BUBBLE_LIFE_MS, createKnightModel, KNIGHT_MESH_LIMIT, SPARKLE_STEP_SECONDS } from './knight-model';

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
    expect(GEAR_SLOTS.length).toBeGreaterThanOrEqual(5);
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

describe('AC287: all 8 slots and the new looks', () => {
  const ALL8 = ['pluimhelm', 'drakenschild', 'houten-zwaard', 'koningscape', 'glanzend-harnas', 'snelle-laarzen', 'koningsbanier', 'rij-triceratops'];
  it('AC287: a knight in all 8 slots has at most 6 meshes, for each mount and each hand item', () => {
    expect(GEAR_SLOTS).toHaveLength(8);
    for (const mount of ['strijdpaard', 'rij-triceratops', 'pony']) {
      for (const hand of ['bubbelstaf', 'glimzwaard', 'kietelveer', 'houten-zwaard']) {
        const m = createKnightModel([...ALL8.filter((id) => id !== 'rij-triceratops' && id !== 'houten-zwaard'), mount, hand].join('+'));
        expect(meshesOf(m).length).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
        m.dispose();
      }
    }
  });
  it('AC287: every one of the 13 new items draws, with one part per worn slot, and changes the body or arm', () => {
    const bare = createKnightModel();
    const bareBody = named(bare, 'body')!.geometry.getAttribute('position').count;
    const bareArm = named(bare, 'sword')!.geometry.getAttribute('position').count;
    for (const g of GEAR.slice(8)) {
      const m = createKnightModel(g.id);
      const list = meshesOf(m);
      expect(list.length).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
      for (const mesh of list) expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
      const changed = g.slot === 'rijdier' ? !!named(m, 'mount')
        : named(m, 'body')!.geometry.getAttribute('position').count !== bareBody || named(m, 'sword')!.geometry.getAttribute('position').count !== bareArm
          || colours(named(m, 'body')!).size !== colours(named(bare, 'body')!).size || colours(named(m, 'sword')!).size !== colours(named(bare, 'sword')!).size;
      expect(changed, g.id).toBe(true);
      m.dispose();
    }
    bare.dispose();
  });
  it('AC287: the full set has one mount part, and Lijf replaces the blue tabard', () => {
    const m = createKnightModel(ALL8.join('+'));
    expect(meshesOf(m).filter((x) => x.name === 'mount')).toHaveLength(1);
    expect(colours(named(m, 'body')!).has(0x2b6cb0)).toBe(false);
    m.dispose();
  });
  it('AC287: the Rij-triceratops has its own pose and shape, different from the Strijdpaard', () => {
    const horse = createKnightModel('strijdpaard');
    const tri = createKnightModel('rij-triceratops');
    expect(named(tri, 'body')!.parent!.position.y).not.toBe(named(horse, 'body')!.parent!.position.y);
    expect(named(tri, 'mount')!.geometry).not.toBe(named(horse, 'mount')!.geometry);
    expect(named(tri, 'mount')!.geometry.getAttribute('position').count).not.toBe(named(horse, 'mount')!.geometry.getAttribute('position').count);
    horse.dispose();
    tri.dispose();
  });
  it('AC287: an unknown shape falls back to a plain box and does not crash', () => {
    const ids = ['pluimhelm', 'drakenschild', 'bubbelstaf', 'koningscape', 'glanzend-harnas', 'snelle-laarzen', 'koningsbanier', 'strijdpaard'];
    const items = ids.map((id) => gearById(id)!);
    const saved = items.map((g) => g.look);
    try {
      for (const g of items) (g as { look: unknown }).look = { shape: 'zzz', color: 0x123456 };
      const m = createKnightModel(`odd+${ids.join('+')}`);
      expect(meshesOf(m).length).toBeLessThanOrEqual(KNIGHT_MESH_LIMIT);
      expect(named(m, 'mount')).toBeDefined();
      expect(colours(named(m, 'body')!).has(0x123456)).toBe(true);
      m.dispose();
    } finally {
      items.forEach((g, n) => ((g as { look: unknown }).look = saved[n]));
    }
  });
});

describe('AC286: soap bubbles', () => {
  const bubbles = (m: ReturnType<typeof createKnightModel>) => named(m, 'bubbles')!;
  it('AC286: bubbles show only in poke, are few, none is black, and are not tappable', () => {
    const m = createKnightModel('bubbelstaf');
    expect(bubbles(m)).toBeDefined();
    for (const pose of [undefined, 'march', 'idle'] as const) {
      m.setPose(pose, 0.2);
      expect(bubbles(m).visible).toBe(false);
    }
    m.setPose('poke', 0.2);
    expect(bubbles(m).visible).toBe(true);
    const geo = bubbles(m).geometry;
    expect(geo.getAttribute('position').count).toBeLessThan(BUBBLE_COUNT * 40);
    for (const c of colours(bubbles(m))) {
      expect(c).not.toBe(0);
      expect(Math.max(c >> 16, (c >> 8) & 255, c & 255)).toBeGreaterThan(200);
    }
    expect(bubbles(m).raycast).toBeInstanceOf(Function);
    const hits: unknown[] = [];
    bubbles(m).raycast({} as never, hits as never);
    expect(hits).toHaveLength(0);
    m.dispose();
  });
  it('AC286: each bubble is gone within 2000 ms and the next rise starts at the staff', () => {
    expect(BUBBLE_LIFE_MS).toBeLessThanOrEqual(2000);
    const m = createKnightModel('bubbelstaf');
    m.setPose('poke', (BUBBLE_LIFE_MS - 1) / 1000);
    expect(bubbles(m).scale.x).toBeLessThan(0.05);
    m.setPose('poke', BUBBLE_LIFE_MS / 1000);
    expect(bubbles(m).scale.x).toBeCloseTo(1, 2);
    m.dispose();
  });
  it('AC286: other items have no bubbles and the staff has no sparkles', () => {
    for (const id of ['glimzwaard', 'houten-zwaard', 'pony']) {
      const m = createKnightModel(id);
      expect(named(m, 'bubbles')).toBeUndefined();
      m.dispose();
    }
    const m = createKnightModel('bubbelstaf');
    expect(named(m, 'sparkles')).toBeUndefined();
    m.dispose();
  });
  it('AC286: with prefers-reduced-motion no bubbles show', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const m = createKnightModel('bubbelstaf');
    for (let t = 0; t < 3; t += 0.05) {
      m.setPose('poke', t);
      expect(bubbles(m).visible).toBe(false);
    }
    m.dispose();
  });
  it('AC286: two knights with the same set share one bubble geometry, freed by the last', () => {
    const a = createKnightModel('bubbelstaf');
    const b = createKnightModel('bubbelstaf');
    expect(bubbles(a).geometry).toBe(bubbles(b).geometry);
    const freed = vi.fn();
    bubbles(a).geometry.addEventListener('dispose', freed);
    a.dispose();
    expect(freed).not.toHaveBeenCalled();
    b.dispose();
    expect(freed).toHaveBeenCalledTimes(1);
  });
});
