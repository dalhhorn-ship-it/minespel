// The knight model (V17d, V19d): a friendly cartoon knight with a helmet, a tabard, a shield and a wooden sword.
// Gear changes the look: Hoofd replaces the helmet, Hand the sword, Schild the shield, Rug adds a cape and the Pony
// carries him (pose 'ride'). Four meshes (body, sword arm, mount, sparkles), six at most (iPad speed). Flat vertex
// colours, no textures. One geometry set per `look` is cached and shared; the last model that uses it frees it.
import { BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { gearById, type GearItem } from '../knights/gear';
import type { ActorModel } from './actor-render';

export const KNIGHT_MESH_LIMIT = 6;
/** Sparkles flash on for this long and off for this long, so at most 2 flashes a second. */
export const SPARKLE_STEP_SECONDS = 0.25;

const SILVER = 0xa0aec0;
const WOOD = 0x9c6b3a;
const RED = 0xc53030;
const MOUNT_BACK = 0.55;

type Box = [w: number, h: number, d: number, color: number, x: number, y: number, z: number];

/** Merges coloured boxes into one geometry with a colour per vertex. */
function merge(boxes: readonly Box[]): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (const [w, h, d, color, x, y, z] of boxes) {
    const g = new BoxGeometry(w, h, d);
    const p = g.getAttribute('position');
    const base = pos.length / 3;
    const r = ((color >> 16) & 255) / 255;
    const gr = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z);
      col.push(r, gr, b);
    }
    for (const i of g.getIndex()?.array ?? []) idx.push(base + i);
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  out.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  out.setIndex(idx);
  return out;
}

interface GearSet {
  body: BufferGeometry;
  arm: BufferGeometry;
  mount?: BufferGeometry;
  sparkles?: BufferGeometry;
  users: number;
}

const cache = new Map<string, GearSet>();
const material = new MeshBasicMaterial({ vertexColors: true });

function helmetBoxes(item: GearItem | undefined): Box[] {
  const c = item?.look.color ?? SILVER;
  const s = item?.look.shine ?? c;
  if (item?.look.shape === 'kap') return [[0.5, 0.2, 0.5, c, 0, 1.68, 0], [0.5, 0.08, 0.1, c, 0, 1.58, 0.25]];
  if (item?.look.shape === 'helm') return [[0.5, 0.25, 0.5, c, 0, 1.7, 0], [0.1, 0.1, 0.34, s, 0, 1.87, 0], [0.3, 0.06, 0.04, s, 0, 1.62, 0.22]];
  return [[0.5, 0.25, 0.5, c, 0, 1.7, 0]];
}

function shieldBoxes(item: GearItem | undefined): Box[] {
  const c = item?.look.color ?? RED;
  const boxes: Box[] = [[0.3, 0.3, 0.08, c, -0.38, 1.05, 0.22]];
  if (item?.look.shape === 'ijzeren-schild') boxes.push([0.12, 0.12, 0.05, item.look.shine ?? c, -0.38, 1.05, 0.28]);
  return boxes;
}

function swordBoxes(item: GearItem | undefined): Box[] {
  const c = item?.look.color ?? WOOD;
  if (item?.look.shape === 'veer') return [[0.05, 0.7, 0.05, c, 0, -0.15, 0.1], [0.18, 0.28, 0.04, 0xfce4ec, 0, 0.3, 0.1]];
  if (item?.look.shape === 'glimzwaard') return [[0.1, 0.8, 0.1, c, 0, -0.2, 0.1], [0.3, 0.07, 0.12, 0xb8860b, 0, -0.5, 0.1]];
  return [[0.1, 0.8, 0.1, c, 0, -0.2, 0.1]];
}

