import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../../app/app-env';
import { createScreens } from '../../app/screens';
import { loadCatalog } from '../../content/catalog';
import { readSwitches, setModuleOn, setTopicOn } from '../../content/switches';
import { lesboekEntries, openLesboek } from './lesboek';

let ids = 1;
function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
function tap(target: Element | null | undefined): void {
  if (!target) throw new Error('nothing to tap');
  const id = ids++;
  target.dispatchEvent(ptr('pointerdown', id));
  target.dispatchEvent(ptr('pointerup', id));
}
const until = (fn: () => unknown) => vi.waitFor(() => expect(fn()).toBeTruthy(), { timeout: 4000 });
const put = vi.fn();
const env = { records: { get: () => Promise.reject(new Error('Lesboek must not read')), put, update: put }, db: null } as unknown as AppEnv;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => (ids += 1000));
});
afterEach(() => {
  vi.restoreAllMocks();
  put.mockClear();
  document.body.replaceChildren();
});

describe('Lesboek', () => {
  it('lists every switched on topic of every module (AC51)', async () => {
    const catalog = await loadCatalog();
    const all = lesboekEntries(catalog, readSwitches(null));
    for (const m of catalog.modules()) {
      expect(all.filter((e) => e.moduleId === m.id).map((e) => e.topicId)).toEqual(catalog.topics(m.id).map((t) => t.id));
    }
    const rekenen = catalog.modules().find((m) => m.generated)!.id;
    const off = setTopicOn(setModuleOn(readSwitches(null), 'cito-taalverzorging', false), rekenen, 'tafels', false);
    const some = lesboekEntries(catalog, off);
    expect(some.some((e) => e.moduleId === 'cito-taalverzorging')).toBe(false);
    expect(some.some((e) => e.topicId === 'tafels')).toBe(false);
    expect(some.some((e) => e.topicId === 'optellen')).toBe(true);
  });

  it('opens a lesson page by page and goes back to the list, writing nothing', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const screens = createScreens(host);
    const close = openLesboek(screens, env, { catalog: () => loadCatalog(), switches: () => Promise.resolve(readSwitches(null)) });
    expect(screens.current()).toBe('kid-overlay');
    await until(() => host.querySelector('[data-lesboek-topic="rekenen-basis/optellen"]'));
    expect(host.querySelectorAll('.lesboek-module').length).toBeGreaterThanOrEqual(2);
    tap(host.querySelector('[data-lesboek-topic="rekenen-basis/optellen"]'));
    await until(() => host.querySelector('.lesson-view'));
    expect(host.querySelector('.lesboek-title')?.textContent).toBe('Optellen');
    for (let i = 0; i < 12 && host.querySelector('.lesson-next:not(.lesson-finish)'); i++) tap(host.querySelector('.lesson-next'));
    expect(host.querySelector('.lesson-next')?.textContent).toBe('Ik snap het!');
    tap(host.querySelector('.lesson-next'));
    await until(() => host.querySelector('.lesboek-list'));
    tap(host.querySelector('[data-lesboek="back"]'));
    expect(screens.current()).toBe('world');
    expect(put).not.toHaveBeenCalled();
    close(); // safe to call twice
  });

  it('says so when nothing is on, and shows a friendly message when loading fails', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const screens = createScreens(host);
    const catalog = await loadCatalog();
    let sw = readSwitches(null);
    for (const m of catalog.modules()) sw = setModuleOn(sw, m.id, false);
    openLesboek(screens, env, { catalog: () => Promise.resolve(catalog), switches: () => Promise.resolve(sw) });
    await until(() => host.textContent?.includes('Er staan nu geen lessen aan'));
    tap(host.querySelector('[data-lesboek="back"]'));
    expect(screens.current()).toBe('world');

    openLesboek(screens, env, { catalog: () => Promise.reject(new Error('x')), switches: () => Promise.resolve(sw) });
    await until(() => host.textContent?.includes('Het Lesboek kan nu niet open'));
  });
});
