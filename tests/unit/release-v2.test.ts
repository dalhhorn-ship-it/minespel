// AC159: the v2 build has version 0.2.0 and a kid readable 0.2.0 changelog entry.
import { describe, expect, it } from 'vitest';

interface Fs {
  readFileSync(p: string, enc: string): string;
}
const getModule = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule;
const fs = getModule('node:fs') as Fs;

describe('v2 release', () => {
  it('AC159: package.json has version 0.2.0', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.2.0');
  });

  it('AC159: CHANGELOG.md has a 0.2.0 entry that names the exams and the golden dino', () => {
    const log = fs.readFileSync('CHANGELOG.md', 'utf8');
    const start = log.indexOf('0.2.0');
    expect(start).toBeGreaterThan(-1);
    const entry = log.slice(start, log.indexOf('## 0.1.0', start));
    expect(entry).toMatch(/exam/i);
    expect(entry).toMatch(/golden dino/i);
  });
});
