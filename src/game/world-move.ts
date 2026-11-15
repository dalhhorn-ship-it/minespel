// The one time move of an old save into the big world (v15, decisions 124, 138). Pure: no storage here.
// A 0.7.0 save is a diff against the legacy 64 x 64 x 64 world. The big world holds that world as its middle,
// moved by MOVE, so every kid changed cell, every spot and every home moves by the same step.
// A 0.4.0 save (terrain version 1) first gets the villages stamped in, in legacy coordinates (AC179, AC236).
import type { DinosRecord, MonstersRecord, PlayerRecord, WorldRecord } from '../storage/schema';
import { LEGACY_CELL_COUNT, LEGACY_SEED, LEGACY_SIZE, generateLegacyTerrain, legacyCellIndex } from '../world/terrain-legacy';
import { MOVE, startWorld, v3CellIndex } from '../world/terrain-v3';
import { LEGACY_VILLAGE_SITES, siteRegion, type VillageSite } from '../world/village-layout';
import { cleanDiff } from './world-save';

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const isObj = (o: unknown): o is Record<string, unknown> => typeof o === 'object' && o !== null && !Array.isArray(o);

/** A spot where the player, a dino, an egg or a chicken stands (only x and z matter). */
export interface StandingSpot {
  x: number;
  z: number;
}

/** Bodies are up to about 2 blocks long, so a spot this close to a site also blocks it. */
export const STANDING_SLACK = 2;

export interface VillageUpgrade {
  /** The new diff against terrain version 2 (legacy coordinates). */
  diff: number[];
  /** Per site in LEGACY_VILLAGE_SITES order: true when its houses were stamped in. */
  stamped: boolean[];
}

/** True when the old diff (against version 1) has any cell in the site, at any height, or someone stands in or next to it. */
export function siteBlocked(site: VillageSite, oldDiff: readonly number[], standing: readonly StandingSpot[]): boolean {
  const r = siteRegion(site);
  for (const e of oldDiff) {
    const index = Math.floor(e / 256);
    const x = index % LEGACY_SIZE;
    const z = Math.floor(index / LEGACY_SIZE) % LEGACY_SIZE;
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
  }
  return standing.some(
    (p) => p.x >= r.x0 - STANDING_SLACK && p.x < r.x1 + 1 + STANDING_SLACK && p.z >= r.z0 - STANDING_SLACK && p.z < r.z1 + 1 + STANDING_SLACK,
  );
}

/**
 * Pure, legacy coordinates. Rebuilds the kid's real world (version 1 terrain plus the old diff), puts the village of
 * every legacy site that is not blocked into it, and returns the diff of that world against legacy version 2.
 * `standing` is in legacy coordinates too.
 */
export function upgradeV1World(
  oldDiff: readonly number[],
  standing: readonly StandingSpot[],
  options: { seed?: number; stamp?: boolean } = {},
): VillageUpgrade {
  const seed = options.seed ?? LEGACY_SEED;
  const real = generateLegacyTerrain(seed, 1);
  for (const e of oldDiff) {
    const index = Math.floor(e / 256);
    if (index >= 0 && index < LEGACY_CELL_COUNT) real[index] = e % 256;
  }
  const v2 = generateLegacyTerrain(seed, 2);
  const stamped = LEGACY_VILLAGE_SITES.map((site) => options.stamp !== false && !siteBlocked(site, oldDiff, standing));
  LEGACY_VILLAGE_SITES.forEach((site, k) => {
    if (!stamped[k]) return;
    const r = siteRegion(site);
    for (let z = Math.max(0, r.z0); z <= Math.min(LEGACY_SIZE - 1, r.z1); z++) {
      for (let x = Math.max(0, r.x0); x <= Math.min(LEGACY_SIZE - 1, r.x1); x++) {
        for (let y = 0; y < 64; y++) {
          const i = legacyCellIndex(x, y, z);
          real[i] = v2[i] ?? 0;
        }
      }
    }
  });
  const diff: number[] = [];
  for (let i = 0; i < LEGACY_CELL_COUNT; i++) {
    const b = real[i] ?? 0;
    if (b !== v2[i]) diff.push(i * 256 + b);
  }
  return { diff, stamped };
}

/** The spots of the saved player, dinos, eggs and chickens (legacy coordinates). Anything broken is left out. */
export function standingSpots(player: unknown, dinos: unknown): StandingSpot[] {
  const out: StandingSpot[] = [];
  const p = player as Partial<PlayerRecord> | null;
  if (p && isNum(p.x) && isNum(p.y) && isNum(p.z) && p.y > 0) out.push({ x: p.x, z: p.z });
  const d = dinos as { dinos?: unknown; eggs?: unknown } | null;
  for (const list of [d?.dinos, d?.eggs]) {
    if (!Array.isArray(list)) continue;
    for (const e of list as { x?: unknown; z?: unknown }[]) {
      if (e && isNum(e.x) && isNum(e.z)) out.push({ x: e.x, z: e.z });
    }
  }
  return out;
}

