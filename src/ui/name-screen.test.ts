import { describe, expect, it, vi } from 'vitest';
import { LETTER_ROWS, SPECIAL_KEYS } from './learn/kid-keyboard';
import { createNameScreen, NAME_MAX } from './name-screen';

function tap(target: Element, id = 1) {
  for (const type of ['pointerdown', 'pointerup']) {
    const e = new MouseEvent(type, { bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: id });
    target.dispatchEvent(e);
  }
}
const key = (root: HTMLElement, text: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === text)!;

function setup(initial?: string) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const screen = createNameScreen({ initial, onDone, onCancel });
  document.body.append(screen.root);
  const type = (s: string) => {
    for (const c of s) tap(c === ' ' ? key(screen.root, 'spatie') : key(screen.root, c));
  };
  return { screen, onDone, onCancel, type };
}
const field = (root: HTMLElement) => root.querySelector('.name-text')!.textContent;

describe('name screen', () => {
  it('shows the prompt, uses no input element and Klaar starts grey (AC18)', () => {
    const s = setup();
    expect(s.screen.root.textContent).toContain('Bedenk een leuke dinonaam');
    expect(s.screen.root.querySelector('input, textarea, [contenteditable]')).toBeNull();
    expect(key(s.screen.root, 'Klaar').disabled).toBe(true);
  });

  it('types, erases and hands the name over with Klaar', () => {
    const s = setup();
    s.type('rexx');
    tap(key(s.screen.root, '⌫'), 5);
    expect(field(s.screen.root)).toBe('rex');
    expect(key(s.screen.root, 'Klaar').disabled).toBe(false);
    tap(key(s.screen.root, 'Klaar'), 6);
    expect(s.onDone).toHaveBeenCalledWith('rex');
  });

  it('stops at 12 characters (AC18)', () => {
    const s = setup();
    s.type('abcdefghijklmno');
    expect(field(s.screen.root)).toBe('abcdefghijkl');
    expect(s.screen.value()).toHaveLength(NAME_MAX);
    expect(s.screen.root.querySelector('.name-count')?.textContent).toBe('12 van 12');
  });

  it('takes only keyboard characters', () => {
    const allowed = new Set([...LETTER_ROWS.join(''), ...SPECIAL_KEYS.join(''), ' ']);
    const s = setup();
    s.type('é-x y');
    for (const c of s.screen.value()) expect(allowed.has(c.toLowerCase())).toBe(true);
    expect(s.screen.value()).toBe('é-x y');
  });

  it('ignores a leading space and a double space, and trims on Klaar', () => {
    const s = setup();
    s.type(' a  b ');
    expect(field(s.screen.root)).toBe('a b ');
    tap(key(s.screen.root, 'Klaar'), 9);
    expect(s.onDone).toHaveBeenCalledWith('a b');
  });

  it('starts with the current name and Terug cancels', () => {
    const s = setup('Rex');
    expect(field(s.screen.root)).toBe('Rex');
    tap(key(s.screen.root, 'Terug'), 4);
    expect(s.onCancel).toHaveBeenCalledTimes(1);
    expect(s.onDone).not.toHaveBeenCalled();
  });

  it('destroy removes the screen', () => {
    const s = setup();
    s.screen.destroy();
    expect(document.body.contains(s.screen.root)).toBe(false);
  });
});
