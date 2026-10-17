// Tap to mine (Hakken) or build (Bouwen). Turns a screen tap into a ray from the eye, then uses the build rules.
import type { Effects } from '../render/effects';
import type { BuildMode } from '../ui/hud';
import type { Sound } from '../audio/sound';
import {
  AARDE, BAKSTEEN, BOOMSTAM, GLAS, GRAS, PLANKEN, STEEN, WOL_ROOD, isPlaceable,
} from '../world/blocks';
import { mineBlock, placeBlock, type Aim, type IsOccupied } from '../world/build';
import type { CameraPose } from '../render/renderer';
import type { World } from '../world/world';
import type { PlayerController } from './player-controller';

export const HOTBAR_SIZE = 8;
/** Vertical field of view of the camera in degrees (the renderer uses the same). */
export const CAMERA_FOV = 70;
export const DEFAULT_HOTBAR: readonly number[] = [GRAS, AARDE, STEEN, PLANKEN, BOOMSTAM, GLAS, BAKSTEEN, WOL_ROOD];

export interface BuildState {
  mode: BuildMode;
  /** Exactly 8 placeable block ids. */
  hotbar: number[];
  /** Selected slot, 0 to 7. */
  selected: number;
}

/**
 * The ray for a tap at screen point (x, y). It follows the camera exactly as the renderer turns it:
 * rotation order YXZ with euler (pitch, yaw + pi, 0).
 */
export function aimFromScreen(pose: CameraPose, width: number, height: number, x: number, y: number): Aim {
  const t = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const ndcX = (x / Math.max(1, width)) * 2 - 1;
  const ndcY = 1 - (y / Math.max(1, height)) * 2;
  // Camera space: looks down -z, +x right, +y up.
  const cx = ndcX * t * (width / Math.max(1, height));
  const cy = ndcY * t;
  const cz = -1;
  // Pitch first, then yaw (the renderer uses rotation order YXZ).
  const y1 = cy * Math.cos(pose.pitch) - cz * Math.sin(pose.pitch);
  const z1 = cy * Math.sin(pose.pitch) + cz * Math.cos(pose.pitch);
  const th = pose.yaw + Math.PI;
  const x2 = cx * Math.cos(th) + z1 * Math.sin(th);
  const z2 = -cx * Math.sin(th) + z1 * Math.cos(th);
  return { ox: pose.x, oy: pose.y, oz: pose.z, dx: x2, dy: y1, dz: z2 };
}

export interface BuildControllerOptions {
  world: World;
  player: PlayerController;
  /** Called after a block changed, with its x and z (the renderer rebuilds that chunk). */
  onBlockChanged: (x: number, z: number) => void;
  effects: Pick<Effects, 'pop'>;
  sound: Pick<Sound, 'play'>;
  viewport: () => { width: number; height: number };
  /** Asks if a dino or egg is in a box (AC6). */
  isOccupied?: IsOccupied;
  /** Runs before any block logic. Return true when a dino or egg took the tap (AC104). */
  tapFirst?: (aim: Aim, x: number, y: number) => boolean;
  /** False while the world is stopped: taps then do nothing. */
  canAct?: () => boolean;
}

export interface BuildController {
  tap(x: number, y: number): void;
  getState(): BuildState;
  /** Bad data is fixed up: wrong blocks fall back to the start hotbar. */
  setState(state: Partial<BuildState>): void;
  setMode(mode: BuildMode): void;
  select(slot: number): void;
  /** Puts a block in a slot and selects it. */
  setSlotBlock(slot: number, block: number): void;
}

export function createBuildController(options: BuildControllerOptions): BuildController {
  let mode: BuildMode = 'hakken';
  let hotbar = [...DEFAULT_HOTBAR];
  let selected = 0;
  const validSlot = (n: number) => Number.isInteger(n) && n >= 0 && n < HOTBAR_SIZE;

  return {
    tap(x, y) {
      if (options.canAct && !options.canAct()) return;
      const { width, height } = options.viewport();
      const aim = aimFromScreen(options.player.pose(), width, height, x, y);
      if (options.tapFirst?.(aim, x, y)) return;
      if (mode === 'hakken') {
        const r = mineBlock(options.world, aim);
        if (!r.ok) return;
        options.onBlockChanged(r.x, r.z);
        options.effects.pop(x, y, r.block);
        options.sound.play('pop');
        return;
      }
      const block = hotbar[selected]!;
      const p = options.player.player;
      const r = placeBlock(options.world, aim, block, p, options.isOccupied);
      if (!r.ok) return;
      if (r.liftPlayerTo !== undefined) {
        p.y = r.liftPlayerTo;
        p.vy = 0;
      }
      options.onBlockChanged(r.x, r.z);
      options.effects.pop(x, y, r.block);
      options.sound.play('thunk');
    },
    getState: () => ({ mode, hotbar: [...hotbar], selected }),
    setState(state) {
      if (state.mode === 'hakken' || state.mode === 'bouwen') mode = state.mode;
      if (Array.isArray(state.hotbar)) {
        const ok = state.hotbar.length === HOTBAR_SIZE && state.hotbar.every((b) => Number.isInteger(b) && isPlaceable(b));
        hotbar = ok ? [...state.hotbar] : [...DEFAULT_HOTBAR];
      }
      if (state.selected !== undefined && validSlot(state.selected)) selected = state.selected;
    },
    setMode(m) {
      mode = m;
    },
    select(slot) {
      if (validSlot(slot)) selected = slot;
    },
    setSlotBlock(slot, block) {
      if (!validSlot(slot) || !isPlaceable(block)) return;
      hotbar[slot] = block;
      selected = slot;
    },
  };
}
