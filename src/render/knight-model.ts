// The knight model (V17d, V19d): a friendly cartoon knight with a helmet, a tabard, a shield and a wooden sword.
// Gear changes the look: Hoofd replaces the helmet, Hand the sword, Schild the shield, Rug adds a cape and the Pony
// carries him (pose 'ride'). Four meshes (body, sword arm, mount, sparkles), six at most (iPad speed). Flat vertex
// colours, no textures. One geometry set per `look` is cached and shared; the last model that uses it frees it.
import { BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { gearById, type GearItem } from '../knights/gear';
import type { ActorModel } from './actor-render';

export const KNIGHT_MESH_LIMIT = 6;
/** Sparkles flash on for this long and off for this long, so at most 2 flashes a second. */
export const SPARKLE_STEP_SECONDS = 0.25;

const SILVER = 0xa0aec0;
const WOOD = 0x9c6b3a;
const RED = 0xc53030;
/** How high the rider sits per mount shape. The triceratops is low and wide, so his pose differs from the horse. */
const MOUNT_BACK: Record<string, number> = { pony: 0.55, horse: 0.8, triceratops: 0.45 };
const MOUNT_BACK_DEFAULT = 0.55;
/** Soap bubbles (V21b): one pooled mesh of 6 small clear spheres that rise and shrink away in this many ms. */
export const BUBBLE_COUNT = 6;
export const BUBBLE_LIFE_MS = 1500;
const BUBBLE_COLOURS = [0xd6f1ff, 0xffd9f0, 0xfff3c4, 0xd9ffe6, 0xe3d9ff, 0xcfe8ff];

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
  bubbles?: BufferGeometry;
  mountShape?: string;
  users: number;
}

const cache = new Map<string, GearSet>();
const material = new MeshBasicMaterial({ vertexColors: true });

function helmetBoxes(item: GearItem | undefined): Box[] {
  const c = item?.look.color ?? SILVER;
  const s = item?.look.shine ?? c;
  if (item?.look.shape === 'kap') return [[0.5, 0.2, 0.5, c, 0, 1.68, 0], [0.5, 0.08, 0.1, c, 0, 1.58, 0.25]];
  if (item?.look.shape === 'helm') return [[0.5, 0.25, 0.5, c, 0, 1.7, 0], [0.1, 0.1, 0.34, s, 0, 1.87, 0], [0.3, 0.06, 0.04, s, 0, 1.62, 0.22]];
  if (item?.look.shape === 'plume-helm') {
    return [[0.5, 0.25, 0.5, c, 0, 1.7, 0], [0.08, 0.3, 0.2, s, 0, 1.95, -0.05], [0.08, 0.14, 0.2, s, 0, 2.12, -0.15]];
  }
  return [[0.5, 0.25, 0.5, c, 0, 1.7, 0]];
}

function shieldBoxes(item: GearItem | undefined): Box[] {
  const c = item?.look.color ?? RED;
  const boxes: Box[] = [[0.3, 0.3, 0.08, c, -0.38, 1.05, 0.22]];
  if (item?.look.shape === 'ijzeren-schild') boxes.push([0.12, 0.12, 0.05, item.look.shine ?? c, -0.38, 1.05, 0.28]);
  if (item?.look.shape === 'dragon-shield') {
    boxes.push([0.38, 0.38, 0.06, c, -0.38, 1.05, 0.2], [0.14, 0.14, 0.05, item.look.shine ?? 0xf5d04a, -0.38, 1.1, 0.27], [0.06, 0.1, 0.05, 0xc53030, -0.46, 1.27, 0.25], [0.06, 0.1, 0.05, 0xc53030, -0.3, 1.27, 0.25]);
  }
  return boxes;
}

function swordBoxes(item: GearItem | undefined): Box[] {
  const c = item?.look.color ?? WOOD;
  if (item?.look.shape === 'veer') return [[0.05, 0.7, 0.05, c, 0, -0.15, 0.1], [0.18, 0.28, 0.04, 0xfce4ec, 0, 0.3, 0.1]];
  if (item?.look.shape === 'glimzwaard') return [[0.1, 0.8, 0.1, c, 0, -0.2, 0.1], [0.3, 0.07, 0.12, 0xb8860b, 0, -0.5, 0.1]];
  if (item?.look.shape === 'sword') return [[0.1, 0.75, 0.1, c, 0, -0.2, 0.1], [0.3, 0.07, 0.12, 0x6d4a26, 0, -0.5, 0.1]];
  if (item?.look.shape === 'staff') return [[0.07, 0.95, 0.07, c, 0, -0.2, 0.1], [0.2, 0.06, 0.2, item.look.shine ?? 0xcfe8ff, 0, 0.32, 0.1], [0.06, 0.16, 0.06, item.look.shine ?? 0xcfe8ff, 0, 0.42, 0.1]];
  return [[0.1, 0.8, 0.1, c, 0, -0.2, 0.1]];
}

