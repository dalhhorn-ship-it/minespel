// Builders of old save records, from the legacy generator (V15a, decision 138).
// `save070()` is the shape 0.7.0 wrote (terrain version 2); `save040()` is a 0.4.0 save (no `terrainVersion`).
// Shapes are written out by hand on purpose: they freeze what 0.7.0 saved, so a later change to the
// serializers does not change the fixture. `tests/unit/old-saves-fixture.test.ts` proves them against the 0.7.0 code.
// `backupV060()` and `backupV070()` (V15c) wrap them as format 1 backup files.
import type {
  DinosRecord, EconomyRecord, KnightRecord, MonstersRecord, PlayerRecord, SettingsRecord, VillageRecord, WorldRecord,
} from '../../../src/storage/schema';
import { AIR, GLAS, GRAS, PLANKEN, SMARAGD, STEEN, WOL_ROOD, OBSIDIAAN, VUUR, LAVA } from '../../../src/world/blocks';
import { LEGACY_SEED, generateLegacyTerrain, legacyCellIndex } from '../../../src/world/terrain-legacy';

/** One block change in legacy coordinates. */
export type Change = readonly [x: number, y: number, z: number, id: number];

export interface OldSave {
  world: WorldRecord;
  player: PlayerRecord;
  dinos: DinosRecord;
  economy: EconomyRecord;
  village: VillageRecord;
  monsters: MonstersRecord;
  settings: SettingsRecord;
  /** The `set` calls the world diff was made from, in order. */
  changes: readonly Change[];
}

/** The start world a save of this terrain version is a diff against. */
function baseWorld(version: 1 | 2): Uint8Array {
  return generateLegacyTerrain(LEGACY_SEED, version);
}

/** Top solid y of a column of the base world, ignoring trees. */
function groundY(base: Uint8Array, x: number, z: number): number {
  for (let y = 63; y > 0; y--) {
    const b = base[legacyCellIndex(x, y, z)] ?? AIR;
    if (b !== AIR && b !== 6 && b !== 8) return y;
  }
  return 0;
}

/** A 5 x 5 planken hut with a door in the middle of the front (+z) wall, walls 3 high, flat roof. Floor on the highest ground. */
export function hutChanges(base: Uint8Array, x0: number, z0: number): Change[] {
  let floor = 0;
  for (let z = z0; z < z0 + 5; z++) for (let x = x0; x < x0 + 5; x++) floor = Math.max(floor, groundY(base, x, z));
  const out: Change[] = [];
  for (let z = z0; z < z0 + 5; z++) {
    for (let x = x0; x < x0 + 5; x++) {
      const edge = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4;
      out.push([x, floor, z, PLANKEN]);
      for (let h = 1; h <= 3; h++) {
        const door = x === x0 + 2 && z === z0 + 4 && h <= 2;
        out.push([x, floor + h, z, door ? AIR : edge ? PLANKEN : AIR]);
      }
      out.push([x, floor + 4, z, PLANKEN]);
    }
  }
  return out;
}

/** Turns changes into a saved diff against `base`: `index * 256 + id`, in cell order, only cells that differ. The last change of a cell wins. */
export function legacyDiff(base: Uint8Array, changes: readonly Change[]): Uint32Array {
  const cells = new Map<number, number>();
  for (const [x, y, z, id] of changes) cells.set(legacyCellIndex(x, y, z), id);
  const out: number[] = [];
  for (const i of [...cells.keys()].sort((a, b) => a - b)) {
    const id = cells.get(i) as number;
    if (id !== base[i]) out.push(i * 256 + id);
  }
  return Uint32Array.from(out);
}

function dinoRecord(
  id: string, kind: string, name: string, mode: 'follow' | 'stay', x: number, y: number, z: number,
  stay: { x: number; z: number } | null,
): Record<string, unknown> {
  return {
    id, kind, golden: false, name, mode, x, y, z, heading: 1.5, growth: 2,
    stayX: stay ? stay.x : x, stayZ: stay ? stay.z : z,
  };
}

