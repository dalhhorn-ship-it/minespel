// Box dinos and eggs for the world. Friendly, blocky, big eyes, few meshes (an older iPad draws 12 to 14).
// Geometries and materials are shared between all dinos. Each dino is one Group of at most 7 meshes.
// Local space: feet at y = 0, centred on x and z, facing +z (like the renderer's yaw 0).
// Game state never lives here: the renderer moves the group and the game says what to show.

import { BoxGeometry, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DINO_KINDS, type DinoKindId } from '../dinos/kinds';

export const GOLD_COLOR = 0xffc928;
/** A baby is half the size of the grown dino. */
export const BABY_SCALE = 0.5;
export const EYE_COLOR = 0xffffff;
export const PUPIL_COLOR = 0x263238;

export interface DinoLook {
  /** Golden version: same model, gold colour. */
  golden?: boolean;
  /** Just hatched and still growing. */
  baby?: boolean;
}

interface Palette {
  body: number;
  head: number;
  legs: number;
  feature: number;
}

const PALETTES: Record<DinoKindId, Palette> = {
  compy: { body: 0x66bb6a, head: 0x81c784, legs: 0x43a047, feature: 0x66bb6a },
  triceratops: { body: 0xffa726, head: 0xffb74d, legs: 0xf57c00, feature: 0xfff3e0 },
  stegosaurus: { body: 0x26a69a, head: 0x4db6ac, legs: 0x00897b, feature: 0xf48fb1 },
  brachiosaurus: { body: 0x42a5f5, head: 0x64b5f6, legs: 0x1e88e5, feature: 0x90caf9 },
  kip: { body: 0xfafafa, head: 0xf5f5f5, legs: 0xff9800, feature: 0xe53935 },
};
const GOLD_PALETTE: Palette = { body: GOLD_COLOR, head: 0xffe066, legs: 0xe0a000, feature: 0xfff3b0 };

