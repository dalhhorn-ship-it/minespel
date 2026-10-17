// Keeps the three.js dinos, eggs, name tags and little clouds in step with the dino store.
// The store is the truth; this only draws it. Every dino is one Group: a model (scaled while it
// grows) and a name tag sprite above it. Models share geometries, so many dinos stay light.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type Sprite } from 'three';
import type { DinoEntry, EggEntry } from '../dinos/dino-store';
import { isPlaced } from '../dinos/dino-store';
import { growthScale } from '../dinos/egg';
import type { DinoKindId } from '../dinos/kinds';
import { createDinoModel, createEggModel, dinoHeight, disposeDinoModels } from './dino-models';
import { createNameTagSprite, disposeNameTag } from './name-tag';

export type BurstKind = 'puff' | 'hearts';

const BURST_SECONDS = 0.7;
const MAX_BURSTS = 10;
const BITS = 6;
/** An egg that is about to hatch wobbles during its last seconds. */
const WOBBLE_FROM = 3.5;
const TAG_GAP = 0.3;
const BURST_COLORS: Record<BurstKind, number> = { puff: 0xffffff, hearts: 0xff6f91 };

interface DinoNode {
  root: Group;
  model: Group;
  kind: DinoKindId;
  golden: boolean;
  tag: Sprite | null;
  tagName: string;
}

interface EggNode {
  root: Group;
  kind: DinoKindId;
  golden: boolean;
}

interface Burst {
  group: Group;
  age: number;
  bits: { mesh: Mesh; vx: number; vy: number; vz: number }[];
}

export interface DinoRender {
  /** Add this to the scene (the renderer does, through `setDinoLayer`). */
  readonly layer: Group;
  /** Moves everything to the state in the lists. `dt` ages the clouds. */
  sync(dinos: readonly DinoEntry[], eggs: readonly EggEntry[], dt: number): void;
  /** A short cloud (puff) or little hearts at a spot in the world. */
  burst(kind: BurstKind, x: number, y: number, z: number): void;
  /** How many dino and egg nodes exist (for tests). */
  count(): { dinos: number; eggs: number };
  dispose(): void;
}

export function createDinoRender(doc: Document = document): DinoRender {
  const layer = new Group();
  const dinoNodes = new Map<number, DinoNode>();
  const eggNodes = new Map<number, EggNode>();
  const bursts: Burst[] = [];
  const bitGeometry = new BoxGeometry(0.18, 0.18, 0.18);
  const bitMaterials = new Map<BurstKind, MeshBasicMaterial>();
  const bitMaterial = (k: BurstKind): MeshBasicMaterial => {
    let m = bitMaterials.get(k);
    if (!m) {
      m = new MeshBasicMaterial({ color: BURST_COLORS[k] });
      bitMaterials.set(k, m);
    }
    return m;
  };

  function removeBurst(b: Burst): void {
    layer.remove(b.group);
  }

  function setTag(node: DinoNode, name: string, height: number): void {
    if (node.tagName !== name) {
      if (node.tag) {
        node.root.remove(node.tag);
        disposeNameTag(node.tag);
        node.tag = null;
      }
      node.tagName = name;
      if (name !== '') {
        node.tag = createNameTagSprite(name, doc);
        if (node.tag) node.root.add(node.tag);
      }
    }
    if (node.tag) node.tag.position.set(0, height + TAG_GAP, 0);
  }

  return {
    layer,
    sync(dinos, eggs, dt) {
      const seenDinos = new Set<number>();
      for (const d of dinos) {
        const s = d.state;
        if (!isPlaced(s)) continue;
        seenDinos.add(d.id);
        let node = dinoNodes.get(d.id);
        if (!node || node.kind !== s.kind || node.golden !== s.golden) {
          if (node) {
            layer.remove(node.root);
            if (node.tag) disposeNameTag(node.tag);
          }
          const root = new Group();
          const model = createDinoModel(s.kind, { golden: s.golden });
          root.add(model);
          layer.add(root);
          node = { root, model, kind: s.kind, golden: s.golden, tag: null, tagName: '' };
          dinoNodes.set(d.id, node);
        }
        const k = growthScale(s.growth);
        node.model.scale.set(k, k, k);
        node.root.position.set(s.x, s.y, s.z);
        node.root.rotation.y = s.heading;
        setTag(node, d.name, dinoHeight(s.kind) * k);
      }
      for (const [id, node] of dinoNodes) {
        if (seenDinos.has(id)) continue;
        layer.remove(node.root);
        if (node.tag) disposeNameTag(node.tag);
        dinoNodes.delete(id);
      }

      const seenEggs = new Set<number>();
      for (const e of eggs) {
        const g = e.egg;
        if (!isPlaced(g)) continue;
        seenEggs.add(e.id);
        let node = eggNodes.get(e.id);
        if (!node || node.kind !== g.kind || node.golden !== g.golden) {
          if (node) layer.remove(node.root);
          const root = new Group();
          root.add(createEggModel(g.kind, g.golden));
          layer.add(root);
          node = { root, kind: g.kind, golden: g.golden };
          eggNodes.set(e.id, node);
        }
        node.root.position.set(g.x, g.y, g.z);
        node.root.rotation.z = g.playSeconds > WOBBLE_FROM ? Math.sin(g.playSeconds * 24) * 0.25 : 0;
      }
      for (const [id, node] of eggNodes) {
        if (seenEggs.has(id)) continue;
        layer.remove(node.root);
        eggNodes.delete(id);
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]!;
        b.age += dt;
        if (b.age >= BURST_SECONDS) {
          removeBurst(b);
          bursts.splice(i, 1);
          continue;
        }
        const t = b.age / BURST_SECONDS;
        const size = 1 - t;
        for (const bit of b.bits) {
          bit.mesh.position.set(bit.vx * b.age, bit.vy * b.age, bit.vz * b.age);
          bit.mesh.scale.setScalar(Math.max(0.01, size));
        }
      }
    },
    burst(kind, x, y, z) {
      if (bursts.length >= MAX_BURSTS) removeBurst(bursts.shift()!);
      const group = new Group();
      group.position.set(x, y, z);
      const bits: Burst['bits'] = [];
      for (let i = 0; i < BITS; i++) {
        const a = (i / BITS) * Math.PI * 2;
        const mesh = new Mesh(bitGeometry, bitMaterial(kind));
        group.add(mesh);
        const up = kind === 'hearts' ? 1.6 : 0.8;
        bits.push({ mesh, vx: Math.cos(a) * 1.2, vy: up + (i % 2) * 0.4, vz: Math.sin(a) * 1.2 });
      }
      layer.add(group);
      bursts.push({ group, age: 0, bits });
    },
    count: () => ({ dinos: dinoNodes.size, eggs: eggNodes.size }),
    dispose() {
      for (const node of dinoNodes.values()) if (node.tag) disposeNameTag(node.tag);
      dinoNodes.clear();
      eggNodes.clear();
      bursts.length = 0;
      layer.clear();
      bitGeometry.dispose();
      for (const m of bitMaterials.values()) m.dispose();
      bitMaterials.clear();
      disposeDinoModels();
    },
  };
}
