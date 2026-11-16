// AC228 for v17: no banned word in any knight string, and every sound is short and soft.
// The project has no Node types, so fs comes from the process, like vite.config.ts does.
type Fs = { readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean }; readFileSync(p: string, enc: string): string };
const { readdirSync, readFileSync, statSync } = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
).process.getBuiltinModule('node:fs') as Fs;
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { findBannedWords } from '../../src/core/kid-words';
import { GEAR, GEAR_SLOTS, MAX_KRACHT, MIN_FIGHT_SECONDS, kracht, moedRate, type Worn } from '../../src/knights/gear';
import * as moleLines from '../../src/monsters/mole-lines';
import { STONES } from '../../src/world/stones';
import { NEAR_NAMES, NEAR_SPECS } from '../../src/audio/near-recipes';
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
  // v19 Ridderuitrusting: the gear table, its economy, the shop row, the Uitrusten screen and the pictures (AC268).
  'src/knights/gear.ts',
  'src/knights/gear-economy.ts',
  'src/ui/shop-gear.ts',
  'src/ui/gear-screen.ts',
  'src/ui/knight-picture.ts',
  'src/ui/gear-icon.ts',
  // v20 Diepe edelstenen: the stone table, the flow, the economy and the shop row (AC279).
  'src/world/stones.ts',
  'src/app/stones-flow.ts',
  'src/app/stones-economy.ts',
  'src/ui/shop-stones.ts',
  // v21 Meer uitrusting: the knight model with the bubbles and the mounts (AC289).
  'src/render/knight-model.ts',
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

  it('AC255: every mole line of mole-lines.ts is a text in the monster files, so it shows whatever the sound does', () => {
    const all = [...readdirSync('src/monsters').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => `src/monsters/${f}`), 'src/ui/mole-card.ts']
      .flatMap((f) => literals(f))
      .join('\n');
    const lines = (Object.values(moleLines) as unknown[]).filter((v): v is string => typeof v === 'string');
    expect(lines.length).toBeGreaterThanOrEqual(12);
    for (const line of lines) {
      expect(all, line).toContain(line);
      expect(findBannedWords(line), line).toEqual([]);
    }
    // The card of AC292 and the lines that other files hold (the tease, the sorry line, the lonely line) stay in the scan.
    for (const line of ['Boe!', 'Hmpf! Ik kan er niet bij.', 'Niemand om mee te spelen...', 'Ik ga slapen', 'Oké, oké, ik ga al!', 'Onder de gele streep slaapt de Monstermol. Graaf je verder? Dan wordt de Monstermol wakker!'])
      expect(all, line).toContain(line);
    // 0.12.0 said "Hihi! Waar zijn de dieren?" as a toast; AC293 retires it for good.
    expect(all).not.toContain('Hihi! Waar zijn de dieren?');
  });

  it('AC255: with reduced motion boot hands the monster system no shake', () => {
    expect(readFileSync('src/app/boot.ts', 'utf8')).toMatch(/shake:\s*reducedMotion\s*\?\s*undefined/);
  });
});

describe('knight gear strings (AC268)', () => {
  const GEAR_FILES = ['src/knights/gear.ts', 'src/knights/gear-economy.ts', 'src/ui/shop-gear.ts', 'src/ui/gear-screen.ts', 'src/ui/knight-picture.ts', 'src/ui/gear-icon.ts'];

  it('AC268: the gear files are scanned and hold strings', () => {
    for (const f of GEAR_FILES) expect(KNIGHT_FILES, f).toContain(f);
  });

  it('AC268: no gear string says a knight is weak or must have gear', () => {
    const bad: string[] = [];
    for (const f of GEAR_FILES)
      for (const s of literals(f)) {
        const t = s.toLowerCase();
        if (/\bzwak\b|\bmoet\b|nodig om/.test(t) && /ridder/.test(t)) bad.push(`${f}: "${s}"`);
        if (/\bzwak\b/.test(t)) bad.push(`${f}: "${s}"`);
      }
    expect(bad).toEqual([]);
  });

  it('AC268: no new sound for gear, and the Kietelveer reuses the soft hihihi', () => {
    expect(SOUND_SPECS.hihihi.peak).toBeLessThanOrEqual(Math.max(...SOUNDS_0_6_0.map((n) => SOUND_SPECS[n].peak)));
    expect(readFileSync('src/monsters/moed.ts', 'utf8')).toContain("ctx.play('hihihi')");
  });
});

