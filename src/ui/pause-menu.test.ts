import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScreens } from '../app/screens';
import type { Screens } from '../app/screens';
import { el } from './dom';
import { onTap } from './tap';
import { createPauseMenu, pointsText, setupPauseMenu } from './pause-menu';

/** Plain stand in for the real shop, Lesboek and practice screens. */
function openComingSoon(screens: Screens, title: string, kind: 'kid-overlay' | 'learn' = 'kid-overlay'): () => void {
  let close: () => void = () => {};
  const back = el('button', { attrs: { type: 'button', 'data-pause': 'soon-back' } });
  const stopTap = onTap(back, () => close());
  const node = el('div', { attrs: { 'data-screen-id': 'coming-soon' } }, [
    el('h2', { text: title }),
    el('p', { text: 'Komt nog' }),
    back,
  ]);
  const closeScreen = screens.open(kind, node);
  close = () => {
    stopTap();
    closeScreen();
  };
  return () => close();
}

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const btn = (host: HTMLElement, id: string) => host.querySelector(`[data-pause="${id}"]`) as HTMLElement;

function setup(points: number | (() => Promise<number>) = 12) {
  const host = document.createElement('div');
  document.body.append(host);
  const screens = createScreens(host);
  const calls = { pause: 0, resume: 0, home: 0 };
  const menu = createPauseMenu({
    screens,
    getPoints: typeof points === 'function' ? points : () => Promise.resolve(points),
    pauseWorld: () => { calls.pause++; },
    resumeWorld: () => { calls.resume++; },
    teleportHome: () => { calls.home++; },
    // The real screens have their own tests; here each entry opens a plain stand in.
    openShop: () => openComingSoon(screens, 'Dinowinkel', 'kid-overlay'),
    openLesboek: () => openComingSoon(screens, 'Lesboek', 'kid-overlay'),
    openPractice: () => openComingSoon(screens, 'Extra oefenen', 'learn'),
  });
  return { host, screens, calls, menu };
}
afterEach(() => { document.body.replaceChildren(); });

describe('pause menu', () => {
  it('formats points', () => {
    expect(pointsText(1)).toBe('Je hebt 1 punt');
    expect(pointsText(12)).toBe('Je hebt 12 punten');
    expect(pointsText(NaN)).toBe('Je hebt 0 punten');
  });

  it('opens as a kid overlay, pauses the world and shows the points', async () => {
    const { host, screens, calls, menu } = setup(12);
    menu.open();
    expect(screens.current()).toBe('kid-overlay');
    expect(calls.pause).toBe(1);
    await Promise.resolve();
    expect(btn(host, 'points').textContent).toBe('Je hebt 12 punten');
    for (const t of ['Terug naar de wereld', 'Ik zit vast', 'Dinowinkel', 'Lesboek', 'Extra oefenen']) {
      expect(host.textContent).toContain(t);
    }
  });

  it('Terug naar de wereld closes and resumes once, even on a double tap', () => {
    const { screens, calls, menu, host } = setup();
    menu.open();
    const b = btn(host, 'back');
    tap(b);
    tap(b);
    expect(screens.current()).toBe('world');
    expect(calls.resume).toBe(1);
    expect(calls.home).toBe(0);
  });

  it('Ik zit vast teleports home once and closes', () => {
    const { screens, calls, menu, host } = setup();
    menu.open();
    const b = btn(host, 'stuck');
    tap(b);
    tap(b);
    expect(calls.home).toBe(1);
    expect(screens.current()).toBe('world');
    expect(calls.resume).toBe(1);
  });

  it('does not open twice or over another screen', () => {
    const { screens, calls, menu } = setup();
    menu.open();
    menu.open();
    expect(screens.depth()).toBe(1);
    expect(calls.pause).toBe(1);
    menu.close();
    const closeBreak = screens.open('learn');
    menu.open();
    expect(screens.depth()).toBe(1);
    closeBreak();
  });

  it.each([
    ['shop', 'kid-overlay', 'Dinowinkel'],
    ['lesboek', 'kid-overlay', 'Lesboek'],
    ['practice', 'learn', 'Extra oefenen'],
  ])('%s shows Komt nog on top of the menu and Terug returns to the menu', (id, kind, title) => {
    const { host, screens, menu } = setup();
    menu.open();
    tap(btn(host, id));
    expect(screens.depth()).toBe(2);
    expect(screens.current()).toBe(kind);
    expect(host.querySelector('[data-screen-id="coming-soon"]')?.textContent).toContain('Komt nog');
    expect(host.querySelector('[data-screen-id="coming-soon"]')?.textContent).toContain(title);
    tap(btn(host, 'soon-back'));
    expect(screens.depth()).toBe(1);
    expect(menu.isOpen()).toBe(true);
  });

  it('reads the points again when a screen on top closes', async () => {
    let value = 5;
    const { host, menu } = setup(() => Promise.resolve(value));
    menu.open();
    await Promise.resolve();
    expect(btn(host, 'points').textContent).toBe('Je hebt 5 punten');
    tap(btn(host, 'shop'));
    value = 9;
    tap(btn(host, 'soon-back'));
    await Promise.resolve();
    expect(btn(host, 'points').textContent).toBe('Je hebt 9 punten');
  });

  it('a late answer never overwrites a newer one', async () => {
    const resolvers: Array<(n: number) => void> = [];
    const { host, menu } = setup(() => new Promise<number>((r) => { resolvers.push(r); }));
    menu.open();
    tap(btn(host, 'shop'));
    tap(btn(host, 'soon-back'));
    expect(resolvers).toHaveLength(2);
    resolvers[1]!(20);
    await Promise.resolve();
    resolvers[0]!(3);
    await Promise.resolve();
    expect(btn(host, 'points').textContent).toBe('Je hebt 20 punten');
  });

  it('does not read again when the menu itself closes', async () => {
    const getPoints = vi.fn(() => Promise.resolve(1));
    const { menu } = setup(getPoints);
    menu.open();
    menu.close();
    expect(getPoints).toHaveBeenCalledTimes(1);
  });

  it('setupPauseMenu makes the Pauze button open the menu', () => {
    const { screens } = setup();
    const set = vi.fn();
    const menu = setupPauseMenu({
      screens, getPoints: () => Promise.resolve(0), pauseWorld: () => {}, resumeWorld: () => {}, teleportHome: () => {},
      openShop: () => {}, openLesboek: () => {}, openPractice: () => {}, hud: { setPauseHandler: set },
    });
    expect(set).toHaveBeenCalledOnce();
    (set.mock.calls[0]![0] as () => void)();
    expect(menu.isOpen()).toBe(true);
  });
});
