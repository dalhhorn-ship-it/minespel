// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { onTap } from './tap';

function ptr(type: string, id: number, x = 0, y = 0): Event {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}

function setup() {
  const button = document.createElement('button');
  let time = 1000;
  let count = 0;
  onTap(button, () => count++, { now: () => time });
  const tap = (id = 1, x = 0, y = 0) => {
    button.dispatchEvent(ptr('pointerdown', id, x, y));
    button.dispatchEvent(ptr('pointerup', id, x, y));
  };
  return { tap, advance: (ms: number) => (time += ms), count: () => count, button };
}

describe('onTap', () => {
  it('acts on a tap', () => {
    const t = setup();
    t.tap();
    expect(t.count()).toBe(1);
  });

  it('acts once on a double tap', () => {
    const t = setup();
    t.tap();
    t.advance(120);
    t.tap();
    expect(t.count()).toBe(1);
  });

  it('acts again after a pause', () => {
    const t = setup();
    t.tap();
    t.advance(600);
    t.tap();
    expect(t.count()).toBe(2);
  });

  it('ignores a drag', () => {
    const t = setup();
    t.button.dispatchEvent(ptr('pointerdown', 1, 0, 0));
    t.button.dispatchEvent(ptr('pointerup', 1, 40, 0));
    expect(t.count()).toBe(0);
  });

  it('ignores a cancelled touch and an up from another pointer', () => {
    const t = setup();
    t.button.dispatchEvent(ptr('pointerdown', 1));
    t.button.dispatchEvent(ptr('pointercancel', 1));
    t.button.dispatchEvent(ptr('pointerup', 1));
    t.button.dispatchEvent(ptr('pointerdown', 2));
    t.button.dispatchEvent(ptr('pointerup', 3));
    expect(t.count()).toBe(0);
  });
});