describe('stone strings (AC279)', () => {
  const STONE_FILES = ['src/world/stones.ts', 'src/app/stones-flow.ts', 'src/app/stones-economy.ts', 'src/ui/shop-stones.ts'];

  it('AC279: the stone files are scanned, hold strings and hold no banned word', () => {
    const bad: string[] = [];
    for (const f of STONE_FILES) {
      expect(KNIGHT_FILES, f).toContain(f);
      expect(literals(f).length, f).toBeGreaterThan(0);
      for (const s of literals(f)) {
        const found = findBannedWords(s);
        if (found.length) bad.push(`${f}: "${s}" holds ${found.join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('AC279: every stone name is free of banned words', () => {
    expect(findBannedWords(STONES.map((s) => s.name).join(' '))).toEqual([]);
  });
});

describe('v21 gear strings and caps (AC289)', () => {
  const V21_FILES = ['src/knights/gear.ts', 'src/ui/shop-gear.ts', 'src/ui/gear-screen.ts', 'src/ui/gear-icon.ts', 'src/ui/knight-picture.ts', 'src/render/knight-model.ts'];
  const ALL_EIGHT: Worn = {};
  for (const slot of GEAR_SLOTS) ALL_EIGHT[slot] = GEAR.filter((g) => g.slot === slot).sort((a, b) => b.price - a.price)[0]!.id;

  it('AC289: the 21 items fill 8 slots and every name is free of banned words', () => {
    expect(GEAR).toHaveLength(21);
    expect(new Set(GEAR.map((g) => g.slot)).size).toBe(8);
    expect(findBannedWords(GEAR.map((g) => g.name).join(' '))).toEqual([]);
  });

  it('AC289: the v21 files are scanned, hold no banned word and no string says a knight is weak or must have gear', () => {
    const bad: string[] = [];
    for (const f of V21_FILES) {
      expect(KNIGHT_FILES, f).toContain(f);
      for (const s of literals(f)) {
        const found = findBannedWords(s);
        if (found.length) bad.push(`${f}: "${s}" holds ${found.join(', ')}`);
        const t = s.toLowerCase();
        if (/\bzwak\b/.test(t) || (/\bmoet\b|nodig om/.test(t) && /ridder/.test(t))) bad.push(`${f}: "${s}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('AC289: the new gear adds no sound and no network call', () => {
    expect(SOUND_NAMES).toHaveLength(Object.keys(SOUND_SPECS).length);
    for (const n of SOUND_NAMES) expect(SOUND_SPECS[n].seconds).toBeLessThan(1.5);
    expect(readFileSync('src/render/knight-model.ts', 'utf8')).not.toMatch(/createOscillator|AudioContext|\.play\(/);
  });

  it('AC289: with all 8 slots filled Kracht is at most 5 and three knights never fill a Moed bar in under 3 seconds', () => {
    const k = kracht(ALL_EIGHT);
    expect(k).toBeLessThanOrEqual(MAX_KRACHT);
    expect(k).toBe(5);
    for (const full of [15, 30, 60]) {
      const rate = moedRate([k, k, k], full);
      expect(full / rate, `full ${full}`).toBeGreaterThanOrEqual(MIN_FIGHT_SECONDS);
    }
  });
});

// v22 to v24 (decision 144): the new files hold no banned word and no pressure to buy or hurry, and no network call.
const V22_V24_FILES = [
  ...['src/lavakip', 'src/audio'].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && (dir !== 'src/audio' || f.startsWith('near-')))
      .map((f) => `${dir}/${f}`),
  ),
  ...readdirSync('src/monsters').filter((f) => /^(mole-.*|bubble-hud)\.ts$/.test(f) && !f.endsWith('.test.ts')).map((f) => `src/monsters/${f}`),
  'src/knights/guard-set.ts',
  'src/knights/guard-report.ts',
  'src/app/bubble-hud-flow.ts',
  'src/render/lavakip-bar-model.ts',
  'src/ui/bubble-pill.ts',
  'src/ui/actor-labels.ts',
  'src/ui/lavakip-card.ts',
  'src/ui/mole-tap-card.ts',
  'src/ui/mole-card.ts',
  'src/ui/shop-lavakip.ts',
  'src/ui/speech.ts',
];
/** Words that push a kid to buy or hurry (no countdown, no scarcity, no guilt). */
const PRESSURE = /\b(snel|haast|schiet op|laatste kans|nu of nooit|alleen vandaag|alleen nu|mis het niet|bijna op|beperkt|op is op|anders is het te laat|je moet)\b/i;

describe('Lavakip, the pill, the near sounds and the new mole files (v22 to v24)', () => {
  it('the scan reads every new file and finds strings in the ones that have text', () => {
    expect(V22_V24_FILES.length).toBeGreaterThanOrEqual(25);
    for (const f of V22_V24_FILES) expect(() => literals(f), f).not.toThrow();
    for (const f of ['src/lavakip/lavakip-types.ts', 'src/ui/lavakip-card.ts', 'src/ui/shop-lavakip.ts', 'src/monsters/mole-lines.ts', 'src/audio/near-mix.ts'])
      expect(V22_V24_FILES, f).toContain(f);
  });
  it('AC255 AC314: no string literal holds a banned word or a word of pressure', () => {
    const bad: string[] = [];
    for (const f of V22_V24_FILES)
      for (const s of literals(f)) {
        const found = findBannedWords(s);
        if (found.length) bad.push(`${f}: "${s}" holds ${found.join(', ')}`);
        if (PRESSURE.test(s)) bad.push(`${f}: "${s}" puts pressure on the kid`);
      }
    expect(bad).toEqual([]);
  });
  it('AC225: no new file calls the network or holds a web address', () => {
    const bad = V22_V24_FILES.filter((f) => NETWORK.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
    expect(bad).toEqual([]);
  });
});

describe('the near sounds and the snack sound (V24c, AC322 AC326)', () => {
  const loudest = Math.max(...SOUNDS_0_6_0.map((n) => SOUND_SPECS[n].peak));

  it('AC322: the six near sounds are under 1.5 s, no louder than the loudest 0.6.0 sound, and none is named growl, scream or roar', () => {
    expect(NEAR_NAMES).toEqual(['blub', 'giechel', 'snuffel', 'snurk', 'sis', 'deuntje']);
    for (const n of NEAR_NAMES) {
      expect(NEAR_SPECS[n].seconds, `${n} seconds`).toBeLessThan(1.5);
      expect(NEAR_SPECS[n].peak, `${n} peak`).toBeLessThanOrEqual(loudest);
      expect(n).not.toMatch(/growl|scream|roar/i);
    }
  });
  it('AC322: the snack sound hap is short and soft too', () => {
    expect(SOUND_NAMES).toContain('hap');
    expect(SOUND_SPECS.hap.seconds).toBeLessThan(1.5);
    expect(SOUND_SPECS.hap.peak).toBeLessThanOrEqual(loudest);
  });
});

describe('AC336: the mole and knight strings of v22 never say must, never say a knight is needed, never threaten', () => {
  const FILES = V22_V24_FILES.filter((f) => /src\/(monsters\/mole-|knights\/guard-|app\/bubble-hud|ui\/(mole-|bubble-pill|speech))/.test(f));
  const THREAT = /\b(straf|pak je|ik krijg je|opeten|dood|bang|gevaar|griezel|eng)\b/i;
  const NEED_KNIGHT = /(koop|nodig|alleen met|zonder).*ridder|ridder.*(koop|nodig|moet)/i;

  it('AC336: the scan reads the mole, guard and pill files', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(6);
    expect(FILES.some((f) => f.endsWith('mole-lines.ts'))).toBe(true);
  });
  it('AC336: no string holds "moet", asks for a knight or sounds like a threat', () => {
    const bad: string[] = [];
    for (const f of FILES)
      for (const s of literals(f)) {
        if (/\bmoet(en)?\b/i.test(s)) bad.push(`${f}: "${s}" says must`);
        if (NEED_KNIGHT.test(s)) bad.push(`${f}: "${s}" says a knight is needed`);
        if (THREAT.test(s)) bad.push(`${f}: "${s}" sounds like a threat`);
      }
    expect(bad).toEqual([]);
  });
});