/**
 * Moves a legacy version 2 diff into the big world. Each entry is decoded with the legacy index, moved, and kept
 * when its block differs from `start` at the new index. Sorted by index. Entries outside the legacy world are dropped.
 */
export function moveLegacyDiff(oldDiff: readonly number[], start: Uint8Array = startWorld(LEGACY_SEED)): number[] {
  const cells = new Map<number, number>();
  for (const e of oldDiff) {
    const index = Math.floor(e / 256);
    if (!Number.isInteger(e) || e < 0 || index >= LEGACY_CELL_COUNT) continue;
    const x = index % LEGACY_SIZE;
    const z = Math.floor(index / LEGACY_SIZE) % LEGACY_SIZE;
    const y = Math.floor(index / (LEGACY_SIZE * LEGACY_SIZE));
    cells.set(v3CellIndex(x + MOVE.x, y + MOVE.y, z + MOVE.z), e % 256);
  }
  const out: number[] = [];
  for (const i of [...cells.keys()].sort((a, b) => a - b)) {
    const b = cells.get(i) as number;
    if (b !== start[i]) out.push(i * 256 + b);
  }
  return out;
}

/** A point of the legacy world, moved. */
export function movePoint<T extends { x: number; y: number; z: number }>(p: T): T {
  return { ...p, x: p.x + MOVE.x, y: p.y + MOVE.y, z: p.z + MOVE.z };
}

/** Adds the step to the named numeric fields of a record that are numbers. Every other field is kept. */
function shift(raw: Record<string, unknown>, step: Partial<Record<string, number>>): Record<string, unknown> {
  const out = { ...raw };
  for (const [key, by] of Object.entries(step)) {
    const v = out[key];
    if (isNum(v)) out[key] = v + (by as number);
  }
  return out;
}

export interface OldRecords {
  /** The saved `world` record, or undefined when there is none (a 0.6.0 save: version 1, empty diff). */
  world?: unknown;
  player?: unknown;
  dinos?: unknown;
  monsters?: unknown;
}

export interface MovedRecords {
  world: WorldRecord;
  player?: unknown;
  dinos?: unknown;
  monsters?: unknown;
}

/**
 * Returns the records of an old save moved into the big world. Records that were not given come back undefined.
 * Records that are not objects are left as they are. Unknown fields stay.
 */
export function moveRecords(input: OldRecords, start: Uint8Array = startWorld(LEGACY_SEED)): MovedRecords {
  const rawWorld = isObj(input.world) ? input.world : {};
  const version = isNum(rawWorld.terrainVersion) ? rawWorld.terrainVersion : 1;
  let oldDiff = cleanDiff(rawWorld.diff, LEGACY_CELL_COUNT);
  if (version < 2) oldDiff = upgradeV1World(oldDiff, standingSpots(input.player, input.dinos)).diff;
  const world: WorldRecord = { ...(rawWorld as Partial<WorldRecord>), diff: Uint32Array.from(moveLegacyDiff(oldDiff, start)), terrainVersion: 3 };

  let player = input.player;
  if (isObj(player) && isNum(player.y) && player.y > 0) {
    player = shift(player, { x: MOVE.x, y: MOVE.y, z: MOVE.z });
  }

  let dinos = input.dinos;
  if (isObj(dinos)) {
    const step = { x: MOVE.x, y: MOVE.y, z: MOVE.z };
    const moved = { ...dinos };
    if (Array.isArray(dinos.dinos)) {
      moved.dinos = (dinos.dinos as unknown[]).map((d) => (isObj(d) ? shift(d, { ...step, stayX: MOVE.x, stayZ: MOVE.z }) : d));
    }
    if (Array.isArray(dinos.eggs)) {
      moved.eggs = (dinos.eggs as unknown[]).map((e) => (isObj(e) ? shift(e, step) : e));
    }
    dinos = moved as unknown as DinosRecord;
  }

  let monsters = input.monsters;
  if (isObj(monsters) && Array.isArray(monsters.knights)) {
    const knights = (monsters.knights as unknown[]).map((k) =>
      isObj(k) && isObj(k.spot) ? { ...k, spot: shift(k.spot, { x: MOVE.x, y: MOVE.y, z: MOVE.z }) } : k,
    );
    monsters = { ...monsters, knights } as unknown as MonstersRecord;
  }
  return { world, player, dinos, monsters };
}
