// Dinowinkel screen (T47): four egg cards, Kopen, then Ja or Nee. No link, no real money, no payment screen.
// A card is grey when it can not be bought (not enough points, 12 dinos, or the shop is closed because the
// save is not running). The buying itself is done by the caller (`buy`), so this file only draws and asks.
import '../styles/shop.css';
import type { Screens } from '../app/screens';
import type { BuyOutcome } from '../app/purchase';
import { buyState } from '../core/economy';
import { SHOP_KINDS, type DinoKind, type DinoKindId } from '../dinos/kinds';
import { el } from './dom';
import { onTap } from './tap';

export const MSG_SHOP_CLOSED = 'De winkel is nu dicht. Sluit de app en probeer het straks nog eens.';

export interface ShopOptions {
  screens: Screens;
  /** False when nothing may be written: every card is grey. */
  saving: boolean;
  /** Points, read from the save every time the cards are drawn. */
  getPoints: () => Promise<number>;
  /** Dinos and eggs of the shop (golden ones left out) at this moment. */
  shopCount: () => number;
  buy: (kind: DinoKindId) => Promise<BuyOutcome>;
  /** Called after the shop is gone, so the menu below can read its points again. */
  onClose: () => void;
}

const EGG_COLOR: Record<DinoKindId, string> = {
  compy: '#f4a261',
  triceratops: '#6bb36b',
  stegosaurus: '#7fb2e5',
  brachiosaurus: '#c59adf',
};

const pointsLabel = (n: number) => `Je hebt ${n} ${n === 1 ? 'punt' : 'punten'}`;

export function openShopScreen(o: ShopOptions): () => void {
  let points = 0;
  let busy = false;
  let closed = false;
  let cardTaps: Array<() => void> = [];

  const pointsEl = el('p', { class: 'shop-points', attrs: { 'data-shop': 'points' } });
  const status = el('p', { class: 'shop-status', attrs: { 'data-shop': 'status', 'aria-live': 'polite' } });
  const grid = el('div', { class: 'shop-grid' });
  const confirmHost = el('div', { class: 'shop-confirm-host' });
  const back = el('button', { class: 'shop-btn shop-back', text: 'Terug', attrs: { type: 'button', 'data-shop': 'back' } });
  const node = el('div', { class: 'shop-screen', attrs: { role: 'dialog', 'aria-label': 'Dinowinkel', 'data-screen-id': 'shop' } }, [
    el('div', { class: 'shop-panel' }, [el('h2', { class: 'shop-title', text: 'Dinowinkel' }), pointsEl, status, grid, back]),
    confirmHost,
  ]);

  function card(kind: DinoKind): HTMLElement {
    const state = buyState(points, o.shopCount(), kind.id);
    const open = o.saving && state.canBuy;
    const note = !o.saving ? MSG_SHOP_CLOSED : state.note;
    const egg = el('div', { class: 'shop-egg', attrs: { 'aria-hidden': 'true' } });
    egg.style.background = EGG_COLOR[kind.id];
    const buy = el('button', {
      class: 'shop-btn shop-buy',
      text: 'Kopen',
      attrs: { type: 'button', 'data-shop': `buy-${kind.id}`, 'aria-disabled': String(!open) },
    });
    cardTaps.push(onTap(buy, () => {
      if (!open || busy) return;
      askConfirm(kind);
    }));
    return el('div', { class: open ? 'shop-card' : 'shop-card shop-grey', attrs: { 'data-kind': kind.id } }, [
      egg,
      el('h3', { class: 'shop-name', text: kind.name }),
      el('p', { class: 'shop-price', text: `${kind.price} punten` }),
      el('p', { class: 'shop-note', text: note ?? '' }),
      buy,
    ]);
  }

  async function refresh() {
    try {
      points = await o.getPoints();
    } catch {
      points = 0;
    }
    if (closed) return;
    pointsEl.textContent = pointsLabel(points);
    for (const c of cardTaps) c();
    cardTaps = [];
    grid.replaceChildren(...SHOP_KINDS.map(card));
  }

  function askConfirm(kind: DinoKind) {
    busy = true;
    const yes = el('button', { class: 'shop-btn shop-yes', text: 'Ja', attrs: { type: 'button', 'data-shop': 'yes' } });
    const no = el('button', { class: 'shop-btn shop-no', text: 'Nee', attrs: { type: 'button', 'data-shop': 'no' } });
    const box = el('div', { class: 'shop-confirm', attrs: { role: 'alertdialog', 'data-shop': 'confirm' } }, [
      el('p', { class: 'shop-confirm-text', text: `${kind.name} kopen voor ${kind.price} punten?` }),
      el('div', { class: 'shop-confirm-row' }, [yes, no]),
    ]);
    confirmHost.replaceChildren(box);
    const stop: Array<() => void> = [];
    const done = () => {
      for (const s of stop) s();
      confirmHost.replaceChildren();
    };
    stop.push(onTap(no, () => {
      done();
      busy = false;
    }));
    stop.push(onTap(yes, () => {
      done(); // the box is gone at once, so more taps can not buy again
      status.textContent = '';
      void o.buy(kind.id).then(async (r) => {
        if (closed) return;
        status.textContent = r.ok ? `Hoera! Je hebt een ${kind.name}-ei. Het ligt zo naast je.` : r.note;
        await refresh();
        busy = false;
      });
    }));
  }

  function close() {
    if (closed) return;
    closed = true;
    for (const c of cardTaps) c();
    cardTaps = [];
    stopBack();
    closeScreen();
    o.onClose();
  }

  const stopBack = onTap(back, close);
  const closeScreen = o.screens.open('kid-overlay', node);
  void refresh();
  return close;
}
