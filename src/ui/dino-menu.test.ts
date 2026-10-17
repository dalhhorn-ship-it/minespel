import { describe, expect, it, vi } from 'vitest';
import { createDinoMenu } from './dino-menu';

function tap(target: Element, id = 1) {
  for (const type of ['pointerdown', 'pointerup']) {
    const e = new MouseEvent(type, { bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: id });
    target.dispatchEvent(e);
  }
}
const button = (root: HTMLElement, text: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === text)!;

function setup() {
  const container = document.createElement('div');
  document.body.append(container);
  const router = { addIgnoreZone: vi.fn(() => () => {}), ownerOf: () => null, destroy: () => {} };
  const onMode = vi.fn();
  const onClose = vi.fn();
  const onRename = vi.fn();
  const onHug = vi.fn();
  const menu = createDinoMenu({ container, router, onMode, onClose, onRename, onHug });
  return { menu, container, onMode, onClose, onRename, onHug, router };
}

describe('dino menu', () => {
  it('opens with the four choices and the dino kind as title (AC16)', () => {
    const s = setup();
    expect(s.menu.isOpen()).toBe(false);
    expect(s.menu.root.style.display).toBe('none');
    s.menu.open({ id: 4, kind: 'compy', name: '', mode: 'follow' });
    expect(s.menu.isOpen()).toBe(true);
    const texts = [...s.menu.root.querySelectorAll('button')].map((b) => b.textContent);
    expect(texts).toEqual(['Volg mij', 'Blijf hier', 'Naam geven', 'Knuffel', 'Terug naar de wereld']);
    expect(s.menu.root.querySelector('.dino-menu-title')?.textContent).toBe('Compy');
    expect(s.router.addIgnoreZone).toHaveBeenCalled();
  });

  it('shows the name when there is one', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: 'Rex', mode: 'follow' });
    expect(s.menu.root.querySelector('.dino-menu-title')?.textContent).toBe('Rex');
  });

  it('Blijf hier and Volg mij report the choice, Terug closes', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: '', mode: 'follow' });
    tap(button(s.menu.root, 'Blijf hier'), 1);
    expect(s.onMode).toHaveBeenCalledWith(4, 'stay');
    tap(button(s.menu.root, 'Terug naar de wereld'), 2);
    expect(s.menu.isOpen()).toBe(false);
    expect(s.menu.root.style.display).toBe('none');
    expect(s.onClose).toHaveBeenCalledTimes(1);
    s.menu.close();
    expect(s.onClose).toHaveBeenCalledTimes(1);
  });

  it('destroy removes the panel', () => {
    const s = setup();
    s.menu.destroy();
    expect(s.container.children).toHaveLength(0);
  });

  it('Knuffel asks for hearts and closes the menu (AC16)', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: '', mode: 'follow' });
    tap(button(s.menu.root, 'Knuffel'), 1);
    expect(s.onHug).toHaveBeenCalledWith(4);
    expect(s.menu.isOpen()).toBe(false);
    expect(s.onClose).toHaveBeenCalledTimes(1);
  });

  it('marks the current mode as pressed', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: '', mode: 'follow' });
    expect(button(s.menu.root, 'Volg mij').getAttribute('aria-pressed')).toBe('true');
    tap(button(s.menu.root, 'Blijf hier'), 1);
    expect(button(s.menu.root, 'Blijf hier').getAttribute('aria-pressed')).toBe('true');
    expect(button(s.menu.root, 'Volg mij').getAttribute('aria-pressed')).toBe('false');
  });

  it('Naam geven opens the keyboard, Klaar renames and shows the name (AC18)', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: '', mode: 'follow' });
    tap(button(s.menu.root, 'Naam geven'), 1);
    const screen = s.menu.root.querySelector('.name-screen')!;
    expect(screen.textContent).toContain('Bedenk een leuke dinonaam');
    expect(s.menu.root.querySelector<HTMLElement>('.dino-menu-panel')!.hidden).toBe(true);
    expect(screen.querySelector('input, textarea')).toBeNull();
    for (const c of ['r', 'e', 'x']) tap(button(screen as HTMLElement, c), 2);
    tap(button(screen as HTMLElement, 'Klaar'), 3);
    expect(s.onRename).toHaveBeenCalledWith(4, 'rex');
    expect(s.menu.root.querySelector('.name-screen')).toBeNull();
    expect(s.menu.root.querySelector('.dino-menu-title')?.textContent).toBe('rex');
    expect(s.menu.isOpen()).toBe(true);
  });

  it('Terug on the name screen changes nothing', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: 'Rex', mode: 'follow' });
    tap(button(s.menu.root, 'Naam geven'), 1);
    tap(button(s.menu.root.querySelector('.name-screen') as HTMLElement, 'Terug'), 2);
    expect(s.onRename).not.toHaveBeenCalled();
    expect(s.menu.root.querySelector('.name-screen')).toBeNull();
    expect(s.menu.root.querySelector('.dino-menu-title')?.textContent).toBe('Rex');
  });

  it('closing the menu also closes the name screen', () => {
    const s = setup();
    s.menu.open({ id: 4, kind: 'compy', name: '', mode: 'follow' });
    tap(button(s.menu.root, 'Naam geven'), 1);
    s.menu.close();
    expect(s.menu.root.querySelector('.name-screen')).toBeNull();
  });
});
