import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serial-queue';

describe('createSerialQueue', () => {
  it('runs jobs one at a time, in order', async () => {
    const q = createSerialQueue();
    const log: string[] = [];
    let running = 0;
    let releaseA: () => void = () => undefined;
    const gateA = new Promise<void>((r) => {
      releaseA = r;
    });
    const job = (name: string, gate?: Promise<void>) => async () => {
      running++;
      expect(running).toBe(1);
      log.push(`start ${name}`);
      await (gate ?? Promise.resolve());
      log.push(`end ${name}`);
      running--;
    };
    void q.run(job('a', gateA));
    void q.run(job('b'));
    const last = q.run(job('c'));
    await Promise.resolve();
    expect(log).toEqual(['start a']);
    releaseA();
    await last;
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('a rejected job does not block the next', async () => {
    const q = createSerialQueue();
    const failed = q.run(() => Promise.reject(new Error('nope')));
    let ran = false;
    await q.run(async () => {
      ran = true;
    });
    await expect(failed).resolves.toBeUndefined();
    expect(ran).toBe(true);
  });

  it('run resolves after its own job', async () => {
    const q = createSerialQueue();
    let done = false;
    await q.run(async () => {
      await Promise.resolve();
      await Promise.resolve();
      done = true;
    });
    expect(done).toBe(true);
  });

  it('idle waits for all jobs', async () => {
    const q = createSerialQueue();
    let n = 0;
    void q.run(async () => void n++);
    void q.run(async () => void n++);
    await q.idle();
    expect(n).toBe(2);
  });
});
