// A villager (v11 Dorp, V11c): shaped like a dino in `stay` mode, so dino-ai.ts can walk it.
// It is not a dino: it has no kind, no store entry, no shop and no place in the 12 dino cap.
// Positions are never saved. Every load starts at the home spot.
import { GROW_SECONDS } from '../dinos/egg';
import type { DinoState } from '../dinos/dino-ai';
import { RARE_BLOCKS } from '../world/blocks';
import { VILLAGE_SITES, type HomeSpot } from '../world/village-layout';

export type HatStyle = 'cap' | 'hair' | 'tall' | 'band' | 'bun' | 'crown' | 'spikes' | 'bald';

/** What makes one villager different from the next: shirt colour plus a hat or hair. */
export interface VillagerLook {
  shirt: number;
  pants: number;
  skin: number;
  hat: number;
  style: HatStyle;
}

/** Eight looks, each with its own shirt colour. The order is the order of the homes in the layout. */
export const VILLAGER_LOOKS: readonly VillagerLook[] = [
  { shirt: 0xe53935, pants: 0x37474f, skin: 0xf1c27d, hat: 0x6d4c41, style: 'cap' },
  { shirt: 0x1e88e5, pants: 0x4e342e, skin: 0xc68642, hat: 0x212121, style: 'hair' },
  { shirt: 0x43a047, pants: 0x283593, skin: 0xffdbac, hat: 0xfdd835, style: 'tall' },
  { shirt: 0xfdd835, pants: 0x1565c0, skin: 0x8d5524, hat: 0xd81b60, style: 'band' },
  { shirt: 0x8e24aa, pants: 0x424242, skin: 0xf1c27d, hat: 0xff7043, style: 'bun' },
  { shirt: 0xfb8c00, pants: 0x00695c, skin: 0xe0ac69, hat: 0xffd54f, style: 'crown' },
  { shirt: 0x26c6da, pants: 0x5d4037, skin: 0xffdbac, hat: 0x8bc34a, style: 'spikes' },
  { shirt: 0xf06292, pants: 0x303f9f, skin: 0xc68642, hat: 0xeeeeee, style: 'bald' },
];

/** The body box of a villager (a bit slimmer than a block, a bit under 2 blocks tall). */
export const VILLAGER_BOX = { side: 0.6, height: 1.8 } as const;
/** Villagers wander at most this far from home (the PRD says 3; the walk stops a little short of it). */
export const VILLAGER_WANDER = 2.7;
export const DANCE_SECONDS = 2;

export interface VillagerState extends DinoState {
  id: string;
  site: string;
  /** Where it starts and wanders around (feet position). */
  home: HomeSpot;
  look: VillagerLook;
  /** The rare block this villager's question gives. */
  gives: number;
  /** Seconds of dance left; 0 when not dancing. The dance moves the model only. */
  danceLeft: number;
  /** Seconds the villager has been alive in the scene, for the waving. */
  clock: number;
  /** True while it waves at a player who is close. */
  waving: boolean;
}

export function createVillager(id: string, site: string, home: HomeSpot, index: number): VillagerState {
  const look = VILLAGER_LOOKS[index % VILLAGER_LOOKS.length] as VillagerLook;
  return {
    // The dino fields the walking code needs. `compy` is only a placeholder: the box comes from the caller.
    kind: 'compy', golden: false, mode: 'stay',
    x: home.x, y: home.y, z: home.z, vy: 0, onGround: false, heading: 0,
    growth: GROW_SECONDS, stayX: home.x, stayZ: home.z,
    goal: null, idleLeft: 1 + index * 0.3, goalLeft: 0, stuckTime: 0, farTime: 0, chasing: false,
    id, site, home: { ...home }, look, gives: RARE_BLOCKS[index] as number,
    danceLeft: 0, clock: 0, waving: false,
  };
}

/** The 8 villagers, from the home spots of the three sites (3, 3 and 2). */
export function createVillagers(): VillagerState[] {
  const out: VillagerState[] = [];
  for (const site of VILLAGE_SITES) {
    for (const home of site.homes) out.push(createVillager(`v${out.length + 1}`, site.id, home, out.length));
  }
  return out;
}
