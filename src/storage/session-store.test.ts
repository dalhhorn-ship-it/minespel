import { describe, expect, it } from 'vitest';
import { openDb } from './db';
import { createSessionStore, type SessionState } from './session-store';

let n = 0;
const fresh = () => openDb({ name: `session-db-${n++}` });

const running: SessionState = {
  kind: 'break',
  sessionId: 's1',
  questionIds: ['a', 'b', 'c', 'd', 'e'],
  index: 2,
  attempt: 2,
  points: 3,
  nested: { list: [1, 2, { x: 'y' }], flag: true, none: null },
};

describe('session store', () => {
  it('loads null when nothing was saved', async () => {
    const db = await fresh();
    expect(await createSessionStore(db).load()).toBeNull();
    db.close();
  });

  it('round trips a running break through JSON and a reopened database (AC37)', async () => {
    const name = `session-db-${n++}`;
    const db = await openDb({ name });
    await createSessionStore(db).save(running);
    db.close();
    const db2 = await openDb({ name });
    const loaded = await createSessionStore(db2).load();
    expect(loaded).toEqual(running);
    expect(JSON.parse(JSON.stringify(loaded))).toEqual(running);
    db2.close();
  });

  it('keeps the latest step and saves a copy', async () => {
    const db = await fresh();
    const store = createSessionStore(db);
    const state: SessionState = { kind: 'exam', index: 1, answers: ['x'] };
    await store.save(state);
    (state.answers as string[]).push('changed later');
    await store.save({ kind: 'exam', index: 2, answers: ['x', 'y'] });
    expect(await store.load()).toEqual({ kind: 'exam', index: 2, answers: ['x', 'y'] });
    db.close();
  });

  it('clear removes the running session', async () => {
    const db = await fresh();
    const store = createSessionStore(db);
    await store.save(running);
    await store.clear();
    expect(await store.load()).toBeNull();
    db.close();
  });

  it('rejects state without a kind and ignores a broken stored record', async () => {
    const db = await fresh();
    const store = createSessionStore(db);
    await expect(store.save({ kind: 'nope' } as unknown as SessionState)).rejects.toThrow();
    expect(await store.load()).toBeNull();
    db.close();
  });
});
