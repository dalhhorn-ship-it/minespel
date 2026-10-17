import { describe, expect, it, vi } from 'vitest';
import { createAudioUnlock } from './audio-unlock';

describe('audio unlock (AC100)', () => {
  it('resumes nothing before the first tap, then resumes once', () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const ctx = { resume: vi.fn(() => Promise.resolve()) };
    const cb = vi.fn();
    unlock.watch(ctx);
    unlock.whenUnlocked(cb);
    expect(unlock.isUnlocked()).toBe(false);
    expect(ctx.resume).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();

    target.dispatchEvent(new Event('pointerup'));
    expect(unlock.isUnlocked()).toBe(true);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);

    target.dispatchEvent(new Event('click'));
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('resumes a context added after the tap, and never throws', () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    target.dispatchEvent(new Event('touchend'));
    const late = { resume: vi.fn(() => Promise.reject(new Error('no'))) };
    expect(() => unlock.watch(late)).not.toThrow();
    expect(late.resume).toHaveBeenCalledTimes(1);
    const sync = {
      resume: () => {
        throw new Error('boom');
      },
    };
    expect(() => unlock.watch(sync)).not.toThrow();
    const called = vi.fn();
    unlock.whenUnlocked(called);
    expect(called).toHaveBeenCalled();
  });

  it('keeps listening and resumes a context that is not running on later taps', () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const ctx = { state: 'running', resume: vi.fn(() => Promise.resolve()) };
    unlock.watch(ctx);
    target.dispatchEvent(new Event('pointerup'));
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    target.dispatchEvent(new Event('touchend'));
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    ctx.state = 'suspended';
    target.dispatchEvent(new Event('touchend'));
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    ctx.state = 'interrupted';
    target.dispatchEvent(new Event('click'));
    expect(ctx.resume).toHaveBeenCalledTimes(3);
  });

  it('a throwing first-tap callback does not break the tap', () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const after = vi.fn();
    unlock.whenUnlocked(() => {
      throw new Error('boom');
    });
    unlock.whenUnlocked(after);
    expect(() => target.dispatchEvent(new Event('pointerup'))).not.toThrow();
    expect(after).toHaveBeenCalled();
  });
});
