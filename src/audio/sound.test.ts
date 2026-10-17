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
