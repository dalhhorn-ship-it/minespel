// The `monsters` kv record and the three switches (v17, decision 135).
// One writer rule: every write to `monsters` is ONE readwrite transaction that reads, changes and puts the record,
// through one serial queue, so the clock writer can never drop a bought knight.
import { request, transact } from './db';
import { defaultKv, type MonstersRecord, type SettingsRecord } from './schema';

export interface CreatureSwitches {
  knights: boolean;
  bubble: boolean;
}

/** What may exist in the world. A missing master or Ridders reads as Aan, a missing bubble as Uit. */
export function creatureSwitches(settings: Pick<SettingsRecord, 'monstersEnabled' | 'knightsEnabled' | 'bubbleEnabled'>): CreatureSwitches {
  const master = settings.monstersEnabled !== false;
  const knights = master && settings.knightsEnabled !== false;
  return { knights, bubble: knights && settings.bubbleEnabled === true };
}

function readable(raw: unknown): MonstersRecord {
  const base = defaultKv('monsters');
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base;
  return { ...base, ...(raw as Partial<MonstersRecord>) };
}

/**
 * First 0.7.0 start rule. Runs before settings are read, in one readwrite transaction.
 * No `monsters` record: if none of world, player, economy or dinos exists it is a new install and the bubble
 * is Aan, else it is an existing install and the bubble is Uit. Then the default record is written.
 * Returns the settings as written (defaults filled in) when the rule ran, so boot need not read them again, or
 * null when the record already existed and nothing was done.
 */
export async function prepareMonsters(db: IDBDatabase): Promise<SettingsRecord | null> {
  return transact(db, 'kv', 'readwrite', async (tx) => {
    const kv = tx.objectStore('kv');
    if ((await request<unknown>(kv.get('monsters'))) !== undefined) return null;
    let existing = false;
    for (const name of ['world', 'player', 'economy', 'dinos']) {
      if ((await request<unknown>(kv.get(name))) !== undefined) existing = true;
    }
    const raw = await request<unknown>(kv.get('settings'));
    const settings = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as SettingsRecord) : defaultKv('settings');
    const next = { ...defaultKv('settings'), ...settings, bubbleEnabled: !existing };
    await request(kv.put({ ...settings, bubbleEnabled: !existing }, 'settings'));
    await request(kv.put(defaultKv('monsters'), 'monsters'));
    return next;
  });
}

const queues = new WeakMap<IDBDatabase, Promise<unknown>>();

/**
 * Reads, changes and puts `monsters` in one transaction. Calls for one database run one after the other, so
 * two writers in a row both land. `change` gets a fresh copy and returns the next record.
 */
export function updateMonsters(db: IDBDatabase, change: (current: MonstersRecord) => MonstersRecord): Promise<MonstersRecord> {
  const run = () =>
    transact(db, 'kv', 'readwrite', async (tx) => {
      const kv = tx.objectStore('kv');
      const next = change(readable(await request<unknown>(kv.get('monsters'))));
      await request(kv.put(next, 'monsters'));
      return next;
    });
  const previous = queues.get(db) ?? Promise.resolve();
  const result = previous.then(run, run);
  queues.set(db, result.catch(() => undefined));
  return result;
}
