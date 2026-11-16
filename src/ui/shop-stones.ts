// The Edelstenen section of the Dinowinkel (v20, AC273 and AC274). STUB from V19a: `render` returns an empty
// element, so nothing new shows until V20c fills it in. The signatures are final: `shop.ts` already calls it.

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- a stub with its final signature
export function createStonesSection(_options: StonesSectionOptions): StonesSection {
  return {
    render: () => document.createElement('div'),
    destroy: () => {},
  };
}
