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

/** The final recipes: only soft triangle and sine tones, one at the row's peak, the end at the row's length. */
export const NEAR_RECIPES: Record<NearName, Recipe> = {
  // The black bubble: two wet little bubbles popping up.
  blub: (c, o, t) => {
    tone(c, o, t, { from: 300, to: 520, dur: 0.15, gain: 0.2 });
    tone(c, o, t, { from: 380, to: 640, at: 0.12, dur: 0.18, gain: 0.16 });
  },
  // Klodder: a giggle of five quick rising and falling notes.
  giechel: (c, o, t) => {
    [620, 760, 640, 780, 700].forEach((f, i) =>
      tone(c, o, t, { from: f, to: f * 1.12, at: i * 0.1, dur: 0.1, gain: i === 0 ? 0.2 : 0.17 }),
    );
  },
  // The free mole: a nose that sniffs, three short puffs.
  snuffel: (c, o, t) => {
    [440, 400, 360].forEach((f, i) => tone(c, o, t, { from: f, to: f * 0.8, at: i * 0.13, dur: 0.1, gain: i === 0 ? 0.2 : 0.15 }));
  },
  // The caught mole: a soft sleepy snore, a high puff in and a low puff out. Quiet and short, not a growl.
  snurk: (c, o, t) => {
    tone(c, o, t, { from: 220, to: 300, dur: 0.35, gain: 0.1 });
    tone(c, o, t, { from: 300, to: 210, at: 0.4, dur: 0.4, gain: 0.08 });
  },
  // The Lavakip-bar: a gentle fizz, a few tiny high ticks, like a warm pot.
  sis: (c, o, t) => {
    [980, 880, 1040, 920].forEach((f, i) => tone(c, o, t, { from: f, to: f * 0.85, at: i * 0.12, dur: 0.14, gain: i === 0 ? 0.12 : 0.09 }));
  },
  // The Lavakip-bar tune: three notes going up, C E G.
  deuntje: (c, o, t) => {
    [523, 659, 784].forEach((f, i) => tone(c, o, t, { from: f, at: i * 0.3, dur: 0.3, gain: 0.15 }));
  },
};
