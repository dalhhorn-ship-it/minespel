// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { LavakipShopState } from '../lavakip/lavakip-types';
import { createLavakipSection } from './shop-lavakip';

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const q = (root: Element, id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const base: LavakipShopState = { points: 60, bought: false, placed: false, carried: 0, canPlaceHere: true };

function setup(state: LavakipShopState, loaded = true) {
  let now = 0;
  const onBuy = vi.fn();
  const onPlaceHere = vi.fn();
  let root: HTMLElement = document.createElement('div');
  const section = createLavakipSection({ onBuy, onPlaceHere, onChange: () => draw(), now: () => (now += 1000) });
  const draw = () => { root = section.render(state, loaded); };
  draw();
  return { onBuy, onPlaceHere, get root() { return root; } };
}
const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

describe('Lavakip-bar section (AC310, AC311)', () => {
  it('AC310: one card with name, picture and price 60', () => {
    const { root } = setup(base);
    expect(root.querySelectorAll('.shop-lavakip-card')).toHaveLength(1);
    expect(root.textContent).toContain('Lavakip-bar');
    expect(root.textContent).toContain('60');
    expect(root.querySelector('.shop-lavakip-truck')).not.toBeNull();
  });
  it('AC310: 59 points is greyed with "Nog 1 punt nodig" and cannot be bought', () => {
    const { root, onBuy } = setup({ ...base, points: 59 });
    expect(q(root, 'shop-lavakip-note')?.textContent).toBe('Nog 1 punt nodig');
    expect(q(root, 'shop-lavakip-buy')?.hasAttribute('disabled')).toBe(true);
    expect(q(root, 'shop-lavakip-card')?.className).toContain('shop-card-greyed');
    tap(q(root, 'shop-lavakip-buy')!);
    expect(q(root, 'shop-lavakip-confirm')).toBeNull();
    expect(onBuy).not.toHaveBeenCalled();
  });
  it('AC311: Nee changes nothing, Ja buys once even on ten taps', async () => {
    const s = setup(base);
    tap(q(s.root, 'shop-lavakip-buy')!);
    expect(q(s.root, 'shop-lavakip-confirm')?.textContent).toContain('60 punten');
    tap(q(s.root, 'shop-lavakip-no')!);
    expect(s.onBuy).not.toHaveBeenCalled();
    tap(q(s.root, 'shop-lavakip-buy')!);
    const yes = q(s.root, 'shop-lavakip-yes')!;
    for (let i = 0; i < 10; i++) tap(yes);
    await flush();
    expect(s.onBuy).toHaveBeenCalledTimes(1);
  });
  it('AC311: bought shows "Staat in je wereld" with Zet hier neer and no Kopen', () => {
    const { root } = setup({ ...base, bought: true, placed: true });
    expect(q(root, 'shop-lavakip-placed')?.textContent).toBe('Staat in je wereld');
    expect(q(root, 'shop-lavakip-buy')).toBeNull();
    expect(q(root, 'shop-lavakip-place')?.textContent).toBe('Zet hier neer');
  });
  it('AC312: Zet hier neer calls the flow, and shows the no room line when nothing fits', async () => {
    const s = setup({ ...base, bought: true, placed: true, canPlaceHere: false });
    expect(q(s.root, 'shop-lavakip-noroom')).toBeNull();
    tap(q(s.root, 'shop-lavakip-place')!);
    await flush();
    expect(s.onPlaceHere).toHaveBeenCalledTimes(1);
    expect(q(s.root, 'shop-lavakip-noroom')?.textContent).toBe('Hier past de bar niet. Zoek een vlak plekje.');
  });
});
