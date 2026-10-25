// AC191: the v11 build has version 0.5.0 and a kid readable 0.5.0 changelog entry above 0.4.0.
import { describe, expect, it } from 'vitest';

interface Fs {
  readFileSync(p: string, enc: string): string;
}
const getModule = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule;
const fs = getModule('node:fs') as Fs;

describe('v11 release', () => {
  it('AC191: package.json has version 0.5.0 or later', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    const [major = 0, minor = 0] = pkg.version.split('.').map(Number);
    expect(major > 0 || minor >= 5).toBe(true);
  });

  it('T68: __APP_VERSION__ is defined from package.json in vite.config.ts and in tests', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    const cfg = fs.readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toMatch(/__APP_VERSION__:\s*JSON\.stringify\(pkg\.version\)/);
    expect(cfg).toContain("./package.json");
    expect(__APP_VERSION__).toBe(pkg.version);
  });

  it('AC191: CHANGELOG has a 0.5.0 entry about villages, a villager question, a dance and a rare block', () => {
    const log = fs.readFileSync('CHANGELOG.md', 'utf8');
    const v5 = log.indexOf('## 0.5.0 (2026-10-24)');
    const v4 = log.indexOf('## 0.4.0');
    expect(v5).toBeGreaterThan(-1);
    expect(v5).toBeLessThan(v4);
    expect(log).not.toContain('## Unreleased\n\n* ');
    const entry = log.slice(v5, v4);
    expect(entry).toMatch(/villages/i);
    expect(entry).toMatch(/villager/i);
    expect(entry).toMatch(/question/i);
    expect(entry).toMatch(/dance/i);
    expect(entry).toMatch(/rare block/i);
    expect(entry).not.toMatch(/ [-–—] /);
  });
});
