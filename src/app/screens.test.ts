import { describe, expect, it } from 'vitest';
import { createScreens } from './screens';

describe('screens', () => {
  it('is the world when nothing is open, and the top screen decides', () => {
    const host = document.createElement('div');
    const s = createScreens(host);
    expect(s.current()).toBe('world');
    const closeMenu = s.open('kid-overlay', document.createElement('div'));
    const closeParent = s.open('parent');
    expect(s.current()).toBe('parent');
    expect(s.depth()).toBe(2);
    closeParent();
    expect(s.current()).toBe('kid-overlay');
    closeParent(); // closing twice does nothing
    expect(s.depth()).toBe(1);
    closeMenu();
    expect(s.current()).toBe('world');
  });
  it('tells subscribers and shows the node in the layer', () => {
    const host = document.createElement('div');
    const s = createScreens(host);
    const seen: string[] = [];
    const off = s.subscribe((k) => seen.push(k));
    const node = document.createElement('p');
    const close = s.open('learn', node);
    expect(host.contains(node)).toBe(true);
    expect(host.querySelector<HTMLElement>('.screen-layer')?.hidden).toBe(false);
    close();
    expect(host.contains(node)).toBe(false);
    expect(host.querySelector<HTMLElement>('.screen-layer')?.hidden).toBe(true);
    off();
    s.open('exam');
    expect(seen).toEqual(['world', 'learn', 'world']);
  });
  it('closing a lower screen keeps the one above', () => {
    const s = createScreens(document.createElement('div'));
    const a = s.open('kid-overlay');
    s.open('learn');
    a();
    expect(s.current()).toBe('learn');
  });
});
