// The full check of a backup file before anything is restored (AC130, AC195). Never throws.
// The save rules are reused from the code that enforces them, not copied.
import { MAX_CHICKENS, MAX_SHOP_DINOS, chickenCount, shopDinoCount } from '../core/economy';
import { cleanDiff } from '../game/world-save';
import { filterDinoNameDraft } from '../ui/name-screen';
import {
  BACKUP_APP, BACKUP_FORMAT, BACKUP_KV_NAMES, KEYED_STORES, LOG_STORES, MAX_BACKUP_BYTES, decodeValue,
  type BackupData, type BackupKvName,
} from './backup';
import { SCHEMA_VERSION, STORE_NAMES } from './schema';

export const MSG_TOO_BIG = 'Dit bestand is te groot voor een backup. Er is niets veranderd.';
export const MSG_NOT_JSON = 'Dit bestand is geen backup van Dino Blokwereld. Er is niets veranderd.';
export const MSG_WRONG_APP = 'Dit is geen backup van Dino Blokwereld. Er is niets veranderd.';
export const MSG_NEWER = 'Dit bestand is van een nieuwere versie. Werk de app bij.';
export const MSG_BAD_VALUES = 'In dit bestand staat iets wat niet klopt. Er is niets veranderd.';

export type BackupCheck = { ok: true; data: BackupData } | { ok: false; message: string };

const bad = (message: string): BackupCheck => ({ ok: false, message });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isWhole = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optional = (v: unknown, test: (x: unknown) => boolean): boolean => v === undefined || test(v);

function byteLength(text: string): number {
  // Every character is at least 1 byte and at most 3 bytes in UTF-8.
  if (text.length > MAX_BACKUP_BYTES) return text.length;
  if (text.length * 3 <= MAX_BACKUP_BYTES) return text.length;
  return new TextEncoder().encode(text).length;
}

function validSettings(s: Record<string, unknown>): boolean {
  return (
    optional(s.breakEveryMinutes, (v) => isWhole(v, 1) && (v as number) <= 120) &&
    optional(s.questionsPerBreak, (v) => isWhole(v, 1) && (v as number) <= 50) &&
    optional(s.volume, (v) => isNum(v) && v >= 0 && v <= 1) &&
    optional(s.largeFont, (v) => typeof v === 'boolean') &&
    optional(s.newLessonsEnabled, (v) => typeof v === 'boolean') &&
    optional(s.breakWarningEnabled, (v) => typeof v === 'boolean') &&
    optional(s.soundEffectsEnabled, (v) => typeof v === 'boolean') &&
    optional(s.pointsMode, (v) => v === 'makkelijk' || v === 'normaal' || v === 'moeilijk')
  );
}

function validCreatures(list: unknown): list is Record<string, unknown>[] {
  if (!Array.isArray(list)) return false;
  return list.every((d) => isObj(d) && optional(d.name, (n) => typeof n === 'string' && n.length <= 12 && filterDinoNameDraft(n) === n));
}

function validDinos(d: Record<string, unknown>): boolean {
  if (!validCreatures(d.dinos) || !validCreatures(d.eggs)) return false;
  return shopDinoCount(d.dinos, d.eggs) <= MAX_SHOP_DINOS && chickenCount(d.dinos) <= MAX_CHICKENS;
}

function validWorld(w: Record<string, unknown>): boolean {
  const diff = w.diff;
  if (!(diff instanceof Uint32Array)) return false;
  if (cleanDiff(diff).length !== diff.length) return false;
  return optional(w.terrainVersion, (v) => isWhole(v, 1));
}

