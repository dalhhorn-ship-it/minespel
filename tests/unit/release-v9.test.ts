// AC171: the v9 build has version 0.3.0 and a kid readable 0.3.0 changelog entry above 0.2.0.
import { describe, expect, it } from 'vitest';

interface Fs {
  readFileSync(p: string, enc: string): string;
}
const getModule = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule;
const fs = getModule('node:fs') as Fs;

describe('v9 release', () => {
  it('AC171: package.json has version 0.3.0 or later', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    const [major = 0, minor = 0] = pkg.version.split('.').map(Number);
    expect(major * 1000 + minor).toBeGreaterThanOrEqual(3);
  });

  it('AC171: CHANGELOG has a 0.3.0 entry', () => {
    const log = fs.readFileSync('CHANGELOG.md', 'utf8');
    const v3 = log.indexOf('## 0.3.0');
    expect(v3).toBeGreaterThan(-1);
    const v2 = log.indexOf('## 0.2.0');
    expect(v3).toBeLessThan(v2);
    expect(log.slice(v3, v2)).toMatch(/punt/i);
  });
});
