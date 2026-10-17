import { describe, expect, it } from 'vitest';
import { MAX_STEP, createLoop, frameStep } from './loop';

describe('frameStep', () => {
  it('first frame is zero', () => expect(frameStep(null, 1000)).toBe(0));
  it('converts ms to seconds', () => expect(frameStep(1000, 1016)).toBeCloseTo(0.016));
  it('caps a slow frame at 100 ms', () => {
    expect(MAX_STEP).toBe(0.1);
    expect(frameStep(0, 5000)).toBe(0.1);
  });
  it('never goes negative', () => expect(frameStep(100, 50)).toBe(0));
});

function fakeRaf() {
  let next: ((t: number) => void) | null = null;
  let id = 0;
  return {
    request: (cb: (t: number) => void) => {
      next = cb;
      return ++id;
    },
    cancel: () => {
      next = null;
    },
    tick: (t: number) => {
      const cb = next;
      next = null;
      cb?.(t);
    },
    pending: () => next !== null,
  };
}

describe('createLoop', () => {
  it('steps with the capped time and stops asking for frames when stopped', () => {
    const raf = fakeRaf();
    const steps: number[] = [];
    const loop = createLoop({ frame: (dt) => steps.push(dt), request: raf.request, cancel: raf.cancel });
    loop.start();
    raf.tick(1000);
    raf.tick(1016);
    raf.tick(3000);
    expect(steps[0]).toBe(0);
    expect(steps[1]).toBeCloseTo(0.016);
    expect(steps[2]).toBe(0.1);
    loop.stop();
    expect(loop.running).toBe(false);
    expect(raf.pending()).toBe(false);
  });
  it('a restart begins with a step of zero, not the time spent paused', () => {
    const raf = fakeRaf();
    const steps: number[] = [];
    const loop = createLoop({ frame: (dt) => steps.push(dt), request: raf.request, cancel: raf.cancel });
    loop.start();
    raf.tick(1000);
    loop.stop();
    loop.start();
    raf.tick(9000);
    expect(steps).toEqual([0, 0]);
  });
  it('keeps running after a frame throws', () => {
    const raf = fakeRaf();
    let n = 0;
    const loop = createLoop({
      frame: () => {
        if (n++ === 0) throw new Error('boom');
      },
      request: raf.request,
      cancel: raf.cancel,
    });
    loop.start();
    expect(() => raf.tick(1)).toThrow();
    expect(raf.pending()).toBe(true);
  });
});
