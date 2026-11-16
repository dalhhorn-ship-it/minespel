// Schema of the one IndexedDB database. Every store and every `kv` record is defined here,
// with defaults, so later tasks do not change the schema. A change bumps SCHEMA_VERSION,
// adds a step in migrate.ts and a fixture of the old shape in tests/fixtures/saves/.

export const DB_NAME = 'dino-blokwereld';
export const SCHEMA_VERSION = 2;

export const STORE_NAMES = ['kv', 'progress', 'answers', 'breaks', 'exams', 'ledger', 'ownModules'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface StoreDef {
  name: StoreName;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string }[];
}

/** kv, progress and ownModules use out of line keys (put(value, key)); log stores use auto ids. */
export const STORE_DEFS: StoreDef[] = [
  { name: 'kv' },
  { name: 'progress' },
  {
    name: 'answers',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'ts', keyPath: 'ts' },
      { name: 'moduleId', keyPath: 'moduleId' },
    ],
  },
  { name: 'breaks', keyPath: 'id', autoIncrement: true },
  { name: 'exams', keyPath: 'id', autoIncrement: true },
  { name: 'ledger', keyPath: 'id', autoIncrement: true },
  { name: 'ownModules' },
];

// ---- kv records ----

export const KV_NAMES = [
  'settings',
  'player',
  'world',
  'worldV1',
  'dinos',
  'economy',
  'timers',
  'rotation',
  'switches',
  'session',
  'gate',
  'stats',
  'meta',
  'village',
  'monsters',
] as const;
export type KvName = (typeof KV_NAMES)[number];

export interface SettingsRecord {
  breakEveryMinutes: number;
  questionsPerBreak: number;
  volume: number;
  largeFont: boolean;
  /** "Nieuwe lessen en vragen": off means only review. */
  newLessonsEnabled: boolean;
  /** "Waarschuwing voor de pauze" (pulse and tick). */
  breakWarningEnabled: boolean;
  /** "Geluidseffecten". */
  soundEffectsEnabled: boolean;
  /** "Punten": what a mistake costs (v10). Missing in a save from 0.3.0, read as 'normaal'. */
  pointsMode?: 'makkelijk' | 'normaal' | 'moeilijk';
  /** "Monsters en ridders" master switch (v17). Missing reads as Aan. */
  monstersEnabled?: boolean;
  /** "Ridders" (v17). Missing reads as Aan. */
  knightsEnabled?: boolean;
  /** "Zwarte bubbel" (v18). Missing reads as Uit; the first start rule sets it (decision 135). */
  bubbleEnabled?: boolean;
  /** "Monstermol" (v16). Missing reads as Aan, so a new install, an old install and an old backup all give Aan. */
  moleEnabled?: boolean;
  /** "Kijkafstand" (v15, AC243). Missing reads as Ver. */
  viewDistance?: 'ver' | 'dichtbij';
  [key: string]: unknown;
}
export interface PlayerRecord {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  hotbar: number[];
  selectedSlot: number;
  mode: 'mine' | 'build';
}
export interface WorldRecord {
  /** Changed cells as cellIndex * 256 + blockId. */
  diff: Uint32Array;
  /** The terrain the diff is against (v11). Missing means 1, the world of 0.4.0 and earlier. */
  terrainVersion?: number;
}
export interface DinosRecord {
  dinos: Record<string, unknown>[];
  eggs: Record<string, unknown>[];
  /** True once the one time switch of decision 122 ran: every saved animal was put on Blijf hier. Missing in older saves. */
  staySwitched?: boolean;
}
export interface EconomyRecord {
  points: number;
  practicePointsToday: number;
  practiceDay: string;
  /** True once the kid bought the Dinofluit (decision 114). Missing in older saves, which reads as not owned. */
  fluit?: boolean;
}
export interface TimersRecord {
  playMsLeft: number | null;
  examMsLeft: number | null;
}
export interface RotationRecord {
  weights: Record<string, number>;
  topicPointers: Record<string, number>;
  lessonsSeen: string[];
}
export interface SwitchesRecord {
  modules: Record<string, unknown>;
  [key: string]: unknown;
}
export type SessionRecord = Record<string, unknown> | null;
export interface GateRecord {
  salt: string;
  pinHash: string;
  wrongTries: number;
  blockedUntil: number;
  resetWrongTries: number;
}
export interface StatsRecord {
  /** Play milliseconds per local calendar day ("2026-10-17"). */
  playMsPerDay: Record<string, number>;
}
export interface MetaRecord {
  schemaVersion: number;
  appVersion: string;
  lastBackup: string | null;
  createdAt: string | null;
}

