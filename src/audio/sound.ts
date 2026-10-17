// Sound effects made in code with Web Audio. No sound files.
// Rules: nothing plays before the first tap (AC100). Sound off, a broken or missing
// AudioContext, or the iPad mute switch never throws (AC99). Game code can call play() freely.
import type { AudioUnlock } from '../platform/audio-unlock';

export type SoundName =
  | 'pop'
  | 'thunk'
  | 'chime'
  | 'hmm'
  | 'clink'
  | 'crack'
  | 'chirp'
  | 'fanfare'
  | 'tick';

export const SOUND_NAMES: readonly SoundName[] = [
  'pop',
  'thunk',
  'chime',
  'hmm',
  'clink',
  'crack',
  'chirp',
  'fanfare',
  'tick',
];

export interface SoundOptions {
  unlock: Pick<AudioUnlock, 'isUnlocked' | 'watch'>;
  /** Makes the AudioContext. Defaults to the browser one. Tests pass a fake. */
  createContext?: () => AudioContext;
  enabled?: boolean;
  /** 0 to 1. */
  volume?: number;
}

export interface Sound {
  play(name: SoundName): void;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  setVolume(v: number): void;
  getVolume(): number;
}

type Ctx = AudioContext;

function defaultFactory(): AudioContext {
  const w = window as unknown as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  const C = w.AudioContext ?? w.webkitAudioContext;
  if (!C) throw new Error('no audio');
  return new C();
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

interface ToneOpts {
  type?: OscillatorType;
  from: number;
  to?: number;
  at?: number;
  dur: number;
  gain?: number;
}

function tone(ctx: Ctx, out: AudioNode, t0: number, o: ToneOpts) {
  const start = t0 + (o.at ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, start);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, start + o.dur);
  const peak = o.gain ?? 0.6;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur);
  osc.connect(g);
  g.connect(out);
  osc.start(start);
  osc.stop(start + o.dur + 0.02);
}

function noise(ctx: Ctx, out: AudioNode, t0: number, at: number, dur: number, freq: number, gain: number) {
  const start = t0 + at;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, start);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(start);
  src.stop(start + dur + 0.02);
}

const RECIPES: Record<SoundName, (c: Ctx, out: AudioNode, t: number) => void> = {
  // Block mined: a soft bubble pop.
  pop: (c, o, t) => tone(c, o, t, { from: 500, to: 900, dur: 0.1 }),
  // Block placed: a low friendly thump.
  thunk: (c, o, t) => {
    tone(c, o, t, { from: 160, to: 60, dur: 0.14, gain: 0.8 });
    noise(c, o, t, 0, 0.05, 400, 0.2);
  },
  // Right answer: two bright notes going up.
  chime: (c, o, t) => {
    tone(c, o, t, { from: 660, dur: 0.25, gain: 0.5 });
    tone(c, o, t, { from: 880, at: 0.12, dur: 0.35, gain: 0.5 });
  },
  // Wrong answer: gentle, two notes going down. Never harsh.
  hmm: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', from: 330, dur: 0.2, gain: 0.5 });
    tone(c, o, t, { type: 'triangle', from: 262, at: 0.18, dur: 0.3, gain: 0.5 });
  },
  // Coin or item: short metallic ting.
  clink: (c, o, t) => {
    tone(c, o, t, { from: 1568, dur: 0.18, gain: 0.35 });
    tone(c, o, t, { from: 2349, dur: 0.12, gain: 0.2 });
  },
  // Something breaks: a quick crunchy burst.
  crack: (c, o, t) => {
    noise(c, o, t, 0, 0.08, 1800, 0.7);
    noise(c, o, t, 0.07, 0.06, 1200, 0.4);
  },
  // Small happy bird sound.
  chirp: (c, o, t) => {
    tone(c, o, t, { from: 1200, to: 2000, dur: 0.08, gain: 0.35 });
    tone(c, o, t, { from: 1400, to: 2300, at: 0.1, dur: 0.08, gain: 0.35 });
  },
  // Big win: a rising little tune.
  fanfare: (c, o, t) => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(c, o, t, { type: 'triangle', from: f, at: i * 0.12, dur: 0.3, gain: 0.5 }));
    tone(c, o, t, { type: 'triangle', from: 1047, at: 0.5, dur: 0.6, gain: 0.5 });
  },
  // Countdown tick: tiny and quiet.
  tick: (c, o, t) => tone(c, o, t, { type: 'square', from: 1000, dur: 0.03, gain: 0.12 }),
};

export function createSound(options: SoundOptions): Sound {
  const { unlock } = options;
  const factory = options.createContext ?? defaultFactory;
  let enabled = options.enabled ?? true;
  let volume = clamp01(options.volume ?? 0.7);
  let ctx: Ctx | null = null;
  let master: GainNode | null = null;
  let failed = false;

  // Made on the first play after the first tap, never before (AC100).
  function ensure(): boolean {
    if (failed) return false;
    if (ctx && master) return true;
    try {
      ctx = factory();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      unlock.watch(ctx);
      return true;
    } catch {
      failed = true;
      ctx = null;
      master = null;
      return false;
    }
  }

  return {
    play(name) {
      try {
        if (!enabled || volume <= 0 || !unlock.isUnlocked()) return;
        if (!ensure() || !ctx || !master) return;
        const recipe = RECIPES[name];
        if (!recipe) return;
        recipe(ctx, master, ctx.currentTime);
      } catch {
        /* sound must never break the game (AC99) */
      }
    },
    setEnabled(on) {
      enabled = on;
    },
    isEnabled: () => enabled,
    setVolume(v) {
      volume = clamp01(v);
      try {
        if (master) master.gain.value = volume;
      } catch {
        /* ignore */
      }
    },
    getVolume: () => volume,
  };
}
