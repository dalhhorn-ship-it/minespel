// The Lavakip-bar truck model (v23, decision 144): a friendly food truck, box made, orange and red, a yellow awning, a
// sign with a golden lavakip, a little dino cook in a white hat in the window and a still puff of steam. At most
// `BAR_MESH_LIMIT` meshes (each one a merge of coloured boxes), no animation. It faces +z like the other actor models,
// and its root is the centre of the min corner cell: the body covers x -0.5 to 1.5 and z -0.5 to 2.5 (the 2 x 3 footprint).
import { BoxGeometry, BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActorModel } from './actor-render';

export const BAR_MESH_LIMIT = 4;

/** One coloured box: size, centre, colour and an optional tilt around x (radians). */
type Part = [w: number, h: number, d: number, x: number, y: number, z: number, color: number, tilt?: number];

const ORANGE = 0xe8742a;
const RED = 0xc8321e;
const YELLOW = 0xffd23a;
const GOLD = 0xf0a818;
const DARK = 0x3a2a22;
const WHITE = 0xffffff;
const GREEN = 0x58b858;

const BODY: Part[] = [
  [2, 1.2, 3, 0.5, 1.0, 1, ORANGE],
  [2.04, 0.35, 3.04, 0.5, 0.6, 1, RED],
  [1.2, 0.7, 0.06, 0.5, 1.15, 2.52, DARK], // the serving window
  [0.3, 0.3, 0.3, -0.35, 0.3, 0.1, DARK], // wheels
  [0.3, 0.3, 0.3, 1.35, 0.3, 0.1, DARK],
  [0.3, 0.3, 0.3, -0.35, 0.3, 1.9, DARK],
  [0.3, 0.3, 0.3, 1.35, 0.3, 1.9, DARK],
  [1.5, 0.5, 0.12, 0.5, 2.1, 2.3, RED], // the sign on the roof
  [0.34, 0.34, 0.14, 0.5, 2.1, 2.3, GOLD], // the golden lavakip on it
  [0.16, 0.14, 0.16, 0.5, 2.38, 2.3, ORANGE], // its tiny flame
];
const AWNING: Part[] = [[1.5, 0.08, 0.7, 0.5, 1.75, 2.85, YELLOW, 0.35]];
const COOK: Part[] = [
  [0.4, 0.34, 0.34, 0.5, 1.1, 2.3, GREEN], // the dino head
  [0.34, 0.26, 0.34, 0.5, 1.38, 2.3, WHITE], // the white hat
  [0.44, 0.06, 0.4, 0.5, 1.28, 2.3, WHITE],
];
const STEAM: Part[] = [
  [0.22, 0.22, 0.22, 1.1, 2.0, 1.4, WHITE],
  [0.16, 0.16, 0.16, 1.2, 2.28, 1.4, WHITE],
];

/** Merges coloured boxes into one non indexed geometry with a colour per vertex. */
function merge(parts: readonly Part[]): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const c = new Color();
  for (const [w, h, d, x, y, z, color, tilt] of parts) {
    const box = new BoxGeometry(w, h, d).toNonIndexed();
    if (tilt) box.rotateX(tilt);
    box.translate(x, y, z);
    const p = box.getAttribute('position');
    c.set(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      col.push(c.r, c.g, c.b);
    }
    box.dispose();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  return g;
}

export function createLavakipBarModel(): ActorModel {
  const root = new Group();
  const material = new MeshBasicMaterial({ vertexColors: true });
  const geometries = [BODY, AWNING, COOK, STEAM].map(merge);
  for (const g of geometries) root.add(new Mesh(g, material));
  return {
    root,
    setPose() {
      // The truck stands still.
    },
    dispose() {
      for (const g of geometries) g.dispose();
      material.dispose();
    },
  };
}