/** A box described by its centre and size. */
interface Part {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

interface Spec {
  body: Part;
  head: Part;
  tail: Part;
  /** Leg size and where they stand (x, z pairs). */
  leg: { w: number; h: number; d: number; at: readonly (readonly [number, number])[] };
  /** Horns, frill, plates or neck. */
  feature: readonly Part[];
}

const SPECS: Record<DinoKindId, Spec> = {
  compy: {
    body: { x: 0, y: 0.4, z: -0.05, w: 0.45, h: 0.3, d: 0.5 },
    head: { x: 0, y: 0.61, z: 0.3, w: 0.4, h: 0.38, d: 0.4 },
    tail: { x: 0, y: 0.4, z: -0.375, w: 0.2, h: 0.2, d: 0.25 },
    leg: { w: 0.14, h: 0.25, d: 0.14, at: [[-0.12, -0.05], [0.12, -0.05]] },
    feature: [],
  },
  triceratops: {
    body: { x: 0, y: 0.55, z: -0.1, w: 0.9, h: 0.5, d: 0.9 },
    head: { x: 0, y: 0.6, z: 0.55, w: 0.6, h: 0.6, d: 0.5 },
    tail: { x: 0, y: 0.6, z: -0.675, w: 0.25, h: 0.25, d: 0.25 },
    leg: { w: 0.25, h: 0.35, d: 0.25, at: [[-0.3, -0.35], [0.3, -0.35], [-0.3, 0.2], [0.3, 0.2]] },
    feature: [
      { x: 0, y: 0.7, z: 0.36, w: 0.95, h: 0.6, d: 0.1 },
      { x: -0.18, y: 0.92, z: 0.77, w: 0.1, h: 0.1, d: 0.2 },
      { x: 0.18, y: 0.92, z: 0.77, w: 0.1, h: 0.1, d: 0.2 },
    ],
  },
  stegosaurus: {
    body: { x: 0, y: 0.625, z: -0.1, w: 0.9, h: 0.55, d: 1.2 },
    head: { x: 0, y: 0.55, z: 0.62, w: 0.45, h: 0.4, d: 0.45 },
    tail: { x: 0, y: 0.6, z: -0.675, w: 0.35, h: 0.3, d: 0.45 },
    leg: { w: 0.28, h: 0.4, d: 0.28, at: [[-0.32, -0.5], [0.32, -0.5], [-0.32, 0.3], [0.32, 0.3]] },
    feature: [
      { x: 0, y: 1.05, z: -0.45, w: 0.1, h: 0.3, d: 0.3 },
      { x: 0, y: 1.05, z: -0.1, w: 0.1, h: 0.3, d: 0.3 },
      { x: 0, y: 1.05, z: 0.25, w: 0.1, h: 0.3, d: 0.3 },
    ],
  },
  brachiosaurus: {
    body: { x: 0, y: 0.95, z: -0.1, w: 1.1, h: 0.7, d: 1.4 },
    head: { x: 0, y: 2.2, z: 0.72, w: 0.5, h: 0.4, d: 0.55 },
    tail: { x: 0, y: 1.0, z: -0.8, w: 0.35, h: 0.3, d: 0.4 },
    leg: { w: 0.35, h: 0.7, d: 0.35, at: [[-0.4, -0.55], [0.4, -0.55], [-0.4, 0.4], [0.4, 0.4]] },
    feature: [{ x: 0, y: 1.75, z: 0.45, w: 0.4, h: 1.1, d: 0.4 }],
  },
  kip: {
    body: { x: 0, y: 0.34, z: -0.03, w: 0.34, h: 0.26, d: 0.38 },
    head: { x: 0, y: 0.52, z: 0.18, w: 0.24, h: 0.24, d: 0.22 },
    tail: { x: 0, y: 0.4, z: -0.26, w: 0.18, h: 0.18, d: 0.12 },
    leg: { w: 0.08, h: 0.22, d: 0.08, at: [[-0.09, -0.02], [0.09, -0.02]] },
    feature: [
      { x: 0, y: 0.67, z: 0.18, w: 0.08, h: 0.08, d: 0.14 },
      { x: 0, y: 0.48, z: 0.33, w: 0.12, h: 0.08, d: 0.1 },
    ],
  },
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

function boxAt(p: Part): BufferGeometry {
  const g = new BoxGeometry(p.w, p.h, p.d);
  g.translate(p.x, p.y, p.z);
  return g;
}

function merged(key: string, parts: readonly Part[]): BufferGeometry {
  let g = geometryCache.get(key);
  if (!g) {
    const list = parts.map(boxAt);
    g = list.length === 1 ? (list[0] as BufferGeometry) : (mergeGeometries(list) as BufferGeometry);
    if (list.length > 1) for (const l of list) l.dispose();
    geometryCache.set(key, g);
  }
  return g;
}

/** Big friendly eyes on the front of the head: white boxes with a dark pupil in front. */
function eyeParts(head: Part): { eyes: Part[]; pupils: Part[] } {
  const e = head.h * 0.4;
  const front = head.z + head.d / 2;
  const ex = head.w * 0.28;
  const ey = head.y + head.h * 0.12;
  const ez = front - e * 0.3;
  const p = e * 0.5;
  const pz = ez + e / 2 + p * 0.1;
  return {
    eyes: [-ex, ex].map((x) => ({ x, y: ey, z: ez, w: e, h: e, d: e })),
    pupils: [-ex, ex].map((x) => ({ x, y: ey - e * 0.05, z: pz, w: p, h: p, d: p })),
  };
}

export function isGoldenColor(color: number): boolean {
  return color === GOLD_COLOR;
}

/** Height of the grown dino in blocks, used to float the name tag above it. */
export function dinoHeight(kind: DinoKindId, baby = false): number {
  return DINO_KINDS[kind].size.h * (baby ? BABY_SCALE : 1);
}

/** Scale for the whole model: 0.5 for a baby, 1 when grown. */
export function dinoScale(baby: boolean): number {
  return baby ? BABY_SCALE : 1;
}

/** Switches a model between baby and grown. Cheap: only the group scale changes. */
export function setDinoBaby(model: Group, baby: boolean): void {
  const s = dinoScale(baby);
  model.scale.set(s, s, s);
}

export function createDinoModel(kind: DinoKindId, look: DinoLook = {}): Group {
  const spec = SPECS[kind];
  const pal = look.golden ? GOLD_PALETTE : PALETTES[kind];
  const { eyes, pupils } = eyeParts(spec.head);
  const legs: Part[] = spec.leg.at.map(([x, z]) => ({ x, y: spec.leg.h / 2, z, w: spec.leg.w, h: spec.leg.h, d: spec.leg.d }));

  const group = new Group();
  const add = (key: string, parts: readonly Part[], color: number): void => {
    if (parts.length === 0) return;
    group.add(new Mesh(merged(`${kind}:${key}`, parts), material(color)));
  };
  add('body', [spec.body], pal.body);
  add('legs', legs, pal.legs);
  add('tail', [spec.tail], pal.body);
  add('head', [spec.head], pal.head);
  add('feature', spec.feature, pal.feature);
  add('eyes', eyes, EYE_COLOR);
  add('pupils', pupils, PUPIL_COLOR);

  group.userData = { kind, golden: !!look.golden };
  setDinoBaby(group, !!look.baby);
  return group;
}

/** A cream egg with spots: two stacked boxes, and a spot box set. Spots are gold for a golden egg. */
export function createEggModel(kind: DinoKindId, golden = false): Group {
  const shell: Part[] = [
    { x: 0, y: 0.22, z: 0, w: 0.4, h: 0.44, d: 0.4 },
    { x: 0, y: 0.5, z: 0, w: 0.28, h: 0.16, d: 0.28 },
  ];
  const spots: Part[] = [
    { x: 0.2, y: 0.18, z: 0.08, w: 0.03, h: 0.1, d: 0.1 },
    { x: -0.2, y: 0.3, z: -0.06, w: 0.03, h: 0.1, d: 0.1 },
    { x: 0.06, y: 0.28, z: 0.2, w: 0.1, h: 0.1, d: 0.03 },
    { x: -0.08, y: 0.14, z: -0.2, w: 0.1, h: 0.1, d: 0.03 },
    { x: 0.05, y: 0.59, z: 0.05, w: 0.1, h: 0.03, d: 0.1 },
  ];
  const group = new Group();
  group.add(new Mesh(merged('egg:shell', shell), material(golden ? 0xfff3b0 : 0xfff8e1)));
  group.add(new Mesh(merged('egg:spots', spots), material(golden ? GOLD_COLOR : PALETTES[kind].body)));
  group.userData = { kind, golden, egg: true };
  return group;
}

/** Frees the shared geometries and materials. Call when the renderer is disposed. */
export function disposeDinoModels(): void {
  for (const g of geometryCache.values()) g.dispose();
  geometryCache.clear();
  for (const m of materialCache.values()) m.dispose();
  materialCache.clear();
}
