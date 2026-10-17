import { describe, expect, it, vi } from 'vitest';
import { resumeRunningSession } from './resume';

const store = (value: unknown) => ({ load: async () => value as never });

describe('resume at boot', () => {
  it('reopens a saved break', async () => {
    const start = vi.fn();
    expect(await resumeRunningSession(store({ kind: 'break' }), { start })).toBe('break');
    expect(start).toHaveBeenCalledOnce();
  });

  it('does nothing without a saved session, without storage or when reading fails', async () => {
    const start = vi.fn();
    expect(await resumeRunningSession(store(null), { start })).toBe('none');
    expect(await resumeRunningSession(null, { start })).toBe('none');
    expect(await resumeRunningSession({ load: async () => Promise.reject(new Error('broken')) }, { start })).toBe('none');
    expect(start).not.toHaveBeenCalled();
  });

  it('leaves a saved exam alone until the exam flow exists', async () => {
    const start = vi.fn();
    expect(await resumeRunningSession(store({ kind: 'exam' }), { start })).toBe('none');
    expect(start).not.toHaveBeenCalled();
  });
});