function validKv(name: BackupKvName, v: Record<string, unknown>): boolean {
  switch (name) {
    case 'settings': return validSettings(v);
    case 'dinos': return validDinos(v);
    case 'world': return validWorld(v);
    case 'economy':
      return optional(v.points, (x) => isWhole(x)) && optional(v.practicePointsToday, (x) => isWhole(x)) && optional(v.fluit, (x) => typeof x === 'boolean');
    case 'village':
      return optional(v.found, (x) => Array.isArray(x) && x.every((b) => isWhole(b, 34) && b <= 41)) &&
        optional(v.cooldownMs, (x) => isNum(x) && x >= 0) &&
        optional(v.lastVillager, (x) => x === null || typeof x === 'string');
    case 'player':
      return (['x', 'y', 'z', 'yaw', 'pitch'] as const).every((k) => optional(v[k], isNum)) &&
        optional(v.hotbar, (x) => Array.isArray(x) && x.every((b) => isWhole(b)));
    case 'stats':
      return optional(v.playMsPerDay, (x) => isObj(x) && Object.values(x).every((n) => isNum(n) && n >= 0));
    case 'meta':
      return optional(v.lastBackup, (x) => x === null || typeof x === 'string');
    default: return true;
  }
}

/** Checks the text of a file. Returns the decoded data or one friendly Dutch message. */
export function checkBackup(text: string): BackupCheck {
  try {
    if (typeof text !== 'string') return bad(MSG_NOT_JSON);
    if (byteLength(text) > MAX_BACKUP_BYTES) return bad(MSG_TOO_BIG);
    let file: unknown;
    try {
      file = JSON.parse(text);
    } catch {
      return bad(MSG_NOT_JSON);
    }
    if (!isObj(file) || file.app !== BACKUP_APP) return bad(MSG_WRONG_APP);
    if (typeof file.format === 'number' && file.format > BACKUP_FORMAT) return bad(MSG_NEWER);
    if (file.format !== BACKUP_FORMAT) return bad(MSG_BAD_VALUES);
    if (isWhole(file.schemaVersion, 1) && file.schemaVersion > SCHEMA_VERSION) return bad(MSG_NEWER);
    if (!isWhole(file.schemaVersion, 1)) return bad(MSG_BAD_VALUES);
    if (typeof file.createdAt !== 'string' || Number.isNaN(Date.parse(file.createdAt))) return bad(MSG_BAD_VALUES);
    if (typeof file.appVersion !== 'string') return bad(MSG_BAD_VALUES);
    if (!isObj(file.kv) || !isObj(file.stores)) return bad(MSG_BAD_VALUES);

    const kv: BackupData['kv'] = {};
    for (const [name, raw] of Object.entries(file.kv)) {
      if (!(BACKUP_KV_NAMES as readonly string[]).includes(name)) return bad(MSG_BAD_VALUES);
      const value = decodeValue(raw);
      if (!isObj(value) || !validKv(name as BackupKvName, value)) return bad(MSG_BAD_VALUES);
      kv[name as BackupKvName] = value;
    }

    const stores: BackupData['stores'] = { progress: [], ownModules: [], answers: [], breaks: [], exams: [], ledger: [] };
    for (const name of Object.keys(file.stores)) {
      if (!(STORE_NAMES as readonly string[]).includes(name) || name === 'kv') return bad(MSG_BAD_VALUES);
    }
    for (const name of KEYED_STORES) {
      const rows = file.stores[name];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) return bad(MSG_BAD_VALUES);
      for (const row of rows) {
        if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string') return bad(MSG_BAD_VALUES);
        stores[name].push([row[0], decodeValue(row[1])]);
      }
    }
    for (const name of LOG_STORES) {
      const rows = file.stores[name];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) return bad(MSG_BAD_VALUES);
      for (const raw of rows) {
        const row = decodeValue(raw);
        if (!isObj(row) || !isWhole(row.id, 1)) return bad(MSG_BAD_VALUES);
        stores[name].push(row);
      }
    }
    return {
      ok: true,
      data: { createdAt: file.createdAt, appVersion: file.appVersion, schemaVersion: file.schemaVersion, kv, stores },
    };
  } catch {
    return bad(MSG_BAD_VALUES);
  }
}
