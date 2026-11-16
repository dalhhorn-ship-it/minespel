// The Uitrusting row of the Dinowinkel (v19, AC258 to AC260): 8 cards in price order with the name, a picture, the
// slot and the price. Kopen asks Ja or Nee first. One buy runs at a time. It keeps its own confirm state.
import '../styles/shop-gear.css';
import { pointsNeededText } from '../core/economy';
import { SLOT_LABELS, shopOrder } from '../knights/gear';
import { el } from './dom';
import { gearIcon } from './gear-icon';
import { onTap } from './tap';

export const MSG_GEAR_OWNED = 'In je wapenkast';
export const MSG_GEAR_NO_KNIGHT = 'Koop eerst een ridder';

export interface GearShopState {
  points: number;
  /** How many knights the kid owns. With none, every card is greyed (AC260). */
  knightCount: number;
  /** The ids of the wapenkast. */
  owned: readonly string[];
}

export interface GearSectionOptions {
  /** Buys the item (`shop-flow.ts` runs it through the purchase lock). */
  onBuy: (id: string) => Promise<unknown> | unknown;
  /** Asks the shop to draw again. */
  onChange: () => void;
  now?: () => number;
}

export interface GearSection {
  /** Builds the section for this state. Drops the buttons of the last build. */
  render(state: GearShopState, loaded: boolean): HTMLElement;
  destroy(): void;
}

export function createGearSection(options: GearSectionOptions): GearSection {
  let cleanups: Array<() => void> = [];
  let confirmId: string | null = null;
  let inFlight = false;

  const clean = () => {
    for (const c of cleanups) c();
    cleanups = [];
  };
  const tap = (node: HTMLElement, fn: () => void) => cleanups.push(onTap(node, fn, { now: options.now }));
  const button = (cls: string, text: string, testid: string, label?: string): HTMLButtonElement =>
    el('button', { class: cls, text, attrs: { type: 'button', 'data-testid': testid, ...(label ? { 'aria-label': label } : {}) } });

  /** Runs a buy once; a second tap while it runs does nothing. */
  function run(id: string): void {
    if (inFlight) return;
    inFlight = true;
    Promise.resolve()
      .then(() => options.onBuy(id))
      .catch(() => {})
      .finally(() => {
        inFlight = false;
        confirmId = null;
        options.onChange();
      });
  }

  function card(item: ReturnType<typeof shopOrder>[number], state: GearShopState, loaded: boolean): HTMLElement {
    const owned = state.owned.includes(item.id);
    const noKnight = state.knightCount <= 0;
    const points = Math.max(0, Math.floor(state.points));
    const short = points < item.price;
    const canBuy = loaded && !owned && !noKnight && !short;
    let note: string | null = null;
    if (loaded) {
      if (owned) note = MSG_GEAR_OWNED;
      else if (noKnight) note = MSG_GEAR_NO_KNIGHT;
      else if (short) note = pointsNeededText(item.price - points);
    }
    const bottom: HTMLElement[] = [];
    if (note) bottom.push(el('p', { class: 'shop-card-note', text: note, attrs: { 'data-testid': `shop-note-gear-${item.id}` } }));
    if (canBuy && confirmId === item.id) {
      const yes = button('shop-confirm-yes', 'Ja', `shop-confirm-yes-gear-${item.id}`);
      const no = button('shop-confirm-no', 'Nee', `shop-confirm-no-gear-${item.id}`);
      yes.disabled = inFlight;
      tap(yes, () => run(item.id));
      tap(no, () => {
        if (inFlight) return;
        confirmId = null;
        options.onChange();
      });
      bottom.push(
        el('div', { class: 'shop-confirm-box', attrs: { 'data-testid': `shop-confirm-gear-${item.id}` } }, [
          el('p', { class: 'shop-confirm-text', text: `Wil je ${item.name} kopen voor ${item.price} punten?` }),
          el('div', { class: 'shop-confirm-actions' }, [yes, no]),
        ]),
      );
    } else if (!owned) {
      const buy = button('shop-buy-btn', 'Kopen', `shop-buy-gear-${item.id}`, `Koop ${item.name} voor ${item.price} punten`);
      buy.disabled = !canBuy;
      if (canBuy) {
        tap(buy, () => {
          if (inFlight) return;
          confirmId = item.id;
          options.onChange();
        });
      }
      bottom.push(buy);
    }
    return el(
      'section',
      {
        class: `shop-card shop-gear-card ${canBuy ? 'shop-card-affordable' : 'shop-card-greyed'}`,
        attrs: { 'aria-label': item.name, 'data-testid': `shop-gear-${item.id}` },
      },
      [
        el('div', { class: 'shop-gear-top' }, [
          gearIcon(item),
          el('div', { class: 'shop-gear-info' }, [
            el('h4', { class: 'shop-card-name', text: item.name }),
            el('span', { class: 'shop-chip', text: SLOT_LABELS[item.slot] }),
            el('span', { class: 'shop-card-price', text: `${item.price} punten` }),
          ]),
        ]),
        ...bottom,
      ],
    );
  }

  return {
    render(state, loaded) {
      clean();
      if (confirmId !== null && state.owned.includes(confirmId)) confirmId = null;
      return el('section', { class: 'shop-gear', attrs: { 'aria-label': 'Uitrusting', 'data-testid': 'shop-gear' } }, [
        el('h3', { class: 'shop-section-title', text: '⚔️ Uitrusting' }),
        el('div', { class: 'shop-gear-grid' }, shopOrder().map((item) => card(item, state, loaded))),
      ]);
    },
    destroy: clean,
  };
}
