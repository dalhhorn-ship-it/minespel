import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BuyOutcome } from '../app/purchase';
import { createScreens } from '../app/screens';
import { openShopScreen, MSG_SHOP_CLOSED, type ShopOptions } from './shop';

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const q = (host: HTMLElement, id: string) => host.querySelector(`[data-shop="${id}"]`) as HTMLElement;
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function setup(over: Partial<ShopOptions> = {}, points = 45) {
  const host = document.createElement('div');
  document.body.append(host);
  const screens = createScreens(host);
  const buy = vi.fn(async (): Promise<BuyOutcome> => ({ ok: true, points: 5, kind: 'triceratops', price: 40 }));
  const onClose = vi.fn();
  const close = openShopScreen({ screens, saving: true, getPoints: async () => points, shopCount: () => 0, buy, onClose, ...over });
  return { host, screens, buy, onClose, close };
}
let now = 0;
vi.spyOn(performance, 'now').mockImplementation(() => now);
afterEach(() => { document.body.replaceChildren(); });

describe('shop screen', () => {
  it('shows four cards with the Dutch names, prices and "Nog N punten nodig"', async () => {
    const { host, screens } = setup();
    await flush();
    expect(screens.current()).toBe('kid-overlay');
    const text = host.textContent ?? '';
    for (const t of ['Compy', '20 punten', 'Triceratops', '40 punten', 'Stegosaurus', 'Brachiosaurus', '80 punten', 'Nog 35 punten nodig', 'Je hebt 45 punten']) {
      expect(text).toContain(t);
    }
    expect(host.querySelectorAll('.shop-grey')).toHaveLength(1);
    expect(host.querySelector('a, input')).toBeNull();
  });

  it('Kopen asks, Nee buys nothing, Ja buys once', async () => {
    const { host, buy } = setup();
    await flush();
    tap(q(host, 'buy-triceratops'));
    expect(q(host, 'confirm').textContent).toContain('Triceratops kopen voor 40 punten?');
    tap(q(host, 'no'));
    expect(buy).not.toHaveBeenCalled();
    expect(q(host, 'confirm')).toBeNull();
    now += 1000; // past the double tap guard
    tap(q(host, 'buy-triceratops'));
    const yes = q(host, 'yes');
    tap(yes);
    tap(yes);
    expect(q(host, 'confirm')).toBeNull(); // gone at once
    await flush();
    expect(buy).toHaveBeenCalledTimes(1);
    expect(buy).toHaveBeenCalledWith('triceratops');
    expect(q(host, 'status').textContent).toContain('Triceratops-ei');
  });

  it('a grey card does not ask', async () => {
    const { host } = setup();
    await flush();
    tap(q(host, 'buy-brachiosaurus'));
    expect(q(host, 'confirm')).toBeNull();
  });

  it('is all grey with a friendly line when the save is not running', async () => {
    const { host, buy } = setup({ saving: false }, 500);
    await flush();
    expect(host.querySelectorAll('.shop-grey')).toHaveLength(4);
    expect(host.textContent).toContain(MSG_SHOP_CLOSED);
    tap(q(host, 'buy-compy'));
    expect(q(host, 'confirm')).toBeNull();
    expect(buy).not.toHaveBeenCalled();
  });

  it('shows the 12 dino message', async () => {
    const { host } = setup({ shopCount: () => 12 }, 500);
    await flush();
    expect(host.querySelectorAll('.shop-grey')).toHaveLength(4);
    expect(host.textContent).toContain("Je hebt al 12 dino's! Wat een kudde.");
  });

  it('Terug closes the shop and tells the caller', async () => {
    const { host, screens, onClose } = setup();
    await flush();
    tap(q(host, 'back'));
    expect(screens.depth()).toBe(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
