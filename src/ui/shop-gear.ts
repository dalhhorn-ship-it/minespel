// The Uitrusting row of the Dinowinkel (v19, AC258 to AC260). STUB from V19a: `render` returns an empty element, so
// nothing new shows until V19b fills it in. The signatures are final: `shop.ts` already calls it under Ridders.

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- a stub with its final signature
export function createGearSection(_options: GearSectionOptions): GearSection {
  return {
    render: () => document.createElement('div'),
    destroy: () => {},
  };
}
