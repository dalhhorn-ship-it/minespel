// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { el } from './dom';

describe('el', () => {
  it('builds an element with class, attributes and children', () => {
    const child = el('span', { text: 'b' });
    const node = el('div', { class: 'a b', attrs: { role: 'alert' } }, ['x', child]);
    expect(node.className).toBe('a b');
    expect(node.getAttribute('role')).toBe('alert');
    expect(node.textContent).toBe('xb');
  });

  it('sets text as plain text, never as markup', () => {
    const node = el('p', { text: '<img src=x onerror=alert(1)>' });
    expect(node.querySelector('img')).toBeNull();
    expect(node.textContent).toBe('<img src=x onerror=alert(1)>');
    const withString = el('p', {}, ['<b>hoi</b>']);
    expect(withString.querySelector('b')).toBeNull();
  });
});
