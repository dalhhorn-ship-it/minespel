import { describe, expect, it, vi } from 'vitest';
import { createAudioUnlock } from '../platform/audio-unlock';
import { FakeAudioContext } from '../../tests/unit/fakes/audio-context';
import { createSound, SOUND_NAMES } from './sound';

function setup(opts: { enabled?: boolean; volume?: number } = {}) {
  const target = new EventTarget();
  const unlock = createAudioUnlock(target);
  const made: FakeAudioContext[] = [];
  const createContext = vi.fn(() => {
    const c = new FakeAudioContext();
    made.push(c);
    return c as unknown as AudioContext;
  });
  const sound = createSound({ unlock, createContext, ...opts });
  const tap = () => target.dispatchEvent(new Event('pointerup'));
  return { sound, made, createContext, tap };
}

describe('sound (AC99, AC100)', () => {
  it('plays nothing and makes no context before the first tap', () => {
    const { sound, createContext, made } = setup();
    for (const n of SOUND_NAMES) sound.play(n);
    expect(createContext).not.toHaveBeenCalled();
    expect(made).toHaveLength(0);
  });

  it('plays every sound after the first tap and resumes the context', () => {
    const { sound, made, tap } = setup();
    tap();
    for (const n of SOUND_NAMES) {
      const before = made[0]?.started ?? 0;
      sound.play(n);
      expect(made[0]!.started, n).toBeGreaterThan(before);
    }
    expect(made).toHaveLength(1);
    expect(made[0]!.resumeCalls).toBe(1);
  });

  it('plays nothing when sound is off, and again when turned on', () => {
    const { sound, made, tap } = setup({ enabled: false });
    tap();
    sound.play('pop');
    expect(made).toHaveLength(0);
    sound.setEnabled(true);
    sound.play('pop');
    expect(made[0]!.started).toBeGreaterThan(0);
    sound.setEnabled(false);
    const n = made[0]!.started;
    sound.play('chime');
    expect(made[0]!.started).toBe(n);
    expect(sound.isEnabled()).toBe(false);
  });

  it('keeps volume between 0 and 1 and silences at 0', () => {
    const { sound, made, tap } = setup();
    tap();
    sound.setVolume(5);
    expect(sound.getVolume()).toBe(1);
    sound.setVolume(-1);
    expect(sound.getVolume()).toBe(0);
    sound.play('pop');
    expect(made[0]!.started).toBe(0);
    sound.setVolume(0.5);
    sound.play('pop');
    expect(made[0]!.started).toBeGreaterThan(0);
  });

  it('makes and resumes the context inside the first tap, before any play', () => {
    const { made, createContext, tap } = setup();
    expect(createContext).not.toHaveBeenCalled();
    tap();
    expect(made).toHaveLength(1);
    expect(made[0]!.state).toBe('running');
    expect(made[0]!.resumeCalls).toBe(1);
  });

  it('wakes a suspended context on the next tap, and not when running', () => {
    const { sound, made, tap } = setup();
    tap();
    tap();
    expect(made[0]!.resumeCalls).toBe(1);
    made[0]!.suspend();
    tap();
    expect(made[0]!.resumeCalls).toBe(2);
    expect(made[0]!.state).toBe('running');
    sound.play('pop');
    expect(made[0]!.started).toBeGreaterThan(0);
  });

  it('never throws when audio is missing or broken', () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const missing = createSound({
      unlock,
      createContext: () => {
        throw new Error('no audio');
      },
    });
    target.dispatchEvent(new Event('pointerup'));
    expect(() => SOUND_NAMES.forEach((n) => missing.play(n))).not.toThrow();

    const { sound, made, tap } = setup();
    tap();
    sound.play('pop');
    made[0]!.broken = true;
    expect(() => SOUND_NAMES.forEach((n) => sound.play(n))).not.toThrow();
    expect(() => sound.play('nope' as never)).not.toThrow();
    expect(() => sound.setVolume(0.3)).not.toThrow();
  });
});

