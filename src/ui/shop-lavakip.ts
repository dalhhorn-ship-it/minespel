// The Lavakip-bar section of the Dinowinkel (v23, decision 144): Kopen with Ja or Nee, "Nog X punten nodig", "Staat in je
// wereld" and "Zet hier neer". V22a holds the seam the shop mounts; V23a draws it. The shop shows the section only when
// the flow gives a `lavakip` state, so until V23a nothing shows.
import { el } from './dom';
import type { LavakipShopState } from '../lavakip/lavakip-types';

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
  void options;
  return {
    render() {
      return el('section', { class: 'shop-lavakip', attrs: { 'data-testid': 'shop-lavakip' } });
    },
    destroy() {
      // V23a: drop the tap handlers of the last build.
    },
  };
}
