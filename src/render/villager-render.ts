// Syncs the live villagers to a Three.js Group (V11c), like dino-render.ts.
// Game state never lives in Three.js objects. The dance and the wave move the model only:
// hops (body up), spins (root yaw), tilts and raised arms.
import { Group } from 'three';
import { DANCE_SECONDS, type VillagerState } from '../villagers/villager';
import { createVillagerModel, disposeVillagerModels, type VillagerModel } from './villager-models';

export interface VillagerSceneSync {
  readonly group: Group;
  sync(villagers: readonly VillagerState[]): void;
  clear(): void;
  dispose(): void;
}

const HOPS_PER_SECOND = 1.5;
const HOP_HEIGHT = 0.6;
const SPINS = 2;
const ARM_UP = 2.7;

/** The dance pose for a villager `t` seconds into its dance. Pure, so it can be tested. */
export function dancePose(t: number): { lift: number; spin: number; tilt: number; arm: number } {
  const p = Math.min(1, Math.max(0, t / DANCE_SECONDS));
  return {
    lift: Math.abs(Math.sin(t * Math.PI * HOPS_PER_SECOND)) * HOP_HEIGHT,
    spin: p * Math.PI * 2 * SPINS,
    tilt: Math.sin(t * 12) * 0.25,
    arm: ARM_UP + Math.sin(t * 16) * 0.5,
  };
}

function pose(m: VillagerModel, v: VillagerState): void {
  if (v.danceLeft > 0) {
    const d = dancePose(DANCE_SECONDS - v.danceLeft);
    m.body.position.y = d.lift;
    m.body.rotation.z = d.tilt;
    m.root.rotation.y = v.heading + d.spin;
    m.armRight.rotation.z = d.arm;
    m.armLeft.rotation.z = -d.arm;
    return;
  }
  m.body.position.y = 0;
  m.body.rotation.z = 0;
  m.root.rotation.y = v.heading;
  m.armLeft.rotation.z = Math.sin(v.clock * 1.5) * 0.05;
  m.armRight.rotation.z = v.waving ? 2.4 + Math.sin(v.clock * 9) * 0.5 : -Math.sin(v.clock * 1.5) * 0.05;
}

export function createVillagerSceneSync(): VillagerSceneSync {
  const root = new Group();
  const entries = new Map<string, VillagerModel>();

  return {
    group: root,
    sync(villagers) {
      const seen = new Set<string>();
      for (const v of villagers) {
        seen.add(v.id);
        let m = entries.get(v.id);
        if (!m) {
          m = createVillagerModel(v.look);
          root.add(m.root);
          entries.set(v.id, m);
        }
        m.root.position.set(v.x, v.y, v.z);
        pose(m, v);
      }
      for (const [id, m] of entries) {
        if (!seen.has(id)) {
          root.remove(m.root);
          entries.delete(id);
        }
      }
    },
    clear() {
      for (const m of entries.values()) root.remove(m.root);
      entries.clear();
    },
    dispose() {
      this.clear();
      disposeVillagerModels();
    },
  };
}
