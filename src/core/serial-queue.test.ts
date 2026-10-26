import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serial-queue';

const tick = () => Promise.resolve();

describe('createSerialQueue', () => {
  it('runs jobs one at a time, in order', async () => {
    const q = createSerialQueue();
    const log: string[] = [];
    let running = 0;
    const job = (name: string, waits: number) => async () => {
      running++;
      expect(running).toBe(1);
      log.push(`start ${name}`);
      for (let i = 0; i < waits; i++) await tick();
      log.push(`end ${name}`);
      running--;
    };
    await Promise.all([
      q.run(job('a', 3)),
      q.run(job('b', 1)),
      q.run(job('c', 0)),
    ]);
    expect(log).toEqual([
      'start a',
      'end a',
      'start b',
      'end b',
      'start c',
      'end c',
    ]);
  });

  it('a rejected job does not block the next', async () => {
    const q = createSerialQueue();
    const log: string[] = [];
    const failed = q.run(async () => {
      throw new Error('boom');
    });
    const next = q.run(async () => {
      log.push('next');
    });
    await expect(failed).resolves.toBeUndefined();
    await next;
    expect(log).toEqual(['next']);
  });

  it('run resolves after its own job', async () => {
    const q = createSerialQueue();
    let done = false;
    const p = q.run(async () => {
      await tick();
      done = true;
    });
    expect(done).toBe(false);
    await p;
    expect(done).toBe(true);
  });
});
