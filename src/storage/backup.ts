// The backup file (v3, decision 120): build it, write it back in one transaction, note the date.
// No UI and no network here. The format is in docs/PLAN.md (T18 backup format) and checked in backup-check.ts.
import { haltWrites, transact, request } from './db';
import { createRecords } from './records';
import { SCHEMA_VERSION, STORE_NAMES, type KvName, type StoreName } from './schema';

export const BACKUP_APP = 'dino-blokwereld';
export const BACKUP_FORMAT = 1;
/** A file over this size is refused before it is read (AC195). */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

/**
 * The kv records a backup holds. Left out on purpose: gate (pincode and lockout stay on this iPad),
 * worldV1 (the old 0.4.0 copy), session (a running break or exam) and timers.
 */
export const BACKUP_KV_NAMES = [
  'settings', 'player', 'world', 'dinos', 'economy', 'rotation', 'switches', 'stats', 'meta', 'village',
] as const satisfies readonly KvName[];
export type BackupKvName = (typeof BACKUP_KV_NAMES)[number];

/** Stores of `[key, value]` pairs (out of line keys) and stores of rows with an `id`. */
export const KEYED_STORES = ['progress', 'ownModules'] as const satisfies readonly StoreName[];
export const LOG_STORES = ['answers', 'breaks', 'exams', 'ledger'] as const satisfies readonly StoreName[];

export interface BackupData {
  createdAt: string;
  appVersion: string;
  schemaVersion: number;
  /** Decoded values: typed arrays are real typed arrays here. */
  kv: Partial<Record<BackupKvName, unknown>>;
  stores: {
    progress: [string, unknown][];
    ownModules: [string, unknown][];
    answers: Record<string, unknown>[];
    breaks: Record<string, unknown>[];
    exams: Record<string, unknown>[];
    ledger: Record<string, unknown>[];
  };
}

/** The file as it is written: the same shape, with typed arrays as `{ "$u32": "<base64>" }`. */
export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  createdAt: string;
  appVersion: string;
  schemaVersion: number;
  kv: Record<string, unknown>;
  stores: Record<string, unknown[]>;
}

// ---- typed arrays as base64 ----

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Throws on text that is not base64 or whose length is not a whole number of 32 bit values. */
function u32FromBase64(text: string): Uint32Array {
  const bin = atob(text);
  if (bin.length % 4 !== 0) throw new Error('bad u32 length');
  const view = new DataView(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
  const out = new Uint32Array(bin.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getUint32(i * 4, true);
  return out;
}

function u32ToBase64(a: ArrayLike<number>): string {
  const view = new DataView(new ArrayBuffer(a.length * 4));
  for (let i = 0; i < a.length; i++) view.setUint32(i * 4, a[i] as number, true);
  return toBase64(new Uint8Array(view.buffer));
}

/** One generic encoder: every Uint32Array (any realm) becomes `{ "$u32": "<base64>" }`. */
export function encodeValue(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (ArrayBuffer.isView(v)) {
    if (Object.prototype.toString.call(v) !== '[object Uint32Array]') throw new Error('unsupported typed array');
    return { $u32: u32ToBase64(v as unknown as ArrayLike<number>) };
  }
  if (Array.isArray(v)) return v.map(encodeValue);
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = encodeValue(x);
  return out;
}

/** The reverse. Throws on a broken base64 value. */
export function decodeValue(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decodeValue);
  const keys = Object.keys(v);
  if (keys.length === 1 && keys[0] === '$u32') {
    const raw = (v as { $u32: unknown }).$u32;
    if (typeof raw !== 'string') throw new Error('bad u32 value');
    return u32FromBase64(raw);
  }
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = decodeValue(x);
  return out;
}

// ---- file name and date ----

const two = (n: number) => String(n).padStart(2, '0');

/** `dino-blokwereld-backup-JJJJ-MM-DD.json` in local time. */
export function backupFileName(now: Date = new Date()): string {
  return `dino-blokwereld-backup-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}.json`;
}

// ---- build ----

export interface BuildOptions {
  now?: Date;
  appVersion?: string;
}

/**
 * Reads everything in one readonly transaction (a consistent picture) and returns the file object.
 * Makes no network request.
 */
export async function buildBackup(db: IDBDatabase, options: BuildOptions = {}): Promise<BackupFile> {
  const now = options.now ?? new Date();
  const { kv, stores } = await transact(db, [...STORE_NAMES], 'readonly', async (tx) => {
    const kvStore = tx.objectStore('kv');
    const kvOut: Record<string, unknown> = {};
    for (const name of BACKUP_KV_NAMES) {
      const value = await request<unknown>(kvStore.get(name));
      if (value !== undefined) kvOut[name] = encodeValue(value);
    }
    const out: Record<string, unknown[]> = {};
    for (const name of KEYED_STORES) {
      const store = tx.objectStore(name);
      const keys = await request<IDBValidKey[]>(store.getAllKeys());
      const values = await request<unknown[]>(store.getAll());
      out[name] = keys.map((k, i) => [k, encodeValue(values[i])]);
    }
    for (const name of LOG_STORES) {
      out[name] = (await request<unknown[]>(tx.objectStore(name).getAll())).map(encodeValue);
    }
    return { kv: kvOut, stores: out };
  });
  const meta = kv.meta as { appVersion?: unknown } | undefined;
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    appVersion: options.appVersion ?? (typeof meta?.appVersion === 'string' ? meta.appVersion : ''),
    schemaVersion: SCHEMA_VERSION,
    kv,
    stores,
  };
}

