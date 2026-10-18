// Syncs live WorldDinos and WorldEggs to a Three.js Group (T42, AC12, AC18).
// Game state never lives in Three.js objects; `sync(dinos, eggs)` updates transforms, growth scale, and name tags.

import { Group, type Sprite } from 'three';
import type { WorldDino, WorldEgg } from '../dinos/dino-store';
import { EGG_HATCH_SECONDS, growthScale } from '../dinos/egg';
import { DINO_KINDS } from '../dinos/kinds';
import {
  createDinoModel,
  createEggModel,
  disposeDinoModels,
} from './dino-models';
import { createNameTagSprite, disposeNameTag } from './name-tag';

export interface DinoSceneSync {
  readonly group: Group;
  sync(dinos: readonly WorldDino[], eggs: readonly WorldEgg[]): void;
  clear(): void;
  dispose(): void;
}

interface DinoEntry {
  group: Group;
  model: Group;
  name: string;
  tag: Sprite | null;
}

export function createDinoSceneSync(doc?: Document): DinoSceneSync {
  const root = new Group();
  const dinoEntries = new Map<string, DinoEntry>();
  const eggEntries = new Map<string, Group>();

  function removeDinoEntry(entry: DinoEntry) {
    if (entry.tag) {
      entry.group.remove(entry.tag);
      disposeNameTag(entry.tag);
    }
    root.remove(entry.group);
  }

  return {
    group: root,
    sync(dinos, eggs) {
      const seenDinos = new Set<string>();
      for (const d of dinos) {
        seenDinos.add(d.id);
        let entry = dinoEntries.get(d.id);
        if (!entry) {
          const holder = new Group();
          const model = createDinoModel(d.kind, { golden: d.golden, baby: false });
          holder.add(model);
          root.add(holder);
          entry = { group: holder, model, name: '', tag: null };
          dinoEntries.set(d.id, entry);
        }
        const scale = growthScale(d.growth);
        entry.model.scale.set(scale, scale, scale);
        entry.group.position.set(d.x, d.y, d.z);
        entry.model.rotation.y = d.heading;

        if (entry.name !== d.name) {
          if (entry.tag) {
            entry.group.remove(entry.tag);
            disposeNameTag(entry.tag);
            entry.tag = null;
          }
          entry.name = d.name;
          if (d.name && typeof document !== 'undefined') {
            const sprite = createNameTagSprite(d.name, doc ?? document);
            if (sprite) {
              entry.tag = sprite;
              entry.group.add(sprite);
            }
          }
        }
        if (entry.tag) {
          const h = DINO_KINDS[d.kind].size.h * scale;
          entry.tag.position.set(0, h + 0.35, 0);
        }
      }

      for (const [id, entry] of dinoEntries) {
        if (!seenDinos.has(id)) {
          removeDinoEntry(entry);
          dinoEntries.delete(id);
        }
      }

      const seenEggs = new Set<string>();
      for (const e of eggs) {
        seenEggs.add(e.id);
        let eggGroup = eggEntries.get(e.id);
        if (!eggGroup) {
          eggGroup = createEggModel(e.kind, e.golden);
          root.add(eggGroup);
          eggEntries.set(e.id, eggGroup);
        }
        eggGroup.position.set(e.x, e.y, e.z);
        // Gentle wobble in the final 1.5 seconds before hatching
        const left = EGG_HATCH_SECONDS - e.playSeconds;
        eggGroup.rotation.z = left < 1.5 && left > 0 ? Math.sin(e.playSeconds * 18) * 0.12 : 0;
      }

      for (const [id, eggGroup] of eggEntries) {
        if (!seenEggs.has(id)) {
          root.remove(eggGroup);
          eggEntries.delete(id);
        }
      }
    },
    clear() {
      for (const entry of dinoEntries.values()) removeDinoEntry(entry);
      dinoEntries.clear();
      for (const eggGroup of eggEntries.values()) root.remove(eggGroup);
      eggEntries.clear();
    },
    dispose() {
      this.clear();
      disposeDinoModels();
    },
  };
}
