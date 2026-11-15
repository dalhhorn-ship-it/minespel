// The Ridders section of the Dinowinkel (v17, AC200 to AC202): one Ridder card with Kopen then Ja or Nee, and one
// line per knight with Inruilen. It keeps its own confirm state and asks the shop view to draw again after a change.
import { pointsNeededText } from '../core/economy';
import { KNIGHT_PRICE, KNIGHT_TRADEIN, MAX_KNIGHTS } from '../knights/knight-types';
import { el } from './dom';
import { onTap } from './tap';

export const MSG_KNIGHTS_FULL = `Je hebt al ${MAX_KNIGHTS} ridders!`;

export interface KnightShopState {
  points: number;
  /** The knights the kid owns now, in the order he bought them. */
  knights: readonly { id: string }[];
}

export interface KnightsSectionOptions {
  onBuy: () => Promise<unknown> | unknown;
  onTradeIn: (id: string) => Promise<unknown> | unknown;
  /** Asks the shop to draw again (the confirm state changed or a buy ended). */
  onChange: () => void;
  now?: () => number;
}

export interface KnightsSection {
  /** Builds the section for this state. Drops the buttons of the last build. */
  render(state: KnightShopState, loaded: boolean): HTMLElement;
  destroy(): void;
}

export function createKnightsSection(options: KnightsSectionOptions): KnightsSection {
  let cleanups: Array<() => void> = [];
  let confirmBuy = false;
  let confirmTrade: string | null = null;
  let inFlight = false;

  const clean = () => {
    for (const c of cleanups) c();
    cleanups = [];
  };
  const tap = (node: HTMLElement, fn: () => void) => cleanups.push(onTap(node, fn, { now: options.now }));
  const button = (cls: string, text: string, testid: string, label?: string): HTMLButtonElement =>
    el('button', { class: cls, text, attrs: { type: 'button', 'data-testid': testid, ...(label ? { 'aria-label': label } : {}) } });

  /** Runs a buy or trade in once; a second tap while it runs does nothing. */
  function run(action: () => Promise<unknown> | unknown): void {
    if (inFlight) return;
    inFlight = true;
    Promise.resolve()
      .then(action)
      .catch(() => {})
      .finally(() => {
        inFlight = false;
        confirmBuy = false;
        confirmTrade = null;
        options.onChange();
      });
  }

  function confirmBox(testid: string, text: string, yesId: string, noId: string, onYes: () => void, onNo: () => void): HTMLElement {
    const yes = button('shop-confirm-yes', 'Ja', yesId);
    const no = button('shop-confirm-no', 'Nee', noId);
    yes.disabled = inFlight;
    tap(yes, onYes);
    tap(no, () => {
      if (inFlight) return;
      onNo();
    });
    return el('div', { class: 'shop-confirm-box', attrs: { 'data-testid': testid } }, [
      el('p', { class: 'shop-confirm-text', text }),
      el('div', { class: 'shop-confirm-actions' }, [yes, no]),
    ]);
  }

  function card(state: KnightShopState, loaded: boolean): HTMLElement {
    const full = state.knights.length >= MAX_KNIGHTS;
    const short = state.points < KNIGHT_PRICE;
    const canBuy = loaded && !full && !short;
    const bottom: HTMLElement[] = [];
    if (loaded && full) {
      bottom.push(el('p', { class: 'shop-card-note', text: MSG_KNIGHTS_FULL, attrs: { 'data-testid': 'shop-note-knight' } }));
    } else if (loaded && short) {
      bottom.push(el('p', { class: 'shop-card-note', text: pointsNeededText(KNIGHT_PRICE - Math.max(0, Math.floor(state.points))), attrs: { 'data-testid': 'shop-note-knight' } }));
    }
    if (canBuy && confirmBuy) {
      bottom.push(
        confirmBox(
          'shop-confirm-knight',
          `Wil je een ridder kopen voor ${KNIGHT_PRICE} punten?`,
          'shop-confirm-yes-knight',
          'shop-confirm-no-knight',
          () => run(options.onBuy),
          () => {
            confirmBuy = false;
            options.onChange();
          },
        ),
      );
    } else {
      const buy = button('shop-buy-btn', 'Kopen', 'shop-buy-knight', `Koop een ridder voor ${KNIGHT_PRICE} punten`);
      buy.disabled = !canBuy;
      if (canBuy) {
        tap(buy, () => {
          confirmBuy = true;
          confirmTrade = null;
          options.onChange();
        });
      }
      bottom.push(buy);
    }
    return el(
      'section',
      {
        class: `shop-card shop-card-special ${canBuy ? 'shop-card-affordable' : 'shop-card-greyed'} shop-knight`,
        attrs: { 'aria-label': 'Ridder', 'data-testid': 'shop-knight' },
      },
      [
        el('div', { class: 'shop-card-top' }, [
          el('div', { class: 'shop-art shop-art-knight', text: '\u{1F6E1}\u{FE0F}', attrs: { 'aria-hidden': 'true' } }),
          el('div', { class: 'shop-card-info' }, [
            el('div', { class: 'shop-card-title-row' }, [
              el('h3', { class: 'shop-card-name', text: 'Ridder' }),
              el('span', { class: 'shop-card-price', text: `${KNIGHT_PRICE} punten` }),
            ]),
            el('p', { class: 'shop-fluit-text', text: 'Een vriendelijke ridder met een helm en een houten zwaard. Hij volgt je, wacht of past op de dieren.' }),
            el('div', { class: 'shop-card-meta' }, [
              el('span', { class: 'shop-chip shop-chip-owned', text: `Ridders: ${state.knights.length} van de ${MAX_KNIGHTS}`, attrs: { 'data-testid': 'shop-knight-count' } }),
            ]),
          ]),
        ]),
        ...bottom,
      ],
    );
  }

  function ownedLine(id: string, index: number): HTMLElement {
    const label = `Ridder ${index + 1}`;
    const text = el('span', { class: 'shop-collection-label', text: `\u{1F6E1}\u{FE0F} ${label}` });
    if (confirmTrade === id) {
      return el('div', { class: 'shop-collection-item shop-collection-item-trading', attrs: { 'data-testid': `shop-knight-trade-confirm-${id}` } }, [
        confirmBox(
          `shop-knight-trade-box-${id}`,
          `Wil je ${label} inruilen? Je krijgt ${KNIGHT_TRADEIN} punten terug.`,
          `shop-knight-trade-yes-${id}`,
          `shop-knight-trade-no-${id}`,
          () => run(() => options.onTradeIn(id)),
          () => {
            confirmTrade = null;
            options.onChange();
          },
        ),
      ]);
    }
    const btn = button('shop-trade-btn', `Inruilen +${KNIGHT_TRADEIN}`, `shop-knight-trade-${id}`, `Ruil ${label} in voor ${KNIGHT_TRADEIN} punten`);
    tap(btn, () => {
      confirmTrade = id;
      confirmBuy = false;
      options.onChange();
    });
    return el('div', { class: 'shop-collection-item' }, [text, btn]);
  }

  return {
    render(state, loaded) {
      clean();
      if (confirmTrade !== null && !state.knights.some((k) => k.id === confirmTrade)) confirmTrade = null;
      const children: HTMLElement[] = [
        el('h3', { class: 'shop-section-title', text: '\u{1F6E1}\u{FE0F} Ridders' }),
        card(state, loaded),
      ];
      if (loaded && state.knights.length > 0) {
        children.push(el('div', { class: 'shop-collection-list shop-knight-list' }, state.knights.map((k, i) => ownedLine(k.id, i))));
      }
      return el('section', { class: 'shop-knights', attrs: { 'aria-label': 'Ridders', 'data-testid': 'shop-knights' } }, children);
    },
    destroy: clean,
  };
}