function torsoBoxes(item: GearItem | undefined): Box[] {
  if (!item) return [[0.6, 0.6, 0.4, 0x2b6cb0, 0, 1.0, 0]];
  const c = item.look.color;
  const boxes: Box[] = [[0.6, 0.6, 0.4, c, 0, 1.0, 0]];
  if (item.look.shape === 'mail') for (const y of [0.8, 0.95, 1.1, 1.25]) boxes.push([0.62, 0.05, 0.42, 0x6b7785, 0, y, 0]);
  if (item.look.shape === 'armour') {
    boxes.push([0.66, 0.1, 0.46, c, 0, 1.28, 0], [0.18, 0.5, 0.05, item.look.shine ?? 0xffffff, -0.1, 1.0, 0.21], [0.1, 0.1, 0.1, item.look.shine ?? 0xffffff, 0.3, 1.32, 0]);
  }
  return boxes;
}

function bootBoxes(item: GearItem, mounted: boolean): Box[] {
  const c = item.look.color;
  const y = mounted ? 0.1 : 0.08;
  const z = mounted ? 0.4 : 0.05;
  return [[0.18, 0.16, 0.34, c, -0.1, y, z], [0.18, 0.16, 0.34, c, 0.1, y, z]];
}

function bannerBoxes(item: GearItem): Box[] {
  const c = item.look.color;
  const big = item.look.shape === 'banner' && item.look.shine !== undefined;
  const boxes: Box[] = [[0.05, 1.6, 0.05, WOOD, 0.15, 1.4, -0.32], [0.4, 0.28, 0.03, c, 0.37, 1.95, -0.32]];
  if (big) boxes.push([0.1, 0.1, 0.1, item.look.shine ?? 0xf5d04a, 0.15, 2.25, -0.32], [0.4, 0.05, 0.04, item.look.shine ?? 0xf5d04a, 0.37, 1.8, -0.32]);
  return boxes;
}

function mountBoxes(item: GearItem): Box[] {
  const c = item.look.color;
  const dark = 0x4a3320;
  if (item.look.shape === 'triceratops') {
    const frill = item.look.shine ?? 0xe0a458;
    return [
      [0.75, 0.5, 1.2, c, 0, 0.4, 0],
      [0.38, 0.32, 0.42, c, 0, 0.35, 0.78],
      [0.85, 0.7, 0.08, frill, 0, 0.62, 0.56],
      [0.06, 0.2, 0.06, 0xfff3d6, -0.1, 0.5, 1.02],
      [0.06, 0.2, 0.06, 0xfff3d6, 0.1, 0.5, 1.02],
      [0.07, 0.12, 0.07, 0xfff3d6, 0, 0.36, 1.0],
      [0.1, 0.1, 0.4, c, 0, 0.35, -0.7],
      [0.2, 0.15, 0.2, dark, -0.25, 0.075, 0.35],
      [0.2, 0.15, 0.2, dark, 0.25, 0.075, 0.35],
      [0.2, 0.15, 0.2, dark, -0.25, 0.075, -0.35],
      [0.2, 0.15, 0.2, dark, 0.25, 0.075, -0.35],
    ];
  }
  if (item.look.shape === 'horse') {
    return [
      [0.55, 0.5, 1.1, c, 0, 0.6, 0],
      [0.24, 0.5, 0.3, c, 0, 1.0, 0.55],
      [0.26, 0.26, 0.36, c, 0, 1.2, 0.78],
      [0.1, 0.3, 0.1, dark, 0, 1.05, 0.38],
      [0.08, 0.2, 0.3, dark, 0, 0.75, -0.65],
      [0.14, 0.35, 0.14, dark, -0.18, 0.175, 0.38],
      [0.14, 0.35, 0.14, dark, 0.18, 0.175, 0.38],
      [0.14, 0.35, 0.14, dark, -0.18, 0.175, -0.38],
      [0.14, 0.35, 0.14, dark, 0.18, 0.175, -0.38],
    ];
  }
  // The Pony, and the fallback for a shape this model does not know.
  return [
    [0.5, 0.4, 0.9, c, 0, 0.45, 0],
    [0.2, 0.4, 0.25, c, 0, 0.75, 0.5],
    [0.22, 0.22, 0.3, c, 0, 0.9, 0.68],
    [0.08, 0.16, 0.3, dark, 0, 0.65, -0.55],
    [0.12, 0.25, 0.12, dark, -0.17, 0.125, 0.3],
    [0.12, 0.25, 0.12, dark, 0.17, 0.125, 0.3],
    [0.12, 0.25, 0.12, dark, -0.17, 0.125, -0.3],
    [0.12, 0.25, 0.12, dark, 0.17, 0.125, -0.3],
  ];
}

