// Draws creature actors (knights, Klodder, the bubble and the mole) into one Group per group name.
// Game state never lives here: the game hands over `ActorView`s every frame, meshes are cached per id and built
// by the model file of each kind (decision 135). 
import { Group } from 'three';
import { createKnightModel } from './knight-model';
import { createBubbleModel, createKlodderModel } from './klodder-model';
import { createMoleModel } from './mole-model';

export type ActorGroup = 'knights' | 'monsters';

/** What the renderer needs to draw one creature. */
export interface ActorView {
  id: string;
  model: 'knight' | 'klodder' | 'bubble' | 'mole';
  x: number;
  y: number;
  z: number;
  /** Facing in radians, 0 looks towards +z. */
  heading: number;
  scale?: number;
  /** A name the model file understands, for example 'march' or 'wave'. */
  pose?: string;
  /** The gear set of a knight: the sorted worn ids joined by `+`, empty or missing for a bare knight (v19). */
  look?: string;
}

/** A built model: a root to place and turn, and a way to set its pose. */
export interface ActorModel {
  root: Group;
  setPose(pose: string | undefined, time: number): void;
  dispose(): void;
}

const BUILDERS: Partial<Record<ActorView['model'], () => ActorModel>> = {
  knight: createKnightModel,
  klodder: createKlodderModel,
  bubble: createBubbleModel,
  mole: createMoleModel,
};

export interface ActorSceneSync {
  readonly group: Group;
  sync(group: ActorGroup, actors: readonly ActorView[]): void;
  dispose(): void;
}

export function createActorSceneSync(): ActorSceneSync {
  const root = new Group();
  const parts = new Map<ActorGroup, { group: Group; models: Map<string, { kind: ActorView['model']; model: ActorModel }> }>();
  let time = 0;

  function part(name: ActorGroup) {
    let p = parts.get(name);
    if (!p) {
      p = { group: new Group(), models: new Map() };
      root.add(p.group);
      parts.set(name, p);
    }
    return p;
  }

  return {
    group: root,
    sync(name, actors) {
      const p = part(name);
      time += 1 / 60;
      const seen = new Set<string>();
      for (const a of actors) {
        let entry = p.models.get(a.id);
        if (entry && entry.kind !== a.model) {
          p.group.remove(entry.model.root);
          entry.model.dispose();
          p.models.delete(a.id);
          entry = undefined;
        }
        if (!entry) {
          const build = BUILDERS[a.model];
          if (!build) continue;
          entry = { kind: a.model, model: build() };
          p.group.add(entry.model.root);
          p.models.set(a.id, entry);
        }
        seen.add(a.id);
        const r = entry.model.root;
        r.position.set(a.x, a.y, a.z);
        r.rotation.y = a.heading;
        const k = a.scale ?? 1;
        r.scale.set(k, k, k);
        entry.model.setPose(a.pose, time);
      }
      for (const [id, entry] of p.models) {
        if (!seen.has(id)) {
          p.group.remove(entry.model.root);
          entry.model.dispose();
          p.models.delete(id);
        }
      }
    },
    dispose() {
      for (const p of parts.values()) {
        for (const entry of p.models.values()) entry.model.dispose();
        p.models.clear();
        p.group.clear();
      }
      parts.clear();
      root.clear();
    },
  };
}
