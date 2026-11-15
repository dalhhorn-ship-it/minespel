// Decision 127: validate.py checks the `blad` topic of a sheet module against its BRON.md.
// The app's validate.ts does not read BRON.md (it is not in the bundle), so only validate.py has this rule.
import { describe, expect, it } from 'vitest';

interface NodeModules {
  fs: {
    mkdtempSync(prefix: string): string;
    cpSync(src: string, dest: string, o: { recursive: boolean }): void;
    readFileSync(p: string, enc: string): string;
    writeFileSync(p: string, data: string): void;
    rmSync(p: string, o: { recursive: boolean; force: boolean }): void;
  };
  os: { tmpdir(): string };
  cp: { spawnSync(cmd: string, args: string[], o: { encoding: string }): { status: number | null; stdout: string; error?: Error } };
}
const getModule = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule;
const node: NodeModules = {
  fs: getModule('node:fs') as NodeModules['fs'],
  os: getModule('node:os') as NodeModules['os'],
  cp: getModule('node:child_process') as NodeModules['cp'],
};

function python(dir: string): { ok: boolean; out: string } {
  const r = node.cp.spawnSync('python3', ['-I', 'docs/modules/validate.py', dir], { encoding: 'utf8' });
  if (r.error) throw r.error;
  return { ok: r.status === 0, out: r.stdout };
}

/** A copy of the Runaway module with one change made to a file. */
function copyWith(file: string, change: (text: string) => string): string {
  const dir = node.fs.mkdtempSync(`${node.os.tmpdir()}/sheet-`);
  node.fs.cpSync('docs/modules/engels-runaway', dir, { recursive: true });
  const path = `${dir}/${file}`;
  node.fs.writeFileSync(path, change(node.fs.readFileSync(path, 'utf8')));
  return dir;
}

describe('sheet source check in validate.py (decision 127)', () => {
  it('passes the real sheet module', () => {
    expect(python('docs/modules/engels-runaway').ok).toBe(true);
  });

  it('fails when a blad option is not on the sheet', () => {
    const dir = copyWith('blad.json', (t) => t.replace('"oplader"', '"lader"'));
    try {
      const r = python(dir);
      expect(r.ok).toBe(false);
      expect(r.out).toContain("'lader' is not in BRON.md");
    } finally {
      node.fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when BRON.md has a different meaning than the blad items', () => {
    const dir = copyWith('BRON.md', (t) => t.replace('- Excuse me. = Sorry.', '- Excuse me. = Pardon.'));
    try {
      const r = python(dir);
      expect(r.ok).toBe(false);
      expect(r.out).toContain("'Sorry.' is not in BRON.md");
    } finally {
      node.fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when a blad topic has no BRON.md', () => {
    const dir = copyWith('BRON.md', (t) => t);
    node.fs.rmSync(`${dir}/BRON.md`, { recursive: true, force: true });
    try {
      const r = python(dir);
      expect(r.ok).toBe(false);
      expect(r.out).toContain('needs a BRON.md');
    } finally {
      node.fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
