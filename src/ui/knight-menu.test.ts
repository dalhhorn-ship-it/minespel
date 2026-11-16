// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createKnightMenu } from './knight-menu';

function tap(el: Element | undefined | null) {
  if (!el) return;
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('knight menu lavakip button', () => {
  it('AC316: Lavakip geven shows only with an option, closes the menu, then gives', () => {
    const base = { mode: 'stay' as const, onModeChange: () => {}, onGear: () => {} };
    const none = createKnightMenu({ ...base, onClose: () => {}, lavakip: null });
    expect(none.element.querySelector('[data-action="lavakip"]')).toBeNull();
    none.destroy();
    const order: string[] = [];
    const menu = createKnightMenu({
      ...base,
      onClose: () => order.push('close'),
      lavakip: { text: 'Lavakip geven', give: vi.fn(() => order.push('give')) },
    });
    const btn = menu.element.querySelector('[data-action="lavakip"]');
    expect(btn?.textContent).toBe('Lavakip geven');
    expect(menu.element.querySelectorAll('.knight-menu-grid button')).toHaveLength(6);
    tap(btn);
    expect(order).toEqual(['close', 'give']);
    menu.destroy();
  });
});