/** Bubbles as low poly spheres with a colour per vertex, in a loose cluster above the staff. */
function bubbleGeometry(): BufferGeometry {
  const spots: [number, number, number][] = [[0, 0, 0], [0.18, 0.16, 0.05], [-0.16, 0.3, 0], [0.1, 0.46, -0.04], [-0.08, 0.62, 0.05], [0.16, 0.78, 0]];
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  spots.slice(0, BUBBLE_COUNT).forEach(([x, y, z], n) => {
    const g = new SphereGeometry(0.07 + (n % 3) * 0.02, 6, 4);
    const p = g.getAttribute('position');
    const base = pos.length / 3;
    const color = BUBBLE_COLOURS[n % BUBBLE_COLOURS.length]!;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z);
      col.push(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255);
    }
    for (const i of g.getIndex()?.array ?? []) idx.push(base + i);
    g.dispose();
  });
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  out.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  out.setIndex(idx);
  return out;
}

function buildSet(items: readonly GearItem[]): GearSet {
  const at = (slot: string) => items.find((g) => g.slot === slot);
  const mount = at('rijdier');
  const cape = at('rug');
  const legs: Box = mount ? [0.4, 0.25, 0.55, 0x4a5568, 0, 0.2, 0.2] : [0.4, 0.7, 0.3, 0x4a5568, 0, 0.35, 0];
  const body: Box[] = [
    legs,
    ...torsoBoxes(at('lijf')),
    [0.4, 0.35, 0.4, 0xf2c9a0, 0, 1.475, 0],
    ...helmetBoxes(at('hoofd')),
    ...shieldBoxes(at('schild')),
  ];
  if (cape) {
    body.push([0.55, 0.85, 0.06, cape.look.color, 0, 1.0, -0.23]);
    if (cape.look.shine !== undefined) body.push([0.55, 0.08, 0.08, cape.look.shine, 0, 1.4, -0.23]);
  }
  const boots = at('voeten');
  if (boots) body.push(...bootBoxes(boots, !!mount));
  const flag = at('vlag');
  if (flag) body.push(...bannerBoxes(flag));
  const sparkles = at('hand')?.look.effect === 'sparkle'
    ? merge([
      [0.07, 0.07, 0.07, 0xfff7b0, 0.14, 0.3, 0.1],
      [0.07, 0.07, 0.07, 0xffffff, -0.14, 0.1, 0.1],
      [0.07, 0.07, 0.07, 0xfff7b0, 0.1, -0.15, 0.1],
      [0.07, 0.07, 0.07, 0xffffff, -0.08, 0.5, 0.1],
    ])
    : undefined;
  const bubbles = at('hand')?.look.effect === 'bubbles' ? bubbleGeometry() : undefined;
  return { body: merge(body), arm: merge(swordBoxes(at('hand'))), mount: mount ? merge(mountBoxes(mount)) : undefined, mountShape: mount?.look.shape, sparkles, bubbles, users: 0 };
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
  for (const g of [set.body, set.arm, set.mount, set.sparkles, set.bubbles]) g?.dispose();
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
  let bubbleMesh: Mesh | undefined;
  if (set.bubbles) {
    bubbleMesh = new Mesh(set.bubbles, material);
    bubbleMesh.name = 'bubbles';
    bubbleMesh.visible = false;
    bubbleMesh.raycast = () => {}; // not tappable
    arm.add(bubbleMesh);
  }
  if (set.mount) {
    const mountMesh = new Mesh(set.mount, material);
    mountMesh.name = 'mount';
    root.add(mountMesh);
    rider.position.y = MOUNT_BACK[set.mountShape ?? ''] ?? MOUNT_BACK_DEFAULT; // the pose 'ride': legs forward, body up by the back of the mount
  }
  let disposed = false;

  return {
    root,
    setPose(pose, time) {
      arm.rotation.x = pose === 'march' ? Math.sin(time * 6) * 0.6 : 0;
      if (sparkleMesh) sparkleMesh.visible = pose === 'poke' && !calm && Math.floor(time / SPARKLE_STEP_SECONDS) % 2 === 0;
      if (bubbleMesh) {
        // One rise of BUBBLE_LIFE_MS, then the cluster starts again from the staff; it shrinks to nothing at the end.
        const life = (time * 1000) % BUBBLE_LIFE_MS / BUBBLE_LIFE_MS;
        bubbleMesh.visible = pose === 'poke' && !calm;
        bubbleMesh.position.y = 0.4 + life * 0.5;
        bubbleMesh.scale.setScalar(Math.max(0.001, 1 - life * life * life));
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(look);
    },
  };
}