/** The 0.7.0 save. The hut stands at (38, 18), clear of the three village sites. */
export function save070(): OldSave {
  const base = baseWorld(2);
  const gy = (x: number, z: number): number => groundY(base, x, z);
  const changes: Change[] = [...hutChanges(base, 38, 18)];
  // Six mined holes.
  for (const [x, z] of [[50, 50], [51, 50], [52, 50], [50, 51], [51, 51], [52, 51]] as const) changes.push([x, gy(x, z), z, AIR]);
  // A placed smaragd.
  changes.push([36, gy(36, 40) + 1, 40, SMARAGD]);
  const y = gy(36, 25) + 1;
  const knight = (id: string, mode: 'stay' | 'guard', x: number, z: number): KnightRecord => ({
    id, mode, spot: { x, y: gy(Math.floor(x), Math.floor(z)) + 1, z }, boughtFor: 30,
  });
  return {
    changes,
    world: { diff: legacyDiff(base, changes), terrainVersion: 2 },
    player: {
      x: 36.5, y, z: 25.5, yaw: 0.8, pitch: -0.2,
      hotbar: [GRAS, STEEN, OBSIDIAAN, VUUR, LAVA, PLANKEN, GLAS, WOL_ROOD], selectedSlot: 2, mode: 'build',
    },
    dinos: {
      dinos: [
        dinoRecord('dino-1', 'compy', 'Pip', 'follow', 35.5, y, 26.5, null),
        dinoRecord('dino-2', 'triceratops', 'Tri', 'follow', 34.5, y, 27.5, null),
        dinoRecord('dino-3', 'stegosaurus', 'Stego', 'stay', 28.5, gy(28, 30) + 1, 30.5, { x: 28.5, z: 30.5 }),
        dinoRecord('dino-4', 'brachiosaurus', 'Brach', 'stay', 40.5, gy(40, 44) + 1, 44.5, { x: 41.5, z: 43.5 }),
        dinoRecord('dino-5', 'compy', 'Kleintje', 'stay', 20.5, gy(20, 20) + 1, 20.5, { x: 22.5, z: 21.5 }),
        dinoRecord('kip-1', 'kip', '', 'stay', 33.5, gy(33, 30) + 1, 30.5, { x: 33.5, z: 30.5 }),
        dinoRecord('kip-2', 'kip', '', 'stay', 34.5, gy(34, 30) + 1, 31.5, { x: 35.5, z: 31.5 }),
        dinoRecord('kip-3', 'kip', '', 'stay', 31.5, gy(31, 31) + 1, 29.5, { x: 31.5, z: 29.5 }),
      ],
      eggs: [
        { id: 'egg-1', kind: 'compy', golden: false, x: 37.5, y: gy(37, 27) + 1, z: 27.5, playSeconds: 60 },
        { id: 'egg-2', kind: 'triceratops', golden: true, x: 38.5, y: gy(38, 28) + 1, z: 28.5, playSeconds: 5 },
      ],
      staySwitched: true,
    },
    economy: { points: 142, practicePointsToday: 12, practiceDay: '2026-11-10', fluit: true },
    village: { found: [34, 36], cooldownMs: 45000, lastVillager: 'noord-1' },
    monsters: {
      knights: [knight('ridder-1', 'stay', 30.5, 34.5), knight('ridder-2', 'guard', 42.5, 22.5)],
      bubbleClockMs: 123456,
      hintShown: true,
    },
    settings: {
      breakEveryMinutes: 10, questionsPerBreak: 5, volume: 0.7, largeFont: false, newLessonsEnabled: true,
      breakWarningEnabled: true, soundEffectsEnabled: true, pointsMode: 'normaal',
      monstersEnabled: true, knightsEnabled: true, bubbleEnabled: false,
    },
  };
}

/** The 0.4.0 save: a diff against terrain version 1 with no `terrainVersion`. The hut is at (38, 18); one change is inside site oost. */
export function save040(): OldSave {
  const base = baseWorld(1);
  const changes: Change[] = [...hutChanges(base, 38, 18)];
  // Site oost is x 47 to 58, z 30 to 37 (plus 2 margin). High up in the air, so it differs from the version 1 world.
  changes.push([50, 30, 33, PLANKEN]);
  const y = groundY(base, 36, 25) + 1;
  return {
    changes,
    world: { diff: legacyDiff(base, changes) },
    player: {
      x: 36.5, y, z: 25.5, yaw: 0.8, pitch: -0.2,
      hotbar: [GRAS, STEEN, OBSIDIAAN, VUUR, LAVA, PLANKEN, GLAS, WOL_ROOD], selectedSlot: 0, mode: 'mine',
    },
    dinos: { dinos: [], eggs: [] },
    economy: { points: 20, practicePointsToday: 0, practiceDay: '' },
    village: { found: [], cooldownMs: 0, lastVillager: null },
    monsters: { knights: [], bubbleClockMs: 0, hintShown: false },
    settings: {
      breakEveryMinutes: 5, questionsPerBreak: 5, volume: 0.7, largeFont: false, newLessonsEnabled: true,
      breakWarningEnabled: true, soundEffectsEnabled: true,
    },
  };
}

/** A diff as a backup file writes it: `{ "$u32": base64 }`, little endian. */
function encodeDiff(diff: Uint32Array): { $u32: string } {
  const bytes = new Uint8Array(diff.length * 4);
  const view = new DataView(bytes.buffer);
  diff.forEach((n, i) => view.setUint32(i * 4, n, true));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return { $u32: btoa(bin) };
}

function backupText(appVersion: string, createdAt: string, save: OldSave, withMonsters: boolean): string {
  const settings: Record<string, unknown> = { ...save.settings };
  if (!withMonsters) for (const k of ['monstersEnabled', 'knightsEnabled', 'bubbleEnabled']) delete settings[k];
  const kv: Record<string, unknown> = {
    settings,
    player: save.player,
    world: { diff: encodeDiff(save.world.diff), terrainVersion: 2 },
    dinos: save.dinos,
    economy: save.economy,
    village: save.village,
    meta: { schemaVersion: 1, appVersion, lastBackup: null, createdAt },
  };
  if (withMonsters) kv.monsters = save.monsters;
  return JSON.stringify({ app: 'dino-blokwereld', format: 1, createdAt, appVersion, schemaVersion: 1, kv, stores: {} });
}

/** The text of a backup file made by 0.6.0: format 1, terrain version 2, no knights, no monsters record. */
export function backupV060(): string {
  return backupText('0.6.0', '2026-11-12T09:00:00.000Z', save070(), false);
}

/** The text of a backup file made by 0.7.0: format 1, terrain version 2, 2 knights with spots. */
export function backupV070(): string {
  return backupText('0.7.0', '2026-11-20T09:15:00.000Z', save070(), true);
}
