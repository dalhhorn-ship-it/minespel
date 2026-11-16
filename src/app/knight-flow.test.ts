// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { KnightState } from '../knights/knight-types';
import { createKnightFlow } from './knight-flow';

const knight = (mode: 'follow' | 'stay' | 'guard'): KnightState =>
  ({ id: 'a', mode, spot: { x: 20, y: 5, z: 20 }, body: { x: 20, y: 5, z: 20 } }) as unknown as KnightState;

function setup(animals: { kind: string; x: number; y: number; z: number }[] = []) {
  const say = vi.fn();
  const play = vi.fn();
  const layer = document.createElement('div');
  const screens = {
    showKidOverlay: vi.fn((n: HTMLElement | null) => layer.replaceChildren(...(n ? [n] : []))),
    showWorld: vi.fn(() => layer.replaceChildren()),
  };
  const setMode = vi.fn();
  const flow = createKnightFlow({ say, screens, setMode, animals: () => animals, sound: { play } });
  return { say, play, layer, screens, setMode, flow };
}

describe('knight flow', () => {
  it('says the arrival and the salute lines', () => {
    const say = vi.fn();
    const flow = createKnightFlow({ say });
    flow.onEvent('arrived', {} as KnightState);
    flow.onEvent('salute', {} as KnightState);
    expect(say.mock.calls).toEqual([['Ridder tot je dienst!'], ['Hallo!']]);
  });
  it('arrival plays the soft fanfare', () => {
    const s = setup();
    s.flow.onEvent('arrived', knight('follow'));
    expect(s.play).toHaveBeenCalledWith('ridder');
  });
  it('without screens the menu is a safe no op', () => {
    expect(() => createKnightFlow().openMenu({} as KnightState)).not.toThrow();
  });
  it('AC203: the menu opens as a kid overlay with 3 modes and closes back to the world', () => {
    const s = setup();
    s.flow.openMenu(knight('stay'));
    expect(s.screens.showKidOverlay).toHaveBeenCalledTimes(1);
    const labels = [...s.layer.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['Volg mij', 'Blijf hier', 'Pas op de dieren', 'Sluiten']);
    expect(s.layer.querySelector('[data-mode="stay"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(s.say).not.toHaveBeenCalled();
  });
  it('AC203: a pick changes the mode of that knight', () => {
    const s = setup();
    s.flow.openMenu(knight('follow'));
    const btn = s.layer.querySelector('[data-mode="guard"]')!;
    btn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 1, clientY: 1 }));
    btn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: 1, clientY: 1 }));
    expect(s.setMode).toHaveBeenCalledWith('a', 'guard');
  });
  it('AC206: a tap on a guard knight says the report', () => {
    const s = setup([{ kind: 'compy', x: 22, y: 5, z: 20 }, { kind: 'kip', x: 20, y: 5, z: 25 }]);
    s.flow.openMenu(knight('guard'));
    expect(s.say).toHaveBeenCalledWith("Ik pas op 1 dino en 1 kip. Alles veilig!");
    expect(s.layer.querySelector('.knight-menu-status')!.textContent).toContain('Alles veilig!');
  });
  it('AC206: no animals near says there are none', () => {
    const s = setup();
    s.flow.openMenu(knight('guard'));
    expect(s.say).toHaveBeenCalledWith('Hier zijn nog geen dieren.');
  });

  it('AC261: Uitrusten opens the gear screen, Terug reopens the menu', () => {
    const layer = document.createElement('div');
    const screens = {
      showKidOverlay: vi.fn((n: HTMLElement | null) => layer.replaceChildren(...(n ? [n] : []))),
      showWorld: vi.fn(() => layer.replaceChildren()),
    };
    const flow = createKnightFlow({
      screens,
      gear: { state: () => ({ owned: ['pony'], worn: {} }), wear: async () => true },
      knightList: () => [{ id: 'a' }],
    });
    flow.openMenu(knight('stay'));
    const labels = [...layer.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['Volg mij', 'Blijf hier', 'Pas op de dieren', 'Uitrusten', 'Sluiten']);
    const tapIt = (n: Element) => {
      n.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 1, clientY: 1 }));
      n.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: 1, clientY: 1 }));
    };
    tapIt(layer.querySelector('[data-action="gear"]')!);
    expect(layer.querySelector('.gear-screen-card')).not.toBeNull();
    expect(layer.querySelector('.knight-menu-card')).toBeNull();
    expect(screens.showWorld).not.toHaveBeenCalled();
    tapIt(layer.querySelector('[data-action="back"]')!);
    expect(layer.querySelector('.knight-menu-card')).not.toBeNull();
    expect(layer.querySelector('.gear-screen-card')).toBeNull();
  });
  it('AC316: the menu asks the feeder for this knight and draws no extra button until V23c', () => {
    const menuOption = vi.fn(() => null);
    const layer = document.createElement('div');
    const screens = {
      showKidOverlay: vi.fn((n: HTMLElement | null) => layer.replaceChildren(...(n ? [n] : []))),
      showWorld: vi.fn(),
    };
    const flow = createKnightFlow({ screens, say: vi.fn(), feeder: () => ({ menuOption }) });
    flow.openMenu(knight('stay'));
    expect(menuOption).toHaveBeenCalledWith({ kind: 'knight', id: 'a' });
    expect([...layer.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Volg mij', 'Blijf hier', 'Pas op de dieren', 'Sluiten']);
  });
  it('AC337: a chase knight opens the menu with his own label and status', () => {
    const s = setup();
    s.flow.openMenu({ ...knight('stay'), mode: 'chase' } as KnightState);
    expect(s.layer.querySelector('.knight-menu-status')?.textContent).toBe('Ik jaag monsters weg!');
  });
});
