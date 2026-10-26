// @vitest-environment jsdom
// Dinofluit in the Dinowinkel (decision 114): bought once with Ja or Nee, saved with a ledger row.
import { describe, expect, it, vi } from 'vitest';
import { createScreenManager } from '../app/screens';
import { createShopFlow } from '../app/shop-flow';
import { createDinoStore } from '../dinos/dino-store';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createRecords } from '../storage/records';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createShopView } from './shop';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('Dinofluit shop card (decision 114)', () => {
  it('shows no fluit card without a buy handler (the waiting shop)', () => {
    const view = createShopView({ state: { points: 100, dinos: [], eggs: [] }, onBuy: () => {}, onClose: () => {} });
    expect(view.element.querySelector('[data-testid="shop-fluit"]')).toBeNull();
  });

  it('greys out with a progress note when the points are short', () => {
    const view = createShopView({
      state: { points: 20, dinos: [], eggs: [] }, onBuy: () => {}, onBuyFluit: () => {}, onClose: () => {},
    });
    const card = view.element.querySelector('[data-testid="shop-fluit"]')!;
    expect(card.textContent).toContain('60 punten');
    expect(card.querySelector('[data-testid="shop-note-fluit"]')?.textContent).toBe('Nog 40 punten nodig');
    expect(card.querySelector<HTMLButtonElement>('[data-testid="shop-buy-fluit"]')?.disabled).toBe(true);
  });

  it('asks Ja or Nee, and Nee buys nothing', () => {
    const onBuyFluit = vi.fn();
    const view = createShopView({
      state: { points: 80, dinos: [], eggs: [] }, onBuy: vi.fn(), onBuyFluit, onClose: () => {},
    });
    tap(view.element.querySelector('[data-testid="shop-buy-fluit"]')!);
    expect(view.element.querySelector('[data-testid="shop-confirm-fluit"]')?.textContent).toContain('Dinofluit kopen voor 60 punten');
    tap(view.element.querySelector('[data-testid="shop-confirm-no-fluit"]')!);
    expect(onBuyFluit).not.toHaveBeenCalled();
    tap(view.element.querySelector('[data-testid="shop-buy-fluit"]')!);
    tap(view.element.querySelector('[data-testid="shop-confirm-yes-fluit"]')!);
    expect(onBuyFluit).toHaveBeenCalledTimes(1);
  });

  it('shows "Van jou!" and no Kopen once owned', () => {
    const view = createShopView({
      state: { points: 500, dinos: [], eggs: [], fluit: true }, onBuy: () => {}, onBuyFluit: () => {}, onClose: () => {},
    });
    const card = view.element.querySelector('[data-testid="shop-fluit"]')!;
    expect(card.querySelector('[data-testid="shop-fluit-owned"]')).not.toBeNull();
    expect(card.querySelector('[data-testid="shop-buy-fluit"]')).toBeNull();
  });

  it('the flow takes 60 points once, writes a shop ledger row and tells the world', async () => {
    const db = await openDb({ name: `shop-fluit-${Math.random()}` });
    const records = createRecords(db);
    const logStore = createLogStore(db);
    await records.put('economy', { points: 100, practicePointsToday: 0, practiceDay: '' });
    const dinoStore = createDinoStore({
      world: new World(),
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });
    const onFluitBought = vi.fn();
    const flow = createShopFlow({
      screens: createScreenManager({ host: document.createElement('div') }),
      db, records, logStore, dinoStore, onFluitBought,
    });
    const results = await Promise.all([flow.buyFluit(), flow.buyFluit(), flow.buyFluit()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await records.get('economy')).toMatchObject({ points: 40, fluit: true });
    const ledger = await logStore.listLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: -60, reason: 'shop' });
    expect(onFluitBought).toHaveBeenCalledTimes(1);
  });
});
