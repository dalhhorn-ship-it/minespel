// AC228 for v17: no banned word in any knight string, and every sound is short and soft.
// The project has no Node types, so fs comes from the process, like vite.config.ts does.
type Fs = { readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean }; readFileSync(p: string, enc: string): string };
const { readdirSync, readFileSync, statSync } = (
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
  // v18 Zwarte bubbel: Klodder, the bubble, the Moed bar and the model.
  ...readdirSync('src/monsters')
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => `src/monsters/${f}`),
  'src/ui/moed-bar.ts',
  'src/render/klodder-model.ts',
  // v16 Monstermol: the card and the model (src/monsters is read above), V16e.
  'src/ui/mole-card.ts',
  'src/render/mole-model.ts',
  'src/app/boot.ts',
];

const NETWORK = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|https?:\/\//;

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

describe('no network in the knights and monsters (AC225)', () => {
  it('AC225: no knight or monster file calls fetch, a socket or a beacon, or holds a web address', () => {
    const bad = KNIGHT_FILES.filter((f) => NETWORK.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')));
    expect(bad).toEqual([]);
  });
});

describe('knight strings (AC228)', () => {
  it('AC228: the scan reads every knight file and finds strings', () => {
    expect(KNIGHT_FILES.length).toBeGreaterThanOrEqual(25);
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

describe('the Monstermol (V16e, AC255)', () => {
  const MOLE_SOUNDS: SoundName[] = ['rommel', 'boe', 'hmpf', 'geeuw'];

  it('AC255: the four mole sounds have a row, are under 1.5 s and no louder than the loudest 0.6.0 sound', () => {
    const loudest = Math.max(...SOUNDS_0_6_0.map((n) => SOUND_SPECS[n].peak));
    for (const n of MOLE_SOUNDS) {
      expect(SOUND_NAMES, n).toContain(n);
      expect(SOUND_SPECS[n].seconds, `${n} seconds`).toBeLessThan(1.5);
      expect(SOUND_SPECS[n].peak, `${n} peak`).toBeLessThanOrEqual(loudest);
    }
  });

  it('AC255: no file in the project is named growl, scream or roar', () => {
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'test-results') continue;
        const path = `${dir}/${name}`;
        if (/growl|scream|roar/i.test(name)) bad.push(path);
        if (statSync(path).isDirectory()) walk(path);
      }
    };
    for (const dir of ['src', 'public', 'docs/modules']) {
      try {
        walk(dir);
      } catch {
        /* a folder that does not exist has no files */
      }
    }
    expect(bad).toEqual([]);
  });

  it('AC255: every mole line is a text in the monster files, so it shows whatever the sound does', () => {
    const all = [...readdirSync('src/monsters').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => `src/monsters/${f}`), 'src/ui/mole-card.ts']
      .flatMap((f) => literals(f))
      .join('\n');
    for (const line of ['Oei... de grond rommelt!', 'Hihi! Waar zijn de dieren?', 'Boe!', 'Hmpf! Ik kan er niet bij.', 'Niemand om mee te spelen...', 'Ik ga slapen', 'Oké, oké, ik ga al!', 'Pas op! Diep onder de grond woont de Monstermol.', 'Niet verder graven! Onder de streep slaapt de Monstermol.'])
      expect(all, line).toContain(line);
  });

  it('AC255: with reduced motion boot hands the monster system no shake', () => {
    expect(readFileSync('src/app/boot.ts', 'utf8')).toMatch(/shake:\s*reducedMotion\s*\?\s*undefined/);
  });
});
