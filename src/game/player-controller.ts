// Turns the stick, the look drag and the jump button into player movement and a camera pose.
import type { Look } from '../input/look';
import type { Stick } from '../input/stick';
import type { CameraPose } from '../render/renderer';
import {
  EYE_HEIGHT, MAX_FRAME_TIME, MAX_PLAYER_Y, PHYSICS_STEP, collides, createPlayer, groundInColumn, nearestStandingSpot, stepPlayer,
  type PlayerState,
} from '../world/physics';
import { START_SPOT, WORLD_SIZE } from '../world/terrain';
import type { World } from '../world/world';

/** Radians of turn per dragged point. */
export const LOOK_SENSITIVITY = 0.006;
export const MAX_PITCH = 1.4;

export interface PlayerController {
  readonly player: PlayerState;
  yaw: number;
  pitch: number;
  /** Call from the jump button. The jump is sent to physics as one frame. */
  jump(): void;
  /** Omhoog: while held the player floats up. Pressing it at any time starts (or continues) floating. */
  setAscending(on: boolean): void;
  /** Omlaag: while held a floating player sinks. Does nothing on the ground. Landing ends floating. */
  setDescending(on: boolean): void;
  /** True while the player floats (no gravity). */
  isFloating(): boolean;
  /** Used by the save to bring back a floating player. */
  setFloating(on: boolean): void;
  update(dt: number): void;
  /** Ends floating and puts the player on the ground at the start spot (or the nearest free standing cell), looking ahead. */
  reset(): void;
  pose(): CameraPose;
}

export interface PlayerControllerOptions {
  world: World;
  stick: Pick<Stick, 'vector'>;
  look: Pick<Look, 'consumeDelta'>;
}

/** Stick (x right, y -1 forward) to a world space direction for a given yaw. Pure. */
export function stickToWorld(stickX: number, stickY: number, yaw: number): { moveX: number; moveZ: number } {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // Right of the view direction, with yaw 0 looking towards +z.
  const rx = -Math.cos(yaw);
  const rz = Math.sin(yaw);
  const forward = -stickY;
  return { moveX: fx * forward + rx * stickX, moveZ: fz * forward + rz * stickX };
}

/**
 * Puts a restored player inside the world. If the spot is inside a block, the player is put on the ground
 * in that column (or the nearest free standing cell). Returns true when the spot had to change.
 */
export function settlePlayer(world: World, p: PlayerState): boolean {
  const x = Math.max(0.5, Math.min(WORLD_SIZE - 0.5, p.x));
  const z = Math.max(0.5, Math.min(WORLD_SIZE - 0.5, p.z));
  const y = Math.max(0, Math.min(MAX_PLAYER_Y, p.y));
  p.x = x; p.y = y; p.z = z;
  if (!collides(world, x, y, z)) return false;
  const ground = groundInColumn(world, x, z);
  if (ground !== null) {
    p.y = ground;
  } else {
    const spot = nearestStandingSpot(world, x, y, z);
    p.x = spot.x; p.y = spot.y; p.z = spot.z;
  }
  return true;
}

export function createPlayerController(options: PlayerControllerOptions): PlayerController {
  const player = createPlayer(START_SPOT.x, START_SPOT.y, START_SPOT.z);
  let jumpPending = false;
  let floating = false;
  let upHeld = false;
  let downHeld = false;
  // A press shorter than one physics step still counts for one step.
  let upPending = false;
  let downPending = false;

  const ctrl: PlayerController = {
    player,
    yaw: 0,
    pitch: 0,
    jump() {
      jumpPending = true;
    },
    setAscending(on) {
      upHeld = on;
      if (on) {
        floating = true;
        upPending = true;
      }
    },
    setDescending(on) {
      downHeld = on;
      if (on && floating) downPending = true;
    },
    isFloating: () => floating,
    setFloating(on) {
      floating = on;
      if (!on) {
        upPending = false;
        downPending = false;
      }
    },
    update(dt) {
      const d = options.look.consumeDelta();
      // Dragging right turns right (yaw falls); dragging up looks up.
      ctrl.yaw -= d.dx * LOOK_SENSITIVITY;
      ctrl.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, ctrl.pitch - d.dy * LOOK_SENSITIVITY));

      const s = options.stick.vector();
      const dir = stickToWorld(s.x, s.y, ctrl.yaw);
      // Physics wants a direction of length 1 at most; it sets the walk speed itself.
      const len = Math.hypot(dir.moveX, dir.moveZ);
      const k = len > 1 ? 1 / len : 1;

      // The jump goes in for one frame. If this frame is too short for a physics step, wait for the next.
      const willStep = player.leftover + Math.min(Math.max(dt, 0), MAX_FRAME_TIME) >= PHYSICS_STEP;
      const up = floating && (upHeld || upPending);
      const down = floating && (downHeld || downPending);
      // Both held, or neither: hover.
      const flyY = up === down ? 0 : up ? 1 : -1;
      stepPlayer(
        options.world,
        player,
        { moveX: dir.moveX * k, moveZ: dir.moveZ * k, jump: !floating && jumpPending && willStep, floating, flyY },
        dt,
      );
      // Touching the ground while going down ends floating.
      if (floating && flyY < 0 && player.onGround) floating = false;
      if (player.y > MAX_PLAYER_Y) {
        player.y = MAX_PLAYER_Y;
        if (player.vy > 0) player.vy = 0;
      }
      if (willStep) {
        jumpPending = false;
        upPending = false;
        downPending = false;
      }
    },
    reset() {
      const spot = nearestStandingSpot(options.world, START_SPOT.x, START_SPOT.y, START_SPOT.z);
      player.x = spot.x;
      player.y = spot.y;
      player.z = spot.z;
      player.vy = 0;
      player.onGround = false;
      player.leftover = 0;
      ctrl.yaw = 0;
      ctrl.pitch = 0;
      jumpPending = false;
      floating = false;
      upHeld = false;
      downHeld = false;
      upPending = false;
      downPending = false;
    },
    pose() {
      return { x: player.x, y: player.y + EYE_HEIGHT, z: player.z, yaw: ctrl.yaw, pitch: ctrl.pitch };
    },
  };
  return ctrl;
}
