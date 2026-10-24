// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createScreenManager } from '../app/screens';
import { createShopFlow } from '../app/shop-flow';
import { MSG_CAP_REACHED, MSG_COOP_FULL } from '../core/economy';
import { createDinoStore } from '../dinos/dino-store';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createRecords } from '../storage/records';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createShopView } from './shop';

describe('shop view and shop flow (T47, AC20, AC110, AC149, AC150)', () => {
  it('the shop card can be scrolled by finger and keeps the Kippenhok and Sluiten', () => {
    const view = createShopView({
      state: { points: 200, dinos: [], eggs: [] },
      onBuy: () => {},
      onClose: () => {},
    });
    const modal = view.element.querySelector('.shop-modal');
    expect(modal?.classList.contains('scrollable')).toBe(true);
    expect(view.element.querySelector('[data-testid="shop-chicken-coop"]')).not.toBeNull();
    expect(view.element.textContent).not.toContain('3 Kippen');
    expect(view.element.querySelector('[data-testid="shop-deploy-chicken-flock"]')).toBeNull();
    expect(view.element.querySelector('.shop-close-btn')).not.toBeNull();
    // Fits at 1024x768: no long blurb per card.
    expect(view.element.querySelector('.shop-card-trait')).toBeNull();
  });

  it('shows 4 species cards, greys out unaffordable ones with "Nog X punten nodig", and shows 12-cap banner (AC149)', () => {
    const view = createShopView({
      state: {
        points: 30,
        dinos: [],
        eggs: [],
      },
      onBuy: () => {},
      onClose: () => {},
    });

    // Compy (20) is affordable; Triceratops (40), Stegosaurus (40), Brachiosaurus (80) are greyed
    expect(
      view.element.querySelector('[data-dino-card="compy"]')?.getAttribute('aria-disabled'),
    ).toBe('false');
    expect(
      view.element.querySelector('[data-dino-card="triceratops"]')?.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(
      view.element.querySelector('[data-testid="shop-note-triceratops"]')?.textContent,
    ).toBe('Nog 10 punten nodig');
    expect(
      view.element.querySelector('[data-testid="shop-note-brachiosaurus"]')?.textContent,
    ).toBe('Nog 50 punten nodig');

    // Render with 12 shop dinos -> cap banner shown and all buy buttons disabled (AC149)
    view.render({
      points: 200,
      dinos: Array.from({ length: 12 }, (_, i) => ({
        id: `d-${i}`,
        kind: 'compy' as const,
        golden: false,
      })),
      eggs: [],
    });
    expect(view.element.textContent).toContain(MSG_CAP_REACHED);
    expect(
      view.element.querySelector<HTMLButtonElement>('[data-testid="shop-buy-compy"]')?.disabled,
    ).toBe(true);

    view.destroy();
  });

  it('buys an egg atomically with Kopen -> Ja and prevents 10 fast taps from double-spending (AC20, AC110, AC150)', async () => {
    const db = await openDb({ name: `shop-flow-test-${Math.random()}` });
    const records = createRecords(db);
    const logStore = createLogStore(db);
    const world = new World();
    const dinoStore = createDinoStore({
      world,
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });
    const host = document.createElement('div');
    const screens = createScreenManager({ host });

    // Start with 45 points
    await records.put('economy', {
      points: 45,
      practicePointsToday: 0,
      practiceDay: '2026-10-17',
    });

    const flow = createShopFlow({
      screens,
      db,
      records,
      logStore,
      dinoStore,
    });

    await flow.open();
    expect(host.textContent).toContain('45 punten');

    // Tap Kopen on Triceratops (40 points)
    const buyBtn = host.querySelector<HTMLButtonElement>('[data-testid="shop-buy-triceratops"]');
    expect(buyBtn).not.toBeNull();
    buyBtn?.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    buyBtn?.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    expect(host.textContent).toContain('Wil je een Triceratops-ei kopen voor 40 punten?');

    // Fire 10 rapid purchases in parallel (AC110: 45 points, 40 egg -> 1 bought, 5 points left)
    const results = await Promise.all(
      Array.from({ length: 10 }, () => flow.buyEgg('triceratops')),
    );
    expect(results.filter(Boolean)).toHaveLength(1);

    const ecoAfter = await records.get('economy');
    const dinosAfter = await records.get('dinos');
    const ledgerAfter = await logStore.listLedger();

    expect(ecoAfter.points).toBe(5);
    expect(dinoStore.eggs()).toHaveLength(1);
    expect(dinosAfter.eggs).toHaveLength(1);
    expect(ledgerAfter).toHaveLength(1);
    expect(ledgerAfter[0]?.delta).toBe(-40);
    expect(ledgerAfter[0]?.reason).toBe('shop');

    flow.destroy();
    db.close();
  });

  const press = (el: Element | null | undefined) => {
    el?.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    el?.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  };

  it('chicken card: count, greyed with "Nog 1 punt nodig", and full coop', () => {
    const view = createShopView({
      state: { points: 4, dinos: [], eggs: [] },
      onBuy: () => {},
      onClose: () => {},
    });
    const q = (id: string) => view.element.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    expect(q('shop-chicken-count')?.textContent).toBe('Kippen: 0 van de 10');
    expect(q('shop-note-kip')?.textContent).toBe('Nog 1 punt nodig');
    expect((q('shop-buy-kip') as HTMLButtonElement).disabled).toBe(true);
    view.render({
      points: 100,
      dinos: Array.from({ length: 10 }, (_, i) => ({ id: `k${i}`, kind: 'kip' as const })),
      eggs: [],
    });
    expect(q('shop-chicken-count')?.textContent).toBe('Kippen: 10 van de 10');
    expect(q('shop-note-kip')?.textContent).toBe(MSG_COOP_FULL);
    expect((q('shop-buy-kip') as HTMLButtonElement).disabled).toBe(true);
    // 12 dinos and a chicken: the dino cap does not block chickens
    view.render({
      points: 100,
      dinos: Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, kind: 'compy' as const })),
      eggs: [],
    });
    expect((q('shop-buy-kip') as HTMLButtonElement).disabled).toBe(false);
    view.destroy();
  });

  it('buys a chicken with Kopen, Ja, takes 5 points once on 5 fast taps and writes the ledger (decision 55)', async () => {
    const db = await openDb({ name: `shop-chicken-${Math.random()}` });
    const records = createRecords(db);
    const logStore = createLogStore(db);
    const dinoStore = createDinoStore({
      world: new World(),
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });
    const host = document.createElement('div');
    const screens = createScreenManager({ host });
    await records.put('economy', { points: 5, practicePointsToday: 0, practiceDay: '2026-10-17' });
    const flow = createShopFlow({ screens, db, records, logStore, dinoStore });
    await flow.open();

    press(host.querySelector('[data-testid="shop-buy-kip"]'));
    expect(host.textContent).toContain('Wil je een kip kopen voor 5 punten?');
    // 5 fast taps on Ja
    const yes = host.querySelector('[data-testid="shop-confirm-yes-kip"]');
    for (let i = 0; i < 5; i++) press(yes);
    const results = await Promise.all(Array.from({ length: 5 }, () => flow.buyChicken()));
    await vi.waitFor(async () => {
      expect((await records.get('economy')).points).toBe(0);
    });
    expect(results.filter(Boolean)).toHaveLength(0);

    expect((await records.get('economy')).points).toBe(0);
    expect(dinoStore.dinos().filter((d) => d.kind === 'kip')).toHaveLength(1);
    expect((await records.get('dinos')).dinos).toHaveLength(1);
    const ledger = await logStore.listLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: -5, reason: 'shop' });
    expect(dinoStore.shopCount()).toBe(0);

    flow.destroy();
    db.close();
  });

  it('fast calls without the screen buy exactly one chicken and 10 chickens fill the coop', async () => {
    const db = await openDb({ name: `shop-chicken2-${Math.random()}` });
    const records = createRecords(db);
    const logStore = createLogStore(db);
    const dinoStore = createDinoStore({
      world: new World(),
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });
    const screens = createScreenManager({ host: document.createElement('div') });
    await records.put('economy', { points: 5, practicePointsToday: 0, practiceDay: '2026-10-17' });
    const flow = createShopFlow({ screens, db, records, logStore, dinoStore });
    const r = await Promise.all(Array.from({ length: 5 }, () => flow.buyChicken()));
    expect(r.filter(Boolean)).toHaveLength(1);
    expect((await records.get('economy')).points).toBe(0);

    await records.put('economy', { points: 100, practicePointsToday: 0, practiceDay: '2026-10-17' });
    const more = await Promise.all(Array.from({ length: 15 }, () => flow.buyChicken()));
    expect(more.filter(Boolean)).toHaveLength(9);
    expect(dinoStore.chickenCount()).toBe(10);
    expect((await records.get('economy')).points).toBe(100 - 45);
    expect(await flow.buyChicken()).toBe(false);
    flow.destroy();
    db.close();
  });
});
