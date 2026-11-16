// The Lavakip-bar in the world (v23, decision 144): one `props` actor, no collision, never in `isOccupied`, a tap within
// 12 in Hakken and Bouwen opens the order card, Klodder never nibbles under it or within 1 block (`keepOut`).
// The truck is not made of blocks, so mining the ground under it leaves it where it is. It reads the saved spot from
// the economy on a timer (never a copy per frame) and draws one actor.
import { registerHook } from '../dev/e2e-hooks';
import { aimFromScreen } from '../game/build-controller';
import { pickActor, screenPointOf, type ActorBox } from '../game/actor-hit';
import type { CreatureSystem } from '../game/game';
import type { TargetList } from '../monsters/targets';
import { addTarget } from '../monsters/targets';
import type { ActorView } from '../render/actor-render';
import type { GameRenderer } from '../render/renderer';
import type { World } from '../world/world';
import { BAR_FOOTPRINT } from './bar-spot';
import type { LavakipEconomy } from './lavakip-economy';

/** Priority in `game.addCreatures`: monsters 10, knights 20, the bar 30. */
export const LAVAKIP_BAR_PRIORITY = 30;
/** A tap on the truck counts within this many blocks of the eye (AC313). */
export const BAR_TAP_REACH = 12;
/** Height of the tap box: the body, the awning and the sign. */
export const BAR_TAP_HEIGHT = 2.4;
/** How often the saved spot is read, in seconds. */
const POLL_SECONDS = 0.25;
/** The keep out area: this many blocks around the footprint, from the ground row up this many cells. */
const KEEP_AROUND = 1;
const KEEP_HEIGHT = 4;

export interface LavakipBarOptions {
  economy: LavakipEconomy;
  renderer?: Pick<GameRenderer, 'syncActors'>;
  viewport: () => { width: number; height: number };
  player: { pose(): { x: number; y: number; z: number; yaw: number; pitch: number } };
  /** Opens the order card in the kid overlay (boot builds it). */
  openCard?: () => void;
  /** With the world, a block between the eye and the truck hides it from a tap. */
  world?: World;
}

export interface LavakipBar extends CreatureSystem {
  /** True for a cell no monster may take or stand on: under the footprint and within 1 block, from its ground row up to 4 above. */
  keepOut(x: number, y: number, z: number): boolean;
  /** Where the truck shows on the screen (css pixels), or null: none yet, or behind the camera. */
  screenPoint(): { x: number; y: number } | null;
  /** "Zet hier neer" (the e2e hook `placeLavakipBarHere`). */
  placeHere(): Promise<boolean>;
  /** Orders one lavakip like the card does (the e2e hook `orderLavakip`). */
  order(): Promise<boolean>;
  /** Adds the bar to the near sound targets (kind `bar`). */
  collectTargets(list: TargetList): void;
}

export function createLavakipBar(options: LavakipBarOptions): LavakipBar {
  // The spot read from the economy: the air cell above the ground at the min corner. `has` false means no truck.
  let has = false;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let dirty = true;
  let sinceRead = POLL_SECONDS;
  const view: ActorView = { id: 'bar', model: 'lavakip-bar', x: 0, y: 0, z: 0, heading: 0 };
  const views: ActorView[] = [];
  const boxes: ActorBox[] = [{ id: 'bar', box: [0, 0, 0, 0, 0, 0] }];

  function read(): void {
    sinceRead = 0;
    const s = options.economy.state();
    const nowHas = s.bought && s.spot !== null;
    const spot = s.spot;
    if (nowHas && spot) {
      if (!has || spot.x !== sx || spot.y !== sy || spot.z !== sz) dirty = true;
      sx = spot.x;
      sy = spot.y;
      sz = spot.z;
    } else if (has) {
      dirty = true;
    }
    has = nowHas;
  }

  function sync(): void {
    dirty = false;
    views.length = 0;
    if (has) {
      view.x = sx + 0.5;
      view.y = sy;
      view.z = sz + 0.5;
      views.push(view);
    }
    options.renderer?.syncActors?.('props', views);
  }

  const centre = () => ({ x: sx + BAR_FOOTPRINT.x / 2, y: sy + 1, z: sz + BAR_FOOTPRINT.z / 2 });

  /** True when a tap at the screen point lands on the truck (no block between). */
  function hit(x: number, y: number): boolean {
    if (!has) return false;
    const { width, height } = options.viewport();
    const aim = aimFromScreen(options.player.pose(), width, height, x, y);
    const b = (boxes[0] as ActorBox).box;
    b[0] = sx;
    b[1] = sy;
    b[2] = sz;
    b[3] = sx + BAR_FOOTPRINT.x;
    b[4] = sy + BAR_TAP_HEIGHT;
    b[5] = sz + BAR_FOOTPRINT.z;
    return pickActor(aim, boxes, BAR_TAP_REACH, options.world) !== null;
  }

  read();

  const bar: LavakipBar = {
    step(dt) {
      sinceRead += dt;
      if (sinceRead >= POLL_SECONDS) read();
      if (dirty) sync();
    },
    wantsTap(x, y) {
      return hit(x, y);
    },
    handleTap(x, y) {
      if (!hit(x, y)) return false;
      options.openCard?.();
      return true;
    },
    isOccupied: () => false,
    onWorldReset() {
      // The bar goes to the new home spot and keeps the lavakip the kid carries.
      void options.economy
        .moveHome()
        .then(read)
        .catch(() => undefined);
    },
    keepOut(x, y, z) {
      if (!has) return false;
      return (
        x >= sx - KEEP_AROUND && x < sx + BAR_FOOTPRINT.x + KEEP_AROUND &&
        z >= sz - KEEP_AROUND && z < sz + BAR_FOOTPRINT.z + KEEP_AROUND &&
        y >= sy - 1 && y < sy - 1 + KEEP_HEIGHT + 1
      );
    },
    screenPoint() {
      if (!has) return null;
      const { width, height } = options.viewport();
      return screenPointOf(options.player.pose(), width, height, centre());
    },
    async placeHere() {
      const ok = await options.economy.placeHere();
      read();
      return ok;
    },
    async order() {
      return options.economy.order();
    },
    collectTargets(list) {
      if (!has) return;
      addTarget(list, 'bar', 'bar', sx + BAR_FOOTPRINT.x / 2, sy, sz + BAR_FOOTPRINT.z / 2);
    },
  };

  if (__E2E__) {
    registerHook('placeLavakipBarHere', () => bar.placeHere());
    registerHook('lavakipBarScreenPoint', () => bar.screenPoint());
    registerHook('orderLavakip', () => bar.order());
  }
  return bar;
}
