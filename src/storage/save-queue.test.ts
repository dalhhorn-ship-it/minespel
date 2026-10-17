import { describe, expect, it, vi } from 'vitest';
import { get, openDb } from './db';
import { createSaveQueue } from './save-queue';

let n = 0;
const fresh = () => openDb({ name: `queue-db-${n++}` });

describe('save queue', () => {
  it('writes dirty records after the delay, in one go', async () => {
    const db = await fresh();
    const timer: { fire: (() => void) | null } = { fire: null };
    let waitedMs = 0;
    const q = createSaveQueue({
      db,
      setTimer: (fn, ms) => {
        timer.fire = fn;
        waitedMs = ms;
        return 1;
      },
      clearTimer: () => {
        timer.fire = null;
      },
    });
    const eco = { points: 1 };
    q.register('economy', () => eco);
    q.register('stats', () => ({ playMsPerDay: {} }));
    q.markDirty('economy');
    eco.points = 2; // read at write time, so the latest value wins
    q.markDirty('economy');
    q.markDirty('stats');
    expect(waitedMs).toBe(1000); // within 1 s
    expect(q.pendingCount()).toBe(2);
    expect(await get(db, 'kv', 'economy')).toBeUndefined();
    timer.fire?.();
    await q.flushNow();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 2 });
    expect(await get(db, 'kv', 'stats')).toEqual({ playMsPerDay: {} });
    expect(q.pendingCount()).toBe(0);
  });

  it('flushNow writes right away', async () => {
    const db = await fresh();
    const q = createSaveQueue({ db, setTimer: () => 0, clearTimer: () => {} });
    q.register('economy', () => ({ points: 9 }));
    q.markDirty('economy');
    await q.flushNow();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 9 });
    await q.flushNow(); // nothing dirty, fine
  });

  it('keeps a record dirty when the write fails and reports it', async () => {
    const db = await fresh();
    const onError = vi.fn();
    const q = createSaveQueue({ db, onError, setTimer: () => 0, clearTimer: () => {} });
    q.register('world', () => {
      return { diff: new Uint32Array([1]) };
    });
    q.register('economy', () => ({ points: 1 }));
    q.markDirty('economy');
    db.close(); // writing to a closed database fails
    await q.flushNow();
    expect(onError).toHaveBeenCalledOnce();
    expect(q.pendingCount()).toBe(1);
  });

  it('flushes on hide, but not after simulateKill', async () => {
    const db = await fresh();
    const q = createSaveQueue({ db, setTimer: () => 0, clearTimer: () => {} });
    q.register('economy', () => ({ points: 4 }));
    const detach = q.attachPageListeners();
    q.markDirty('economy');
    window.dispatchEvent(new Event('pagehide'));
    await q.flushNow();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 4 });

    q.register('stats', () => ({ playMsPerDay: { a: 1 } }));
    q.markDirty('stats');
    q.simulateKill();
    window.dispatchEvent(new Event('pagehide'));
    await new Promise((r) => setTimeout(r, 20));
    expect(await get(db, 'kv', 'stats')).toBeUndefined();
    detach();
  });

  it('hold keeps flushes out until it ends, and they then read fresh values', async () => {
    const db = await fresh();
    const q = createSaveQueue({ db, setTimer: () => 0, clearTimer: () => {} });
    const eco = { points: 1 };
    q.register('economy', () => eco);
    let flushed: Promise<void> = Promise.resolve();
    const result = await q.hold(async () => {
      eco.points = 99; // a change that is undone before the hold ends
      q.markDirty('economy');
      flushed = q.flushNow();
      await new Promise((r) => setTimeout(r, 10));
      expect(await get(db, 'kv', 'economy')).toBeUndefined(); // the flush has not started
      eco.points = 2;
      return 'done';
    });
    expect(result).toBe('done');
    await flushed;
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 2 });
  });

  it('hold passes on a failure and the queue keeps working', async () => {
    const db = await fresh();
    const q = createSaveQueue({ db, setTimer: () => 0, clearTimer: () => {} });
    q.register('economy', () => ({ points: 5 }));
    await expect(q.hold(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    q.markDirty('economy');
    await q.flushNow();
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 5 });
  });
});

describe('save queue stop', () => {
  it('drops pending marks and never writes again', async () => {
    const db = await fresh();
    const cleared = vi.fn();
    const q = createSaveQueue({ db, setTimer: () => 7, clearTimer: cleared });
    q.register('economy', () => ({ points: 1 }));
    q.markDirty('economy');
    q.stop();
    expect(cleared).toHaveBeenCalled();
    expect(q.pendingCount()).toBe(0);
    q.markDirty('economy');
    await q.flushNow();
    expect(q.pendingCount()).toBe(0);
    expect(await get(db, 'kv', 'economy')).toBeUndefined();
  });

  it('writes nothing on hide or pagehide after stop', async () => {
    const db = await fresh();
    const q = createSaveQueue({ db, setTimer: () => 0, clearTimer: () => {} });
    q.register('economy', () => ({ points: 1 }));
    const detach = q.attachPageListeners();
    q.markDirty('economy');
    q.stop();
    window.dispatchEvent(new Event('pagehide'));
    document.dispatchEvent(new Event('visibilitychange'));
    await q.flushNow();
    detach();
    expect(await get(db, 'kv', 'economy')).toBeUndefined();
  });
});
