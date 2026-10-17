import { describe, expect, it, vi } from 'vitest';
import { createAppEnv } from './app-env';
import { resumeRunningSession } from './resume';

const store = (value: unknown) => ({ load: async () => value as never });

function rig() {
  const start = vi.fn();
  const host = createAppEnv({ sound: {} as never, audio: {} as never, dinos: {} as never });
  host.bindBreaks({ start, parentEnd: () => undefined, isActive: () => false });
  return { start, env: host.env };
}

describe('resume at boot', () => {
  it('reopens a saved break', async () => {
    const { start, env } = rig();
    expect(await resumeRunningSession(store({ kind: 'break' }), env)).toBe('break');
    expect(start).toHaveBeenCalledOnce();
  });

  it('does nothing without a saved session, without storage or when reading fails', async () => {
    const { start, env } = rig();
    expect(await resumeRunningSession(store(null), env)).toBe('none');
    expect(await resumeRunningSession(null, env)).toBe('none');
    expect(await resumeRunningSession({ load: async () => Promise.reject(new Error('broken')) }, env)).toBe('none');
    expect(start).not.toHaveBeenCalled();
  });

  it('leaves a saved exam alone until the exam flow exists', async () => {
    const { start, env } = rig();
    expect(await resumeRunningSession(store({ kind: 'exam' }), env)).toBe('none');
    expect(start).not.toHaveBeenCalled();
  });
});
