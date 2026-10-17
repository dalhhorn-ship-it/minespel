// validate.py (check.sh) and validate.ts (the app) must give the same verdict on the same module folders.
import { describe, expect, it } from 'vitest';
import { APP_NAME, FORMAT_VERSION } from '../../src/content/format';
import type { ModuleBundle } from '../../src/content/format';
import { validateBundle } from '../../src/content/validate';

// No @types/node in this project: get Node modules through process.getBuiltinModule.
interface NodeModules {
  fs: { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string };
  cp: { spawnSync(cmd: string, args: string[], o: { encoding: string }): { status: number | null; stdout: string; error?: Error } };
}
const getModule = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule;
const node: NodeModules = {
  fs: getModule('node:fs') as NodeModules['fs'],
  cp: getModule('node:child_process') as NodeModules['cp'],
};

const FIXTURES = 'tests/fixtures/modules';
const REAL = 'docs/modules';

/** Same shape the app uses: module.json plus the topic files in module.topics order. */
function loadFolder(dir: string): ModuleBundle {
  const read = (name: string) => JSON.parse(node.fs.readFileSync(`${dir}/${name}.json`, 'utf8')) as unknown;
  const module = read('module') as ModuleBundle['module'];
  const topics = module.topics.flatMap((id) => {
    try {
      return [read(id) as ModuleBundle['topics'][number]];
    } catch {
      return []; // a missing topic file: both validators must complain
    }
  });
  return { app: APP_NAME, kind: 'module', formatVersion: FORMAT_VERSION, createdAt: '2026-10-17T00:00:00.000Z', module, topics };
}

function python(dir: string): boolean {
  const r = node.cp.spawnSync('python3', ['-I', 'docs/modules/validate.py', dir], { encoding: 'utf8' });
  if (r.error) throw r.error;
  return r.status === 0;
}

const folders = [
  ...node.fs.readdirSync(FIXTURES).map((n) => `${FIXTURES}/${n}`),
  ...node.fs.readdirSync(REAL).filter((n) => !n.includes('.') && !n.startsWith('_')).map((n) => `${REAL}/${n}`),
];

describe('validate.py and validate.ts agree', () => {
  it('finds the fixtures and the real module', () => {
    expect(folders).toContain(`${FIXTURES}/good`);
    expect(folders).toContain(`${REAL}/cito-taalverzorging`);
    expect(folders.filter((f) => f.includes('broken-')).length).toBeGreaterThanOrEqual(9);
  });

  for (const dir of folders) {
    it(`same verdict for ${dir}`, () => {
      const py = python(dir);
      const ts = validateBundle(loadFolder(dir), { builtIn: true });
      expect(ts.ok, ts.problems.join('\n')).toBe(py);
      // Good folders pass, broken ones fail, in both.
      expect(py).toBe(!dir.includes('broken-'));
    });
  }
});
