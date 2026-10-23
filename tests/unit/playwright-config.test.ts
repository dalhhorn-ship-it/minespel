// R1a: the local e2e switch changes the browser only when E2E_LOCAL=1.
import { afterEach, describe, expect, it, vi } from 'vitest';

interface Project {
  name: string;
  grep?: RegExp;
  grepInvert?: RegExp;
  use: { defaultBrowserType?: string; hasTouch?: boolean; launchOptions?: { executablePath?: string; args?: string[] } };
}
interface Cfg {
  projects: Project[];
}

async function load(env: Record<string, string | undefined>): Promise<Cfg> {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, '');
    else vi.stubEnv(k, v);
  }
  return (await import('../../playwright.config')).default as unknown as Cfg;
}

afterEach(() => vi.unstubAllEnvs());

describe('R1a: playwright config', () => {
  it('R1a: without E2E_LOCAL the projects keep WebKit and have no launch options', async () => {
    const cfg = await load({ E2E_LOCAL: '' });
    expect(cfg.projects.length).toBe(3);
    for (const p of cfg.projects) {
      expect(p.use.launchOptions).toBeUndefined();
      expect(p.use.defaultBrowserType).toBe('webkit');
      expect(p.use.hasTouch).toBe(true);
    }
  });

  it('R1a: E2E_LOCAL=1 runs every project in Chromium from the disk path', async () => {
    const cfg = await load({ E2E_LOCAL: '1', E2E_CHROMIUM: '' });
    for (const p of cfg.projects) {
      expect(p.use.defaultBrowserType).toBe('chromium');
      expect(p.use.hasTouch).toBe(true);
      expect(p.use.launchOptions?.executablePath).toBe('/opt/pw-browsers/chromium');
      expect(p.use.launchOptions?.args).toContain('--no-sandbox');
    }
  });

  it('R1a: E2E_LOCAL changes neither the project names nor their grep filters', async () => {
    const plain = await load({ E2E_LOCAL: undefined });
    const local = await load({ E2E_LOCAL: '1' });
    const pick = (c: Cfg) => c.projects.map((p) => ({ name: p.name, grep: p.grep, grepInvert: p.grepInvert }));
    expect(pick(local)).toEqual(pick(plain));
    expect(pick(plain).map((p) => p.name)).toEqual(['ipad-landscape', 'ipad-portrait', 'ipad-pro-landscape']);
  });

  it('R1a: E2E_CHROMIUM overrides the browser path', async () => {
    const cfg = await load({ E2E_LOCAL: '1', E2E_CHROMIUM: '/x/chrome' });
    expect(cfg.projects[0]?.use.launchOptions?.executablePath).toBe('/x/chrome');
  });
});