describe('the near voices (decision 144, AC323 AC325)', () => {
  /** A fake context that also has a stereo panner and a smoothing gain, to see what the voices do. */
  function setupNear(withPanner = true) {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const calls: { target: number; tc: number }[] = [];
    const pans: number[] = [];
    let cancelled = 0;
    const made: FakeAudioContext[] = [];
    const createContext = () => {
      const c = new FakeAudioContext() as FakeAudioContext & Record<string, unknown>;
      const baseGain = c.createGain.bind(c);
      c.createGain = () => {
        const g = baseGain() as ReturnType<typeof baseGain> & { gain: Record<string, unknown> };
        g.gain.setTargetAtTime = (v: number, _t: number, tc: number) => void calls.push({ target: v, tc });
        g.gain.cancelScheduledValues = () => void cancelled++;
        return g;
      };
      if (withPanner) {
        c.createStereoPanner = () => {
          const p = { pan: { value: 0 }, connect: (n: unknown) => n, disconnect: () => undefined };
          Object.defineProperty(p.pan, 'value', { get: () => pans[pans.length - 1] ?? 0, set: (v: number) => void pans.push(v) });
          return p;
        };
      }
      made.push(c);
      return c as unknown as AudioContext;
    };
    const sound = createSound({ unlock, createContext });
    const tap = () => target.dispatchEvent(new Event('pointerup'));
    return { sound, tap, calls, pans, made, cancelled: () => cancelled };
  }

  it('AC323: nearVoices() is null before the first tap and gives the same two voices after', () => {
    const { sound, tap } = setupNear();
    expect(sound.nearVoices()).toBeNull();
    tap();
    const v = sound.nearVoices();
    expect(v).toHaveLength(2);
    expect(sound.nearVoices()).toBe(v);
    expect(v?.[0]).not.toBe(v?.[1]);
  });

  it('AC323: set(level, pan) moves the gain with a 50 ms smoothing and sets the pan', () => {
    const { sound, tap, calls, pans } = setupNear();
    tap();
    const [a] = sound.nearVoices() ?? [];
    a?.set(0.5, -0.4);
    expect(calls).toEqual([{ target: 0.5, tc: 0.05 }]);
    expect(pans).toEqual([-0.4]);
    expect(a?.level).toBe(0.5);
    expect(a?.pan).toBe(-0.4);
    a?.set(7, 3);
    expect(a?.level).toBe(1);
    expect(a?.pan).toBe(1);
  });

  it('AC325: with no stereo panner the pan stays 0', () => {
    const { sound, tap, calls } = setupNear(false);
    tap();
    const [a] = sound.nearVoices() ?? [];
    a?.set(0.3, 0.9);
    expect(a?.pan).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('AC326: silence() cancels and sets the gain to 0 at once', () => {
    const { sound, tap, cancelled } = setupNear();
    tap();
    const [a] = sound.nearVoices() ?? [];
    a?.set(0.8, 0);
    a?.silence();
    expect(a?.level).toBe(0);
    expect(cancelled()).toBe(1);
  });

  it('AC324: a voice plays a near sound only with sound on and Volume above 0, and the voices do not break the other sounds', () => {
    const { sound, tap, made } = setupNear();
    tap();
    const [a] = sound.nearVoices() ?? [];
    const before = made[0]?.started ?? 0;
    a?.play('blub');
    expect(made[0]?.started).toBeGreaterThan(before);
    const mid = made[0]?.started ?? 0;
    sound.setEnabled(false);
    a?.play('giechel');
    sound.setEnabled(true);
    sound.setVolume(0);
    a?.play('giechel');
    expect(made[0]?.started).toBe(mid);
    sound.setVolume(0.5);
    sound.play('pop');
    expect(made[0]?.started).toBeGreaterThan(mid);
  });

  it('every near sound and hap is a sound name that plays and has a row', async () => {
    const { SOUND_SPECS } = await import('./sound');
    for (const n of ['blub', 'giechel', 'snuffel', 'snurk', 'sis', 'deuntje', 'hap'] as const) {
      expect(SOUND_NAMES).toContain(n);
      expect(SOUND_SPECS[n].seconds).toBeLessThan(1.5);
      expect(SOUND_SPECS[n].peak).toBeLessThanOrEqual(0.8);
    }
  });
});
