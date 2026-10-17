// Turns the stick, the look drag and the jump button into player movement and a camera pose.
import type { Look } from '../input/look';
import type { Stick } from '../input/stick';
import type { CameraPose } from '../render/renderer';
import { EYE_HEIGHT, MAX_FRAME_TIME, PHYSICS_STEP, createPlayer, stepPlayer, type PlayerState } from '../world/physics';
import { START_SPOT } from '../world/terrain';
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
  update(dt: number): void;
  /** Puts the player back on the start spot, standing still, looking ahead. */
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

export function createPlayerController(options: PlayerControllerOptions): PlayerController {
  const player = createPlayer(START_SPOT.x, START_SPOT.y, START_SPOT.z);
  let jumpPending = false;

  const ctrl: PlayerController = {
    player,
    yaw: 0,
    pitch: 0,
    jump() {
      jumpPending = true;
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
      stepPlayer(options.world, player, { moveX: dir.moveX * k, moveZ: dir.moveZ * k, jump: jumpPending && willStep }, dt);
      if (willStep) jumpPending = false;
    },
    reset() {
      player.x = START_SPOT.x;
      player.y = START_SPOT.y;
      player.z = START_SPOT.z;
      player.vy = 0;
      player.onGround = false;
      player.leftover = 0;
      ctrl.yaw = 0;
      ctrl.pitch = 0;
      jumpPending = false;
    },
    pose() {
      return { x: player.x, y: player.y + EYE_HEIGHT, z: player.z, yaw: ctrl.yaw, pitch: ctrl.pitch };
    },
  };
  return ctrl;
}
