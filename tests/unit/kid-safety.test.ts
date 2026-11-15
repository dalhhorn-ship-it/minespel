// AC228 for v17: no banned word in any knight string, and every sound is short and soft.
// The project has no Node types, so fs comes from the process, like vite.config.ts does.
type Fs = { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string };
const { readdirSync, readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
).process.getBuiltinModule('node:fs') as Fs;
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { findBannedWords } from '../../src/core/kid-words';
import { createSound, SOUND_NAMES, SOUND_SPECS, type SoundName } from '../../src/audio/sound';

const KNIGHT_FILES = [
  ...readdirSync('src/knights')
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => `src/knights/${f}`),
  'src/ui/knight-menu.ts',
  'src/ui/shop-knights.ts',
  'src/ui/parent/monsters-card.ts',
  'src/app/knight-flow.ts',
];

/** Every string literal and template piece of a source file. */
function literals(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) out.push(n.text);
    ts.forEachChild(n, visit);
  };
  visit(src);
  return out;
}

describe('knight strings (AC228)', () => {
  it('AC228: the scan reads every knight file and finds strings', () => {
    expect(KNIGHT_FILES.length).toBeGreaterThanOrEqual(9);
    for (const f of KNIGHT_FILES) expect(literals(f).length, f).toBeGreaterThan(0);
  });
  it('AC228: no string literal holds a banned word as a whole word', () => {
    const bad: string[] = [];
    for (const f of KNIGHT_FILES)
      for (const s of literals(f)) {
        const found = findBannedWords(s);
        if (found.length) bad.push(`${f}: "${s}" holds ${found.join(', ')}`);
      }
    expect(bad).toEqual([]);
  });
});

/** Runs a sound on a recording context and reports its real length and loudest gain. */
function measure(name: SoundName) {
  let end = 0;
  let peak = 0;
  const gainParam = () => ({
    value: 0,
    setValueAtTime: (v: number) => void (peak = Math.max(peak, v)),
    linearRampToValueAtTime: (v: number) => void (peak = Math.max(peak, v)),
    exponentialRampToValueAtTime: () => undefined,
  });
  const freqParam = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  });
  const node = () => ({ connect: () => undefined, frequency: freqParam(), type: '' });
  const stoppable = () => ({
    ...node(),
    buffer: null,
    start: () => undefined,
    stop: (t: number) => void (end = Math.max(end, t - 0.02)),
  });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    state: 'running',
    resume: () => Promise.resolve(),
    createGain: () => ({ ...node(), gain: gainParam() }),
    createOscillator: stoppable,
    createBufferSource: stoppable,
    createBiquadFilter: node,
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
  };
  const sound = createSound({
    unlock: { isUnlocked: () => true, watch: () => undefined, whenUnlocked: () => undefined },
    createContext: () => ctx as unknown as AudioContext,
    volume: 1,
  });
  sound.play(name);
  return { seconds: end, peak };
}

// The sounds that existed in 0.6.0. Everything else is new in 0.7.0.
const SOUNDS_0_6_0: SoundName[] = ['pop', 'thunk', 'chime', 'hmm', 'clink', 'crack', 'chirp', 'fanfare', 'tick', 'fluit'];

describe('sound caps (AC228)', () => {
  const loudest = Math.max(...SOUNDS_0_6_0.map((n) => SOUND_SPECS[n].peak));

  it('AC228: SOUND_SPECS has a row for every sound', () => {
    expect(Object.keys(SOUND_SPECS).sort()).toEqual([...SOUND_NAMES].sort());
  });
  it('AC228: SOUND_SPECS matches what each recipe really does', () => {
    for (const n of SOUND_NAMES) {
      const m = measure(n);
      expect(m.seconds, `${n} seconds`).toBeCloseTo(SOUND_SPECS[n].seconds, 1);
      expect(m.peak, `${n} peak`).toBeCloseTo(SOUND_SPECS[n].peak, 2);
    }
  });
  it('AC228: every sound is under 1.5 s and no louder than the loudest 0.6.0 sound', () => {
    for (const n of SOUND_NAMES) {
      expect(SOUND_SPECS[n].seconds, `${n} seconds`).toBeLessThan(1.5);
      expect(SOUND_SPECS[n].peak, `${n} peak`).toBeLessThanOrEqual(loudest);
    }
  });
  it('AC228: no sound name holds growl, scream or roar', () => {
    for (const n of SOUND_NAMES) expect(n).not.toMatch(/growl|scream|roar/i);
  });
});