export function backupText(file: BackupFile): string {
  return JSON.stringify(file);
}

// ---- replace ----

export interface ReplaceOptions {
  /** Called once before anything is written: stop every other writer (the save queue) here. */
  halt?: () => void;
  /** This build's version for `meta`. Default: the one already stored on this iPad. */
  appVersion?: string;
}

/**
 * Restore and Alles wissen as ONE transaction over every store: all old data goes and all new data comes,
 * or (on any error) nothing changes (AC197). `data` null means empty: Alles wissen, which also clears the
 * pincode. With data, this iPad's own pincode and lockout (`gate`) are kept. Transactions on the same stores
 * wait for this one, so no other write lands in the middle.
 */
export async function replaceAll(db: IDBDatabase, data: BackupData | null, options: ReplaceOptions = {}): Promise<void> {
  options.halt?.();
  // Every other writer is refused until this is done. On success the caller reloads the page, so the halt stays.
  haltWrites(true);
  try {
    await transact(db, [...STORE_NAMES], 'readwrite', async (tx) => {
      const kvStore = tx.objectStore('kv');
      const gate = data ? await request<unknown>(kvStore.get('gate')) : undefined;
      const oldMeta = data ? await request<{ appVersion?: unknown } | undefined>(kvStore.get('meta')) : undefined;
      for (const name of STORE_NAMES) await request(tx.objectStore(name).clear());
      if (gate !== undefined) await request(kvStore.put(gate, 'gate'));
      if (!data) return;
      for (const name of BACKUP_KV_NAMES) {
        const value = data.kv[name];
        if (value !== undefined) await request(kvStore.put(value, name));
      }
      // meta describes this iPad and this build, not the file: current schema and app version, the date of the backup.
      const fileMeta = (data.kv.meta ?? {}) as { createdAt?: unknown };
      const appVersion = options.appVersion ?? (typeof oldMeta?.appVersion === 'string' ? oldMeta.appVersion : '');
      await request(kvStore.put({
        schemaVersion: SCHEMA_VERSION,
        appVersion,
        lastBackup: data.createdAt,
        createdAt: typeof fileMeta.createdAt === 'string' ? fileMeta.createdAt : data.createdAt,
      }, 'meta'));
      for (const name of KEYED_STORES) {
        const store = tx.objectStore(name);
        for (const [key, value] of data.stores[name]) await request(store.put(value, key));
      }
      for (const name of LOG_STORES) {
        const store = tx.objectStore(name);
        for (const row of data.stores[name]) await request(store.put(row));
      }
    }, { bypassHalt: true });
  } catch (e) {
    haltWrites(false);
    throw e;
  }
}

/** Saves the date of this backup. Call it only after the share sheet or the new view reported success. */
export async function markBackupMade(db: IDBDatabase, now: Date = new Date()): Promise<void> {
  await createRecords(db).update('meta', (m) => ({ ...m, lastBackup: now.toISOString() }));
}
