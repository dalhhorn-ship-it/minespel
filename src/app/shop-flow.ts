// Dinowinkel flow stub for M2 (T44; full implementation in M3 T47).

import { SHOP_KINDS } from '../dinos/kinds';
import { el } from '../ui/dom';
import { onTap } from '../ui/tap';
import type { ScreenManager } from './screens';

export interface ShopFlowOptions {
  screens: ScreenManager;
  getPoints?: () => Promise<number>;
  now?: () => number;
}

export interface ShopFlow {
  open(): Promise<void>;
  destroy(): void;
}

export function createShopFlow(options: ShopFlowOptions): ShopFlow {
  let cleanup: (() => void) | null = null;

  function clear() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }

  return {
    async open() {
      clear();
      const points = (await options.getPoints?.()) ?? 0;
      const closeBtn = el('button', {
        class: 'pause-btn pause-btn-primary',
        text: 'Sluiten',
        attrs: { type: 'button' },
      });
      const off = onTap(closeBtn, () => {
        clear();
        options.screens.showWorld();
      }, { now: options.now });
      cleanup = off;

      const itemsList = el(
        'div',
        { class: 'pause-actions' },
        SHOP_KINDS.map((k) =>
          el('div', {
            class: 'pause-btn',
            text: `${k.name} — ${k.price} punten`,
          }),
        ),
      );

      const card = el('div', { class: 'pause-card', attrs: { 'aria-label': 'Dinowinkel' } }, [
        el('div', { class: 'pause-header' }, [
          el('h2', { class: 'pause-title', text: 'Dinowinkel' }),
          el('div', { class: 'pause-points', text: `${points} punten` }),
        ]),
        itemsList,
        closeBtn,
      ]);
      const backdrop = el('div', { class: 'pause-backdrop' }, [card]);
      options.screens.showKidOverlay(backdrop);
    },
    destroy() {
      clear();
    },
  };
}
