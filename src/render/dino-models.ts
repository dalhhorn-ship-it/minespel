// Box dinos and eggs for the world. Friendly, blocky, big eyes, few meshes (an older iPad draws 12 to 14).
// Geometries and materials are shared between all dinos. Each dino is one Group of at most 7 meshes.
// Local space: feet at y = 0, centred on x and z, facing +z (like the renderer's yaw 0).
// Game state never lives here: the renderer moves the group and the game says what to show.
// Shapes and colours come from the animal table (src/dinos/species.ts).

import { BoxGeometry, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Palette, Part } from '../dinos/body';
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

const GOLD_PALETTE: Palette = { body: GOLD_COLOR, head: 0xffe066, legs: 0xe0a000, feature: 0xfff3b0 };

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
  const spec = DINO_KINDS[kind].body;
  const pal = look.golden ? GOLD_PALETTE : DINO_KINDS[kind].palette;
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
  group.add(new Mesh(merged('egg:spots', spots), material(golden ? GOLD_COLOR : DINO_KINDS[kind].palette.body)));
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
