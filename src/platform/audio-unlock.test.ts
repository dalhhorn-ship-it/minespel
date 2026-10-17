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
});