function mountBoxes(item: GearItem): Box[] {
  const c = item.look.color;
  return [
    [0.5, 0.4, 0.9, c, 0, 0.45, 0],
    [0.2, 0.4, 0.25, c, 0, 0.75, 0.5],
    [0.22, 0.22, 0.3, c, 0, 0.9, 0.68],
    [0.08, 0.16, 0.3, 0x4a3320, 0, 0.65, -0.55],
    [0.12, 0.25, 0.12, 0x4a3320, -0.17, 0.125, 0.3],
    [0.12, 0.25, 0.12, 0x4a3320, 0.17, 0.125, 0.3],
    [0.12, 0.25, 0.12, 0x4a3320, -0.17, 0.125, -0.3],
    [0.12, 0.25, 0.12, 0x4a3320, 0.17, 0.125, -0.3],
  ];
}

function buildSet(items: readonly GearItem[]): GearSet {
  const at = (slot: string) => items.find((g) => g.slot === slot);
  const mount = at('rijdier');
  const cape = at('rug');
  const legs: Box = mount ? [0.4, 0.25, 0.55, 0x4a5568, 0, 0.2, 0.2] : [0.4, 0.7, 0.3, 0x4a5568, 0, 0.35, 0];
  const body: Box[] = [
    legs,
    [0.6, 0.6, 0.4, 0x2b6cb0, 0, 1.0, 0],
    [0.4, 0.35, 0.4, 0xf2c9a0, 0, 1.475, 0],
    ...helmetBoxes(at('hoofd')),
    ...shieldBoxes(at('schild')),
  ];
  if (cape) body.push([0.55, 0.85, 0.06, cape.look.color, 0, 1.0, -0.23]);
  const sparkles = at('hand')?.look.effect === 'sparkle'
    ? merge([
      [0.07, 0.07, 0.07, 0xfff7b0, 0.14, 0.3, 0.1],
      [0.07, 0.07, 0.07, 0xffffff, -0.14, 0.1, 0.1],
      [0.07, 0.07, 0.07, 0xfff7b0, 0.1, -0.15, 0.1],
      [0.07, 0.07, 0.07, 0xffffff, -0.08, 0.5, 0.1],
    ])
    : undefined;
  return { body: merge(body), arm: merge(swordBoxes(at('hand'))), mount: mount ? merge(mountBoxes(mount)) : undefined, sparkles, users: 0 };
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The gear set of a `look` (sorted ids joined by `+`, empty for a bare knight), cached by the key. */
function acquire(look: string): GearSet {
  let set = cache.get(look);
  if (!set) {
    const items = look.split('+').flatMap((id) => gearById(id) ?? []);
    set = buildSet(items);
    cache.set(look, set);
  }
  set.users += 1;
  return set;
}

function release(look: string): void {
  const set = cache.get(look);
  if (!set || --set.users > 0) return;
  cache.delete(look);
  for (const g of [set.body, set.arm, set.mount, set.sparkles]) g?.dispose();
}

export function createKnightModel(look = ''): ActorModel {
  const set = acquire(look);
  const calm = reducedMotion();
  const root = new Group();
  const rider = new Group();
  root.add(rider);
  const bodyMesh = new Mesh(set.body, material);
  bodyMesh.name = 'body';
  rider.add(bodyMesh);
  // The sword arm swings as one group: the sword (or feather) is one mesh.
  const arm = new Group();
  arm.position.set(0.4, 1.2, 0);
  rider.add(arm);
  const armMesh = new Mesh(set.arm, material);
  armMesh.name = 'sword';
  arm.add(armMesh);
  let sparkleMesh: Mesh | undefined;
  if (set.sparkles) {
    sparkleMesh = new Mesh(set.sparkles, material);
    sparkleMesh.name = 'sparkles';
    sparkleMesh.visible = false;
    arm.add(sparkleMesh);
  }
  if (set.mount) {
    const mountMesh = new Mesh(set.mount, material);
    mountMesh.name = 'mount';
    root.add(mountMesh);
    rider.position.y = MOUNT_BACK; // the pose 'ride': legs forward, body up by the back of the mount
  }
  let disposed = false;

  return {
    root,
    setPose(pose, time) {
      arm.rotation.x = pose === 'march' ? Math.sin(time * 6) * 0.6 : 0;
      if (sparkleMesh) sparkleMesh.visible = pose === 'poke' && !calm && Math.floor(time / SPARKLE_STEP_SECONDS) % 2 === 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(look);
    },
  };
}
