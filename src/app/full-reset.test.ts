import { describe, expect, it, vi } from 'vitest';
import { get, getAll, openDb, put, request } from '../storage/db';
import { createSaveQueue } from '../storage/save-queue';
import { replaceAll } from './full-reset';

let n = 0;
async function setup() {
  const db = await openDb({ name: `reset-db-${n++}` });
  const queue = createSaveQueue({ db, setTimer: () => 0, clearTimer: () => {} });
  const old = { points: 5 };
  queue.register('economy', () => old);
  await put(db, 'kv', { points: 5 }, 'economy');
  await put(db, 'kv', { kind: 'break' }, 'session');
  return { db, queue, old };
}

describe('replaceAll', () => {
  it('writes the new state, clears session, stops the queue and reloads', async () => {
    const { db, queue } = await setup();
    const reload = vi.fn();
    await replaceAll({ db, queue }, async (tx) => {
      await request(tx.objectStore('kv').put({ points: 0 }, 'economy'));
      await request(tx.objectStore('ledger').add({ ts: 1, day: 'd', delta: 1, reason: 'x' }));
    }, { reload });
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 0 });
    expect(await get(db, 'kv', 'session')).toBeUndefined();
    expect(await getAll(db, 'ledger')).toHaveLength(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never lets a flush requested during the replace write old data after it', async () => {
    const { db, queue } = await setup();
    queue.markDirty('economy');
    let flush: Promise<void> | null = null;
    await replaceAll({ db, queue }, async (tx) => {
      flush = queue.flushNow(); // waits behind the hold
      queue.markDirty('economy');
      await request(tx.objectStore('kv').put({ points: 0 }, 'economy'));
    }, { reload: () => {} });
    await flush;
    await queue.flushNow();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 0 });
    expect(queue.pendingCount()).toBe(0);
  });

  it('writes nothing on pagehide after the replace', async () => {
    const { db, queue } = await setup();
    const detach = queue.attachPageListeners();
    await replaceAll({ db, queue }, async (tx) => {
      await request(tx.objectStore('kv').put({ points: 0 }, 'economy'));
    }, { reload: () => {} });
    queue.markDirty('economy');
    window.dispatchEvent(new Event('pagehide'));
    await queue.flushNow();
    detach();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 0 });
  });

  it('leaves everything as before and does not reload when write fails', async () => {
    const { db, queue } = await setup();
    const reload = vi.fn();
    await expect(
      replaceAll({ db, queue }, async (tx) => {
        await request(tx.objectStore('kv').put({ points: 0 }, 'economy'));
        throw new Error('boom');
      }, { reload }),
    ).rejects.toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 5 });
    expect(await get(db, 'kv', 'session')).toEqual({ kind: 'break' });
    queue.markDirty('economy'); // still running
    expect(queue.pendingCount()).toBe(1);
  });

  it('still writes and reloads without a queue', async () => {
    const { db } = await setup();
    const reload = vi.fn();
    await replaceAll({ db, queue: null }, async (tx) => {
      await request(tx.objectStore('kv').put({ points: 0 }, 'economy'));
    }, { reload });
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 0 });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