/** v11 Dorp: the rare blocks the kid found, the cooldown left and who asked last. Not part of the world. */
export interface VillageRecord {
  /** Found rare block ids (34 to 41). */
  found: number[];
  /** Milliseconds of play time before the next villager may ask. */
  cooldownMs: number;
  /** Id of the villager who asked last, or null. */
  lastVillager: string | null;
}

export type KnightMode = 'follow' | 'stay' | 'guard';
export const KNIGHT_MODES: readonly KnightMode[] = ['follow', 'stay', 'guard'];

/** One bought knight. Only mode and spot are saved, never the live position (decision 135). */
export interface KnightRecord {
  id: string;
  mode: KnightMode;
  /** Where a stay or guard knight stands. Null for a follower. */
  spot: { x: number; y: number; z: number } | null;
  /** Points paid, so a trade in can be checked later. */
  boughtFor: number;
}

/** v17 Ridders and v18 Zwarte bubbel: the knights, the bubble clock and the hint flag. */
export interface MonstersRecord {
  knights: KnightRecord[];
  /** Play milliseconds since the last bubble, 0 to 600 000. */
  bubbleClockMs: number;
  hintShown: boolean;
}

export interface KvRecords {
  settings: SettingsRecord;
  player: PlayerRecord;
  world: WorldRecord;
  /** The world record of 0.4.0, copied unchanged before the villages were stamped in (v11). Null when there was none. Deleted in the release after v11. */
  worldV1: WorldRecord | null;
  dinos: DinosRecord;
  economy: EconomyRecord;
  timers: TimersRecord;
  rotation: RotationRecord;
  switches: SwitchesRecord;
  session: SessionRecord;
  gate: GateRecord;
  stats: StatsRecord;
  meta: MetaRecord;
  village: VillageRecord;
  monsters: MonstersRecord;
}

/** Fresh copies every call, so nobody shares or mutates a default. */
export const KV_DEFAULTS: { [K in KvName]: () => KvRecords[K] } = {
  settings: () => ({
    breakEveryMinutes: 5,
    questionsPerBreak: 5,
    volume: 0.7,
    largeFont: false,
    newLessonsEnabled: true,
    breakWarningEnabled: true,
    soundEffectsEnabled: true,
    pointsMode: 'normaal',
    monstersEnabled: true,
    knightsEnabled: true,
    bubbleEnabled: false,
  }),
  player: () => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hotbar: [], selectedSlot: 0, mode: 'mine' }),
  world: () => ({ diff: new Uint32Array(0) }),
  worldV1: () => null,
  dinos: () => ({ dinos: [], eggs: [] }),
  economy: () => ({ points: 0, practicePointsToday: 0, practiceDay: '' }),
  timers: () => ({ playMsLeft: null, examMsLeft: null }),
  rotation: () => ({ weights: {}, topicPointers: {}, lessonsSeen: [] }),
  switches: () => ({ modules: {} }),
  session: () => null,
  gate: () => ({ salt: '', pinHash: '', wrongTries: 0, blockedUntil: 0, resetWrongTries: 0 }),
  stats: () => ({ playMsPerDay: {} }),
  meta: () => ({ schemaVersion: SCHEMA_VERSION, appVersion: '', lastBackup: null, createdAt: null }),
  village: () => ({ found: [], cooldownMs: 0, lastVillager: null }),
  monsters: () => ({ knights: [], bubbleClockMs: 0, hintShown: false }),
};

export function defaultKv<K extends KvName>(name: K): KvRecords[K] {
  return KV_DEFAULTS[name]();
}
