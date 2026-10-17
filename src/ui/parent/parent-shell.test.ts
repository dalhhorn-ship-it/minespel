import { afterEach, describe, expect, it, vi } from 'vitest';
const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');
import { createScreens } from '../../app/screens';
import type { AppEnv } from '../../app/app-env';
import { PARENT_SECTIONS, openParentArea } from './parent-shell';

const env = {} as AppEnv;
function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const q = (host: HTMLElement, id: string) => host.querySelector(`[data-parent="${id}"]`) as HTMLElement;
function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  return { host, screens: createScreens(host) };
}
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

describe('parent shell', () => {
  it('opens as a parent screen and closes', () => {
    const { host, screens } = setup();
    const onClose = vi.fn();
    const area = openParentArea(screens, env, onClose);
    expect(screens.current()).toBe('parent');
    expect(host.querySelector('.parent')).not.toBeNull();
    tap(q(host, 'close'));
    expect(screens.current()).toBe('world');
    expect(onClose).toHaveBeenCalledTimes(1);
    area.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has the six menu entries in order', () => {
    const { host, screens } = setup();
    openParentArea(screens, env);
    const labels = [...host.querySelectorAll('.parent-menu button')].map((b) => b.textContent);
    expect(labels).toEqual(['Instellingen', 'Inhoud kiezen', 'Examens', 'Resultaten', 'Eigen modules', 'Backup en import', 'Sluiten']);
  });

  it.each(PARENT_SECTIONS.map((s) => [s.id, s.title]))('section %s opens its stub and goes back', (id, title) => {
    const { host, screens } = setup();
    const area = openParentArea(screens, env);
    tap(q(host, `menu-${id}`));
    expect(area.section()).toBe(id);
    const sec = host.querySelector(`[data-parent-section="${id}"]`) as HTMLElement;
    expect(sec.querySelector('h2')?.textContent).toBe(title);
    expect(sec.textContent).toContain('Komt nog');
    expect(screens.current()).toBe('parent');
    expect(screens.depth()).toBe(1);
    tap(q(host, 'section-back'));
    expect(area.section()).toBeNull();
    expect(host.querySelector('[data-parent-section]')).toBeNull();
    expect(screens.current()).toBe('parent');
  });

  it('switching sections replaces the old one', () => {
    const { host, screens } = setup();
    const area = openParentArea(screens, env);
    tap(q(host, 'menu-exams'));
    tap(q(host, 'menu-results'));
    expect(area.section()).toBe('results');
    expect(host.querySelectorAll('[data-parent-section]').length).toBe(1);
  });

  it('parent css keeps inputs at 16 points and buttons at 44 or more', () => {
    const css = nodeFs.readFileSync('src/styles/parent.css', 'utf8');
    expect(css).toMatch(/\.parent input[^{]*\{[^}]*font-size:\s*16px/);
    expect(css).toMatch(/\.parent-btn\s*\{[^}]*min-height:\s*56px/);
  });
});
