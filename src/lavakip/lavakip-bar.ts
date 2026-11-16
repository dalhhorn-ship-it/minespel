// The Lavakip-bar in the world (v23, decision 144): one `props` actor, no collision, never in `isOccupied`, a tap within
// 12 in Hakken and Bouwen opens the order card, Klodder never nibbles under it or within 1 block (`keepOut`).
// V22a holds the creature (priority 30), its hooks and the empty answers; V23b draws and answers.
import { registerHook } from '../dev/e2e-hooks';
import type { CreatureSystem } from '../game/game';
import type { TargetList } from '../monsters/targets';
import type { GameRenderer } from '../render/renderer';
import type { LavakipEconomy } from './lavakip-economy';

/** Priority in `game.addCreatures`: monsters 10, knights 20, the bar 30. */
export const LAVAKIP_BAR_PRIORITY = 30;

export interface LavakipBarOptions {
  economy: LavakipEconomy;
  renderer?: Pick<GameRenderer, 'syncActors'>;
  viewport: () => { width: number; height: number };
  player: { pose(): { x: number; y: number; z: number; yaw: number; pitch: number } };
  /** Opens the order card in the kid overlay (boot builds it). */
  openCard?: () => void;
}

export interface LavakipBar extends CreatureSystem {
  /** True for a cell no monster may take or stand on: under the footprint and within 1 block, from its ground row up to 4 above. False until V23b. */
  keepOut(x: number, y: number, z: number): boolean;
  /** Where the truck shows on the screen (css pixels), or null: none yet, or behind the camera. */
  screenPoint(): { x: number; y: number } | null;
  /** "Zet hier neer" (the e2e hook `placeLavakipBarHere`). False until V23b. */
  placeHere(): Promise<boolean>;
  /** Orders one lavakip like the card does (the e2e hook `orderLavakip`). False until V23b. */
  order(): Promise<boolean>;
  /** Adds the bar to the near sound targets (kind `bar`). Nothing until V23b. */
  collectTargets(list: TargetList): void;
}

export function createLavakipBar(options: LavakipBarOptions): LavakipBar {
  const bar: LavakipBar = {
    step() {
      // V23b: sync the actor (id `bar`, model `lavakip-bar`, group `props`) while the bar stands.
    },
    handleTap: () => false,
    isOccupied: () => false,
    onWorldReset() {
      // The bar goes to the new home spot and keeps the lavakip the kid carries.
      void options.economy.moveHome().catch(() => undefined);
    },
    keepOut: () => false,
    screenPoint: () => null,
    placeHere: () => Promise.resolve(false),
    order: () => Promise.resolve(false),
    collectTargets() {
      // V23b: addTarget(list, 'bar', 'bar', x, y, z) while the bar stands.
    },
  };

  if (__E2E__) {
    registerHook('placeLavakipBarHere', () => bar.placeHere());
    registerHook('lavakipBarScreenPoint', () => bar.screenPoint());
    registerHook('orderLavakip', () => bar.order());
  }
  return bar;
}
