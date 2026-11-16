// The Lavakip-bar section of the Dinowinkel (v23, decision 144, AC310 and AC311): one card with name, picture and price
// 60, Kopen with Ja or Nee, "Nog X punten nodig", then "Staat in je wereld" and "Zet hier neer". The section is always
// there, also with every monster switch off. It keeps its own confirm state.
import '../styles/shop-lavakip.css';
import { pointsNeededText } from '../core/economy';
import { LAVAKIP_BAR_PRICE, type LavakipShopState } from '../lavakip/lavakip-types';
import { el } from './dom';
import { onTap } from './tap';

export const TEXT_LAVAKIP_NAME = 'Lavakip-bar';
export const TEXT_LAVAKIP_PLACED = 'Staat in je wereld';
export const TEXT_LAVAKIP_NO_ROOM = 'Hier past de bar niet. Zoek een vlak plekje.';

export interface LavakipSectionOptions {
  /** Buys the bar (`shop-flow.ts` runs it through the purchase lock). */
  onBuy: () => Promise<unknown> | unknown;
  /** "Zet hier neer". */
  onPlaceHere: () => Promise<unknown> | unknown;
  /** Asks the shop to draw again. */
  onChange: () => void;
  now?: () => number;
}

export interface LavakipSection {
  /** Builds the section for this state. Drops the buttons of the last build. */
  render(state: LavakipShopState, loaded: boolean): HTMLElement;
  destroy(): void;
}

export function createLavakipSection(options: LavakipSectionOptions): LavakipSection {
  let cleanups: Array<() => void> = [];
  let confirming = false;
  let inFlight = false;
  let triedPlace = false;

  const clean = () => {
    for (const c of cleanups) c();
    cleanups = [];
  };
  const tap = (node: HTMLElement, fn: () => void) => cleanups.push(onTap(node, fn, { now: options.now }));
  const button = (cls: string, text: string, testid: string, label?: string): HTMLButtonElement =>
    el('button', { class: cls, text, attrs: { type: 'button', 'data-testid': testid, ...(label ? { 'aria-label': label } : {}) } });

  /** Runs one action once; a second tap while it runs does nothing. */
  function run(action: () => Promise<unknown> | unknown, afterwards: () => void): void {
    if (inFlight) return;
    inFlight = true;
    Promise.resolve()
      .then(action)
      .catch(() => {})
      .finally(() => {
        inFlight = false;
        afterwards();
        options.onChange();
      });
  }

  return {
    render(state, loaded) {
      clean();
      const points = Math.max(0, Math.floor(state.points));
      const canBuy = loaded && !state.bought && points >= LAVAKIP_BAR_PRICE;
      const art = el('div', { class: 'shop-art shop-lavakip-art', attrs: { 'aria-hidden': 'true' } }, [
        el('span', { class: 'shop-lavakip-truck' }),
      ]);
      const top = el('div', { class: 'shop-card-top' }, [
        art,
        el('div', { class: 'shop-card-info' }, [
          el('div', { class: 'shop-card-title-row' }, [
            el('h3', { class: 'shop-card-name', text: TEXT_LAVAKIP_NAME }),
            el('span', { class: 'shop-card-price', text: `${LAVAKIP_BAR_PRICE}` }),
          ]),
        ]),
      ]);
      const bottom: HTMLElement[] = [];

      if (state.bought) {
        bottom.push(el('p', { class: 'shop-card-note shop-lavakip-placed', text: TEXT_LAVAKIP_PLACED, attrs: { 'data-testid': 'shop-lavakip-placed' } }));
        const place = button('shop-buy-btn shop-lavakip-place', 'Zet hier neer', 'shop-lavakip-place', 'Zet de Lavakip-bar hier neer');
        place.disabled = !loaded;
        tap(place, () => {
          if (inFlight) return;
          run(() => options.onPlaceHere(), () => {
            triedPlace = true;
          });
        });
        bottom.push(place);
        if (triedPlace && !state.canPlaceHere) {
          bottom.push(el('p', { class: 'shop-card-note', text: TEXT_LAVAKIP_NO_ROOM, attrs: { 'data-testid': 'shop-lavakip-noroom' } }));
        }
      } else {
        if (loaded && points < LAVAKIP_BAR_PRICE) {
          bottom.push(
            el('p', { class: 'shop-card-note', text: pointsNeededText(LAVAKIP_BAR_PRICE - points), attrs: { 'data-testid': 'shop-lavakip-note' } }),
          );
        }
        if (canBuy && confirming) {
          const yes = button('shop-confirm-yes', 'Ja', 'shop-lavakip-yes');
          const no = button('shop-confirm-no', 'Nee', 'shop-lavakip-no');
          yes.disabled = inFlight;
          tap(yes, () => run(() => options.onBuy(), () => { confirming = false; }));
          tap(no, () => {
            if (inFlight) return;
            confirming = false;
            options.onChange();
          });
          bottom.push(
            el('div', { class: 'shop-confirm-box', attrs: { 'data-testid': 'shop-lavakip-confirm' } }, [
              el('p', { class: 'shop-confirm-text', text: `Wil je de ${TEXT_LAVAKIP_NAME} kopen voor ${LAVAKIP_BAR_PRICE} punten?` }),
              el('div', { class: 'shop-confirm-actions' }, [yes, no]),
            ]),
          );
        } else {
          const buy = button('shop-buy-btn', 'Kopen', 'shop-lavakip-buy', `Koop de ${TEXT_LAVAKIP_NAME} voor ${LAVAKIP_BAR_PRICE} punten`);
          buy.disabled = !canBuy;
          if (canBuy) {
            tap(buy, () => {
              if (inFlight) return;
              confirming = true;
              options.onChange();
            });
          }
          bottom.push(buy);
        }
      }

      const card = el(
        'section',
        {
          class: `shop-card shop-lavakip-card ${state.bought || canBuy ? 'shop-card-affordable' : 'shop-card-greyed'}`,
          attrs: { 'aria-label': TEXT_LAVAKIP_NAME, 'data-testid': 'shop-lavakip-card' },
        },
        [top, ...bottom],
      );
      return el('section', { class: 'shop-lavakip', attrs: { 'aria-label': TEXT_LAVAKIP_NAME, 'data-testid': 'shop-lavakip' } }, [
        el('h3', { class: 'shop-section-title', text: TEXT_LAVAKIP_NAME }),
        card,
      ]);
    },
    destroy: clean,
  };
}
