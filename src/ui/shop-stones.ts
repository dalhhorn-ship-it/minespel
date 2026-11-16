// The Edelstenen section of the Dinowinkel (v20, AC273 and AC274): 8 cards in the order of the stone table, a "?" for a
// stone not found, Kopen then Ja or Nee for a found one, "Gekocht!" once bought. It keeps its own confirm state.
import '../styles/shop-stones.css';
import { pointsNeededText } from '../core/economy';
import { STONES, type StoneInfo } from '../world/stones';
import { el } from './dom';
import { onTap } from './tap';

export const TEXT_STONE_HIDDEN = 'Ergens diep onder de grond';
export const TEXT_STONE_BOUGHT = 'Gekocht!';

export interface StoneShopState {
  points: number;
  /** Stone ids the kid found by mining. */
  found: readonly number[];
  /** Stone ids the kid bought. */
  bought: readonly number[];
}

export interface StonesSectionOptions {
  /** Buys the stone (`shop-flow.ts` runs it through the purchase lock). */
  onBuy: (id: number) => Promise<unknown> | unknown;
  /** Asks the shop to draw again. */
  onChange: () => void;
  now?: () => number;
}

export interface StonesSection {
  /** Builds the section for this state. Drops the buttons of the last build. */
  render(state: StoneShopState, loaded: boolean): HTMLElement;
  destroy(): void;
}

const rgb = (c: StoneInfo['colour']): string => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

export function createStonesSection(options: StonesSectionOptions): StonesSection {
  let cleanups: Array<() => void> = [];
  let confirming: number | null = null;
  let inFlight = false;

  const clean = () => {
    for (const c of cleanups) c();
    cleanups = [];
  };
  const tap = (node: HTMLElement, fn: () => void) => cleanups.push(onTap(node, fn, { now: options.now }));
  const button = (cls: string, text: string, testid: string, label?: string): HTMLButtonElement =>
    el('button', { class: cls, text, attrs: { type: 'button', 'data-testid': testid, ...(label ? { 'aria-label': label } : {}) } });

  /** Runs a buy once; a second tap while it runs does nothing. */
  function run(id: number): void {
    if (inFlight) return;
    inFlight = true;
    Promise.resolve()
      .then(() => options.onBuy(id))
      .catch(() => {})
      .finally(() => {
        inFlight = false;
        confirming = null;
        options.onChange();
      });
  }

  function card(stone: StoneInfo, state: StoneShopState, loaded: boolean): HTMLElement {
    const id = stone.id;
    const found = state.found.includes(id);
    const bought = found && state.bought.includes(id);
    const points = Math.max(0, Math.floor(state.points));
    const testid = (name: string) => `shop-stone-${name}-${id}`;
    const base = (extra: string, children: HTMLElement[], label: string) =>
      el('section', { class: `shop-card shop-stone ${extra}`, attrs: { 'aria-label': label, 'data-testid': `shop-stone-${id}` } }, children);

    if (!found) {
      return base(
        'shop-card-greyed shop-stone-hidden',
        [
          el('div', { class: 'shop-card-top' }, [
            el('div', { class: 'shop-art shop-stone-art shop-stone-art-hidden', text: '?', attrs: { 'aria-hidden': 'true' } }),
            el('div', { class: 'shop-card-info' }, [
              el('h3', { class: 'shop-card-name', text: '?' }),
              el('p', { class: 'shop-card-note', text: TEXT_STONE_HIDDEN, attrs: { 'data-testid': testid('hint') } }),
            ]),
          ]),
        ],
        'Nog niet gevonden',
      );
    }

    const art = el('div', { class: 'shop-art shop-stone-art', attrs: { 'aria-hidden': 'true' } }, [
      el('span', { class: 'shop-stone-gem' }),
    ]);
    art.style.setProperty('--stone', rgb(stone.colour));
    const top = el('div', { class: 'shop-card-top' }, [
      art,
      el('div', { class: 'shop-card-info' }, [
        el('div', { class: 'shop-card-title-row' }, [
          el('h3', { class: 'shop-card-name', text: stone.name }),
          el('span', { class: 'shop-card-price', text: `${stone.price}` }),
        ]),
      ]),
    ]);

    if (bought) {
      return base(
        'shop-card-affordable',
        [top, el('p', { class: 'shop-card-note shop-stone-bought', text: TEXT_STONE_BOUGHT, attrs: { 'data-testid': testid('bought') } })],
        stone.name,
      );
    }

    const short = points < stone.price;
    const canBuy = loaded && !short;
    const bottom: HTMLElement[] = [];
    if (loaded && short) {
      bottom.push(el('p', { class: 'shop-card-note', text: pointsNeededText(stone.price - points), attrs: { 'data-testid': testid('note') } }));
    }
    if (canBuy && confirming === id) {
      const yes = button('shop-confirm-yes', 'Ja', testid('yes'));
      const no = button('shop-confirm-no', 'Nee', testid('no'));
      yes.disabled = inFlight;
      tap(yes, () => run(id));
      tap(no, () => {
        if (inFlight) return;
        confirming = null;
        options.onChange();
      });
      bottom.push(
        el('div', { class: 'shop-confirm-box', attrs: { 'data-testid': testid('confirm') } }, [
          el('p', { class: 'shop-confirm-text', text: `Wil je ${stone.name} kopen voor ${stone.price} punten?` }),
          el('div', { class: 'shop-confirm-actions' }, [yes, no]),
        ]),
      );
    } else {
      const buy = button('shop-buy-btn', 'Kopen', testid('buy'), `Koop ${stone.name} voor ${stone.price} punten`);
      buy.disabled = !canBuy;
      if (canBuy) {
        tap(buy, () => {
          if (inFlight) return;
          confirming = id;
          options.onChange();
        });
      }
      bottom.push(buy);
    }
    return base(canBuy ? 'shop-card-affordable' : 'shop-card-greyed', [top, ...bottom], stone.name);
  }

  return {
    render(state, loaded) {
      clean();
      return el('section', { class: 'shop-stones', attrs: { 'aria-label': 'Edelstenen', 'data-testid': 'shop-stones' } }, [
        el('h3', { class: 'shop-section-title', text: 'Edelstenen' }),
        el('div', { class: 'shop-grid shop-stone-grid' }, STONES.map((s) => card(s, state, loaded))),
      ]);
    },
    destroy: clean,
  };
}
