// The running break or exam, saved after every step (AC37 storage part).
// Lives in the `kv` record "session". It is written right away, not through the save queue.
import { getRecord, putRecord } from './records';

export type SessionKind = 'break' | 'exam';

/** Plain JSON state of a running break or exam. The flow modules decide the other fields. */
export interface SessionState {
  kind: SessionKind;
  [key: string]: unknown;
}

export interface SessionStore {
  /** Saves a copy of the state. Throws when the state cannot be written as JSON. */
  save(state: SessionState): Promise<void>;
  /** The saved state, or null when nothing runs or the record is not a break or exam. */
  load(): Promise<SessionState | null>;
  /** Break or exam is over. */
  clear(): Promise<void>;
}

function isSessionState(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === 'break' || kind === 'exam';
}

export function createSessionStore(db: IDBDatabase): SessionStore {
  return {
    async save(state) {
      if (!isSessionState(state)) throw new Error('Session needs kind "break" or "exam"');
      // The JSON round trip makes sure what we keep is what a reload would give back.
      const text = JSON.stringify(state);
      await putRecord(db, 'session', JSON.parse(text) as SessionState);
    },
    async load() {
      const stored = await getRecord(db, 'session');
      return isSessionState(stored) ? stored : null;
    },
    async clear() {
      await putRecord(db, 'session', null);
    },
  };
}
