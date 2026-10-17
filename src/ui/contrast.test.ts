import { describe, expect, it } from 'vitest';
import { contrastRatio, MIN_LARGE_TEXT, MIN_NORMAL_TEXT, parseHex } from './contrast';

// Vitest turns css imports into empty modules, so read the file with Node (no @types/node in this project).
const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');
const css = nodeFs.readFileSync('src/styles/tokens.css', 'utf8');

function tokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) out[m[1]!] = m[2]!;
  return out;
}

describe('contrast helper', () => {
  it('knows black on white is 21 and equal colours are 1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });
  it('is symmetric and reads short hex', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(contrastRatio('#777', '#fff')).toBeCloseTo(contrastRatio('#fff', '#777'), 10);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
  it('rejects a bad colour', () => {
    expect(() => parseHex('blue')).toThrow();
  });
});

describe('kid colour tokens (AC141)', () => {
  const t = tokens();
  const normal: Array<[string, string]> = [
    ['ink', 'sky'],
    ['ink', 'sky-light'],
    ['ink', 'sand'],
    ['ink', 'paper'],
    ['on-grass', 'grass'],
    ['right', 'right-bg'],
    ['right', 'paper'],
    ['wrong', 'wrong-bg'],
    ['wrong', 'paper'],
    ['malus', 'paper'],
    ['malus', 'sand'],
    ['malus', 'sky-light'],
    ['lock', 'sky'],
    ['lock', 'paper'],
  ];
  it.each(normal)('%s on %s is at least 4.5 to 1', (fg, bg) => {
    expect(t[fg], `token ${fg}`).toBeDefined();
    expect(t[bg], `token ${bg}`).toBeDefined();
    expect(contrastRatio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(MIN_NORMAL_TEXT);
  });
  it('a large text minimum exists and is lower', () => {
    expect(MIN_LARGE_TEXT).toBeLessThan(MIN_NORMAL_TEXT);
  });
  it('holds --kid-scale', () => {
      expect(css).toMatch(/--kid-scale:\s*1/);
  });
});
