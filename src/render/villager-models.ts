// Blocky villagers for the world (V11c), built like the dino models: merged boxes, one mesh per colour,
// shared geometries and cached materials. Feet at y = 0, centred on x and z, facing +z.
// Eight looks differ in shirt colour and in hat or hair. Each villager is at most 7 meshes.
import { BoxGeometry, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { HatStyle, VillagerLook } from '../villagers/villager';

export const EYE_COLOR = 0x263238;

interface Part { x: number; y: number; z: number; w: number; h: number; d: number }

const HEAD: Part = { x: 0, y: 1.55, z: 0, w: 0.4, h: 0.4, d: 0.4 };
const TORSO: Part = { x: 0, y: 1.02, z: 0, w: 0.5, h: 0.64, d: 0.28 };
const LEGS: readonly Part[] = [-0.13, 0.13].map((x) => ({ x, y: 0.35, z: 0, w: 0.22, h: 0.7, d: 0.24 }));
const EYES: readonly Part[] = [-0.1, 0.1].map((x) => ({ x, y: 1.6, z: 0.2, w: 0.08, h: 0.1, d: 0.04 }));
/** An arm hangs from the shoulder pivot at (±0.35, 1.3, 0). */
export const SHOULDER = { x: 0.35, y: 1.3 } as const;
const ARM: Part = { x: 0, y: -0.28, z: 0, w: 0.15, h: 0.6, d: 0.15 };

const HATS: Record<HatStyle, readonly Part[]> = {
  cap: [
    { x: 0, y: 1.78, z: 0, w: 0.44, h: 0.1, d: 0.44 },
    { x: 0, y: 1.74, z: 0.28, w: 0.3, h: 0.04, d: 0.16 },
  ],
  hair: [
    { x: 0, y: 1.78, z: 0, w: 0.44, h: 0.14, d: 0.44 },
    { x: 0, y: 1.6, z: -0.2, w: 0.44, h: 0.3, d: 0.08 },
  ],
  tall: [
    { x: 0, y: 1.9, z: 0, w: 0.3, h: 0.3, d: 0.3 },
    { x: 0, y: 1.76, z: 0, w: 0.56, h: 0.04, d: 0.56 },
  ],
  band: [
    { x: 0, y: 1.7, z: 0, w: 0.44, h: 0.08, d: 0.44 },
    { x: 0.26, y: 1.68, z: -0.1, w: 0.1, h: 0.16, d: 0.1 },
  ],
  bun: [
    { x: 0, y: 1.77, z: 0, w: 0.42, h: 0.1, d: 0.42 },
    { x: 0, y: 1.91, z: -0.05, w: 0.18, h: 0.18, d: 0.18 },
  ],
  crown: [
    { x: 0, y: 1.78, z: 0, w: 0.42, h: 0.1, d: 0.42 },
    ...[[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].map(([x, z]) => ({
      x: x as number, y: 1.9, z: z as number, w: 0.08, h: 0.14, d: 0.08,
    })),
  ],
  spikes: [
    { x: 0, y: 1.78, z: 0, w: 0.42, h: 0.1, d: 0.42 },
    ...[-0.12, 0, 0.12].map((x) => ({ x, y: 1.93, z: 0, w: 0.1, h: 0.2, d: 0.1 })),
  ],
  bald: [{ x: 0, y: 1.4, z: 0.2, w: 0.3, h: 0.14, d: 0.08 }],
};

const geometryCache = new Map<string, BufferGeometry>();
const materialCache = new Map<number, MeshBasicMaterial>();

function material(color: number): MeshBasicMaterial {
  let m = materialCache.get(color);
  if (!m) {
    m = new MeshBasicMaterial({ color });
    materialCache.set(color, m);
  }
  return m;
}

function merged(key: string, parts: readonly Part[]): BufferGeometry {
  let g = geometryCache.get(key);
  if (!g) {
    const list = parts.map((p) => {
      const b = new BoxGeometry(p.w, p.h, p.d);
      b.translate(p.x, p.y, p.z);
      return b;
    });
    g = list.length === 1 ? (list[0] as BufferGeometry) : (mergeGeometries(list) as BufferGeometry);
    if (list.length > 1) for (const l of list) l.dispose();
    geometryCache.set(key, g);
  }
  return g;
}

/** The parts of a villager the renderer animates. */
export interface VillagerModel {
  root: Group;
  /** Everything but the feet's world position: the dance jumps and tilts this. */
  body: Group;
  armLeft: Group;
  armRight: Group;
}

export function createVillagerModel(look: VillagerLook): VillagerModel {
  const root = new Group();
  const body = new Group();
  const add = (key: string, parts: readonly Part[], color: number): void => {
    body.add(new Mesh(merged(key, parts), material(color)));
  };
  add('legs', LEGS, look.pants);
  add('torso', [TORSO], look.shirt);
  add('head', [HEAD], look.skin);
  add('eyes', EYES, EYE_COLOR);
  add(`hat:${look.style}`, HATS[look.style], look.hat);
  const arm = (side: 1 | -1): Group => {
    const pivot = new Group();
    pivot.position.set(side * SHOULDER.x, SHOULDER.y, 0);
    pivot.add(new Mesh(merged('arm', [ARM]), material(look.shirt)));
    body.add(pivot);
    return pivot;
  };
  const armRight = arm(1);
  const armLeft = arm(-1);
  root.add(body);
  root.userData = { villager: true, shirt: look.shirt, style: look.style };
  return { root, body, armLeft, armRight };
}

/** Frees the shared geometries and materials. Call when the renderer is disposed. */
export function disposeVillagerModels(): void {
  for (const g of geometryCache.values()) g.dispose();
  geometryCache.clear();
  for (const m of materialCache.values()) m.dispose();
  materialCache.clear();
}
