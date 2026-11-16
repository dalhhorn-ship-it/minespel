import { describe, expect, it } from 'vitest';
import { createNearSounds, NEAR_EVERY_MS } from './near-sounds';
import { addTarget, type TargetKind } from '../monsters/targets';
import type { NearVoice } from './sound';

interface FakeVoice extends NearVoice {
  plays: string[];
  silences: number;
  held: { level: number; pan: number };
}

function voice(): FakeVoice {
  const v = {
    plays: [] as string[],
    silences: 0,
    held: { level: 0, pan: 0 },
    play(n: string) {
      v.plays.push(n);
    },
    set(level: number, pan: number) {
      v.held.level = level;
      v.held.pan = pan;
    },
    silence() {
      v.silences++;
      v.held.level = 0;
    },
    get level() {
      return v.held.level;
    },
    get pan() {
      return v.held.pan;
    },
  };
  return v as unknown as FakeVoice;
}

interface Src { id: string; kind: TargetKind; x: number }

function setup(opts: { unlocked?: boolean; enabled?: boolean; volume?: number } = {}) {
  const voices: [FakeVoice, FakeVoice] = [voice(), voice()];
  const state = { unlocked: opts.unlocked ?? true, enabled: opts.enabled ?? true, volume: opts.volume ?? 1 };
  const monsters: Src[] = [];
  const bar: Src[] = [];
  const near = createNearSounds({
    sound: {
      nearVoices: () => (state.unlocked ? voices : null),
      isEnabled: () => state.enabled,
      getVolume: () => state.volume,
    },
    collectMonsters: (l) => monsters.forEach((m) => addTarget(l, m.id, m.kind, m.x, 0, 0)),
    collectBar: (l) => bar.forEach((m) => addTarget(l, m.id, m.kind, m.x, 0, 0)),
    pose: () => ({ x: 0, y: 0, z: 0, yaw: Math.PI / 2 }),
  });
  const tick = (ms: number) => {
    for (let t = 0; t < ms; t += NEAR_EVERY_MS) near.step(NEAR_EVERY_MS / 1000);
  };
  return { near, voices, state, monsters, bar, tick };
}

describe('near sounds (V24b)', () => {
  it('AC323: the view gain is peak times closeness times Volume', () => {
    const s = setup({ volume: 0.4 });
    s.monsters.push({ id: 'klodder', kind: 'klodder', x: 8 });
    s.tick(100);
    const src = s.near.view().sources[0]!;
    expect(src.gain).toBeCloseTo(0.4 * 0.141, 2);
    expect(src.playing).toBe(true);
  });

  it('AC324: exactly 2 sources play, the closest two', () => {
    const s = setup();
    s.monsters.push({ id: 'mole-1', kind: 'mole', x: 4 }, { id: 'klodder', kind: 'klodder', x: 10 });
    s.bar.push({ id: 'bar', kind: 'bar', x: 4 });
    s.tick(100);
    const playing = s.near.view().sources.filter((x) => x.playing).map((x) => x.id);
    expect(playing.sort()).toEqual(['bar', 'mole-1']);
    expect(s.voices[0].plays.length + s.voices[1].plays.length).toBe(2);
  });

  it('AC323: one reused list and a fixed beat per kind', () => {
    const s = setup();
    s.monsters.push({ id: 'bubble', kind: 'bubble', x: 10 });
    s.tick(100);
    const list = s.near.view().sources;
    s.tick(6000);
    expect(s.near.view().sources).toBe(list);
    const v = s.voices.find((x) => x.plays.length > 0)!;
    // The first at once, then every 1.5 s: 100 ms + 6000 ms gives 5 plays.
    expect(v.plays.length).toBe(5);
    // Walking closer does not speed the beat up.
    s.monsters[0]!.x = 3;
    s.tick(6000);
    expect(v.plays.length).toBe(9);
  });

  it('AC325: the voice pan follows the side', () => {
    const s = setup();
    // yaw pi/2: forward is +x, so +z is to the left; x is ahead here.
    s.monsters.push({ id: 'klodder', kind: 'klodder', x: 8 });
    s.tick(100);
    expect(Math.abs(s.near.view().sources[0]!.pan)).toBeLessThan(0.1);
  });

  it('AC326: no play while not running, and silence() on a pause', () => {
    const s = setup();
    s.monsters.push({ id: 'klodder', kind: 'klodder', x: 4 });
    s.tick(100);
    s.near.setRunning(false);
    expect(s.voices[0].silences + s.voices[1].silences).toBeGreaterThanOrEqual(2);
    expect(s.near.view().sources.length).toBe(0);
    const plays = s.voices[0].plays.length + s.voices[1].plays.length;
    s.tick(5000);
    expect(s.voices[0].plays.length + s.voices[1].plays.length).toBe(plays);
    s.near.setRunning(true);
    s.tick(100);
    expect(s.voices[0].plays.length + s.voices[1].plays.length).toBe(plays + 1);
    expect(s.near.view().sources[0]!.gain).toBeGreaterThan(0);
  });

  it('AC326: before the first tap, with the switch off and with Volume 0 every gain is 0 and nothing plays', () => {
    for (const cfg of [{ unlocked: false }, { enabled: false }, { volume: 0 }]) {
      const s = setup(cfg);
      s.monsters.push({ id: 'klodder', kind: 'klodder', x: 3 });
      s.tick(500);
      for (const src of s.near.view().sources) {
        expect(src.gain).toBe(0);
        expect(src.playing).toBe(false);
      }
      expect(s.voices[0].plays.length + s.voices[1].plays.length).toBe(0);
    }
  });

  it('AC326: a source that is gone frees its voice', () => {
    const s = setup();
    s.monsters.push({ id: 'klodder', kind: 'klodder', x: 4 });
    s.tick(100);
    const v = s.voices.find((x) => x.plays.length > 0)!;
    s.monsters.length = 0;
    s.tick(100);
    expect(v.silences).toBeGreaterThan(0);
    expect(s.near.view().sources.length).toBe(0);
  });

  it('AC323: the bar sizzles every 2 s and plays its tune every 10 s on one voice', () => {
    const s = setup();
    s.bar.push({ id: 'bar', kind: 'bar', x: 3 });
    s.tick(100);
    s.tick(20000);
    const v = s.voices.find((x) => x.plays.length > 0)!;
    expect(v.plays.filter((n) => n === 'deuntje').length).toBe(2);
    expect(v.plays.filter((n) => n === 'sis').length).toBeGreaterThanOrEqual(8);
    expect(v.plays[0]).toBe('sis');
  });
});
