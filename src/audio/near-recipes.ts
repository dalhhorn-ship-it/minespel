// The near sounds (v24, decision 144): soft and silly sounds that come from the bubble, Klodder, the moles and the
// Lavakip-bar when they are close. V22a holds placeholder recipes inside the caps; V24a writes the final ones.
// The rows (`NEAR_SPECS`) are spread into `SOUND_SPECS` and the recipes into `RECIPES` by sound.ts, so the caps of
// AC228 check them like every other sound: under 1.5 s and at or below 0.8. No growl, siren or deep long tone.
// This file imports only types from sound.ts (sound.ts imports this one).

export type NearName = 'blub' | 'giechel' | 'snuffel' | 'snurk' | 'sis' | 'deuntje';

export const NEAR_NAMES: readonly NearName[] = ['blub', 'giechel', 'snuffel', 'snurk', 'sis', 'deuntje'];

/** Length in seconds and loudest gain of every near sound (AC322). */
export const NEAR_SPECS: Record<NearName, { seconds: number; peak: number }> = {
  blub: { seconds: 0.3, peak: 0.2 },
  giechel: { seconds: 0.5, peak: 0.2 },
  snuffel: { seconds: 0.4, peak: 0.2 },
  snurk: { seconds: 0.8, peak: 0.1 },
  sis: { seconds: 0.5, peak: 0.12 },
  deuntje: { seconds: 0.9, peak: 0.15 },
};

type Ctx = AudioContext;
type Recipe = (c: Ctx, out: AudioNode, t: number) => void;

interface NearTone {
  from: number;
  to?: number;
  at?: number;
  dur: number;
  gain: number;
}

/** One soft triangle tone with a quick fade in and out. Its own copy, so this file never imports sound.ts values. */
function tone(ctx: Ctx, out: AudioNode, t0: number, o: NearTone): void {
  const start = t0 + (o.at ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(o.from, start);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, start + o.dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(o.gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur);
  osc.connect(g);
  g.connect(out);
  osc.start(start);
  osc.stop(start + o.dur + 0.02);
}

/** Placeholders: one or three soft tones per sound, each at its row. V24a replaces them. */
export const NEAR_RECIPES: Record<NearName, Recipe> = {
  blub: (c, o, t) => tone(c, o, t, { from: 300, to: 500, dur: 0.3, gain: 0.2 }),
  giechel: (c, o, t) => tone(c, o, t, { from: 600, to: 800, dur: 0.5, gain: 0.2 }),
  snuffel: (c, o, t) => tone(c, o, t, { from: 400, to: 300, dur: 0.4, gain: 0.2 }),
  snurk: (c, o, t) => tone(c, o, t, { from: 250, to: 200, dur: 0.8, gain: 0.1 }),
  sis: (c, o, t) => tone(c, o, t, { from: 900, to: 700, dur: 0.5, gain: 0.12 }),
  deuntje: (c, o, t) => {
    [523, 659, 784].forEach((f, i) => tone(c, o, t, { from: f, at: i * 0.3, dur: 0.3, gain: 0.15 }));
  },
};
