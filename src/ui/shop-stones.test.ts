// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { STONES } from '../world/stones';
import { createStonesSection, type StoneShopState } from './shop-stones';

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const q = (root: Element, id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`);

function setup(state: StoneShopState, loaded = true) {
  let now = 0;
  const onBuy = vi.fn();
  let root: HTMLElement = document.createElement('div');
  const section = createStonesSection({ onBuy, onChange: () => draw(), now: () => (now += 1000) });
  const draw = () => { root = section.render(state, loaded); };
  draw();
  return { onBuy, get root() { return root; } };
}

describe('Edelstenen section (AC273, AC274)', () => {
  it('AC273: shows 8 cards in price order, all "?" when nothing is found', () => {
    const { root } = setup({ points: 1000, found: [], bought: [] });
    const cards = [...root.querySelectorAll('.shop-stone')];
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual(STONES.map((s) => `shop-stone-${s.id}`));
    for (const c of cards) {
      expect(c.textContent).toContain('Ergens diep onder de grond');
      expect(c.querySelector('button')).toBeNull();
    }
    expect(root.textContent).not.toContain('Maansteen');
  });

  it('AC273: a found stone with 79 points shows name, price, "Nog 1 punt nodig" and a disabled Kopen', () => {
    const { root } = setup({ points: 79, found: [43], bought: [] });
    const card = q(root, 'shop-stone-43')!;
    expect(card.textContent).toContain('Maansteen');
    expect(card.textContent).toContain('80');
    expect(q(root, 'shop-stone-note-43')?.textContent).toBe('Nog 1 punt nodig');
    expect(q(root, 'shop-stone-buy-43')?.hasAttribute('disabled')).toBe(true);
    expect(card.className).toContain('shop-card-greyed');
    expect(q(root, 'shop-stone-44')?.textContent).toContain('Ergens diep');
  });

  it('AC274: Nee changes nothing, Ja buys once', async () => {
    const s = setup({ points: 80, found: [43], bought: [] });
    tap(q(s.root, 'shop-stone-buy-43')!);
    expect(q(s.root, 'shop-stone-confirm-43')?.textContent).toContain('Maansteen kopen voor 80 punten');
    tap(q(s.root, 'shop-stone-no-43')!);
    expect(s.onBuy).not.toHaveBeenCalled();
    expect(q(s.root, 'shop-stone-buy-43')).not.toBeNull();
    tap(q(s.root, 'shop-stone-buy-43')!);
    tap(q(s.root, 'shop-stone-yes-43')!);
    tap(q(s.root, 'shop-stone-yes-43')!);
    await Promise.resolve();
    await Promise.resolve();
    expect(s.onBuy).toHaveBeenCalledTimes(1);
    expect(s.onBuy).toHaveBeenCalledWith(43);
  });

  it('AC274: a bought stone shows "Gekocht!" and no Kopen', () => {
    const { root } = setup({ points: 500, found: [43], bought: [43] });
    expect(q(root, 'shop-stone-bought-43')?.textContent).toBe('Gekocht!');
    expect(q(root, 'shop-stone-buy-43')).toBeNull();
  });

  it('AC273: Kopen is disabled while the shop is still loading', () => {
    const { root } = setup({ points: 500, found: [43], bought: [] }, false);
    expect(q(root, 'shop-stone-buy-43')?.hasAttribute('disabled')).toBe(true);
  });
});
