// Turns the stick, the look drag, eased camera arrows, jump, and sky ascend into player movement and a camera pose.
import type { Look } from '../input/look';
import type { Stick } from '../input/stick';
import type { CameraPose } from '../render/renderer';
import {
  EYE_HEIGHT,
  MAX_FRAME_TIME,
  PHYSICS_STEP,
  createPlayer,
  stepPlayer,
  type PlayerState,
} from '../world/physics';
import { START_SPOT, WORLD_HEIGHT } from '../world/terrain';
import type { World } from '../world/world';

/** Radians of turn per dragged point. */
export const LOOK_SENSITIVITY = 0.006;
export const MAX_PITCH = 1.4;
/** Radians per second when holding a camera angle arrow button or key. */
export const LOOK_ARROW_SPEED = 1.9;
/** Exponential easing rate for smooth camera arrow acceleration/deceleration. */
export const LOOK_EASE_RATE = 10;

export interface PlayerController {
  readonly player: PlayerState;
  yaw: number;
  pitch: number;
  /** Call from the jump button. The jump is sent to physics as one frame. */
  jump(): void;
  /** Boosts the player upward in the sky (clamped below WORLD_HEIGHT - 2) and engages floating. */
  ascend(): void;
  /** Hold-to-ascend into the sky; releasing leaves the player floating at that altitude. */
  setAscending(active: boolean): void;
  /** Moves the player downward from the sky. */
  descend(): void;
  /** Hold-to-descend from the sky; landing on solid ground disengages floating. */
  setDescending(active: boolean): void;
  /** True while the player is floating in mid-air via Omhoog/Omlaag. */
  isFloating(): boolean;
  /** Continuous camera angle arrow input: turnX in [-1, 1] (+1 right), tiltY in [-1, 1] (+1 up). */
  setLookInput(turnX: number, tiltY: number): void;
  /** Smooth angular impulse for a quick tap on a camera angle arrow. */
  nudgeLook(turnX: number, tiltY: number): void;
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
  let floating = false;
  let ascendPending = false;
  let ascendingHeld = false;
  let descendPending = false;
  let descendingHeld = false;
  let targetTurnX = 0;
  let targetTiltY = 0;
  let yawVel = 0;
  let pitchVel = 0;

  const clampPitch = (p: number) => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p));

  const ctrl: PlayerController = {
    player,
    yaw: 0,
    pitch: 0,
    jump() {
      jumpPending = true;
    },
    ascend() {
      floating = true;
      ascendPending = true;
      descendPending = false;
    },
    setAscending(active) {
      ascendingHeld = active;
      if (active) {
        floating = true;
        ascendPending = true;
        descendPending = false;
      }
    },
    descend() {
      if (!player.onGround || floating) {
        floating = true;
        descendPending = true;
        ascendPending = false;
      }
    },
    setDescending(active) {
      descendingHeld = active;
      if (active && (!player.onGround || floating)) {
        floating = true;
        descendPending = true;
        ascendPending = false;
      }
    },
    isFloating: () => floating,
    setLookInput(turnX, tiltY) {
      targetTurnX = Math.max(-1, Math.min(1, turnX));
      targetTiltY = Math.max(-1, Math.min(1, tiltY));
    },
    nudgeLook(turnX, tiltY) {
      yawVel += Math.max(-1, Math.min(1, turnX)) * LOOK_ARROW_SPEED * 0.85;
      pitchVel += Math.max(-1, Math.min(1, tiltY)) * LOOK_ARROW_SPEED * 0.85;
    },
    update(dt) {
      const clampedDt = Math.min(Math.max(dt, 0), MAX_FRAME_TIME);
      const d = options.look.consumeDelta();
      // Dragging right turns right (yaw falls); dragging up looks up.
      ctrl.yaw -= d.dx * LOOK_SENSITIVITY;
      ctrl.pitch = clampPitch(ctrl.pitch - d.dy * LOOK_SENSITIVITY);

      // Smoothly ease camera arrow angular velocity toward target input.
      const alpha = clampedDt > 0 ? 1 - Math.exp(-clampedDt * LOOK_EASE_RATE) : 0;
      const desiredYawVel = targetTurnX * LOOK_ARROW_SPEED;
      const desiredPitchVel = targetTiltY * LOOK_ARROW_SPEED;
      yawVel += (desiredYawVel - yawVel) * alpha;
      pitchVel += (desiredPitchVel - pitchVel) * alpha;
      if (Math.abs(yawVel) > 1e-4 || Math.abs(pitchVel) > 1e-4) {
        ctrl.yaw -= yawVel * clampedDt;
        ctrl.pitch = clampPitch(ctrl.pitch + pitchVel * clampedDt);
      }

      const s = options.stick.vector();
      const dir = stickToWorld(s.x, s.y, ctrl.yaw);
      // Physics wants a direction of length 1 at most; it sets the walk speed itself.
      const len = Math.hypot(dir.moveX, dir.moveZ);
      const k = len > 1 ? 1 / len : 1;

      // The jump goes in for one frame. If this frame is too short for a physics step, wait for the next.
      const willStep = player.leftover + clampedDt >= PHYSICS_STEP;
      const wantUp = (ascendingHeld || (ascendPending && willStep)) && player.y < WORLD_HEIGHT - 2;
      const wantDown = descendingHeld || (descendPending && willStep);
      const flyY = wantUp ? 1 : wantDown ? -1 : 0;

      stepPlayer(
        options.world,
        player,
        {
          moveX: dir.moveX * k,
          moveZ: dir.moveZ * k,
          jump: jumpPending && willStep,
          floating,
          flyY,
        },
        dt,
      );
      if (floating && wantDown && player.onGround) {
        floating = false;
      }
      if (player.y > WORLD_HEIGHT - 2) {
        player.y = WORLD_HEIGHT - 2;
        if (player.vy > 0) player.vy = 0;
      }
      if (willStep) {
        jumpPending = false;
        ascendPending = false;
        descendPending = false;
      }
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
      floating = false;
      ascendPending = false;
      ascendingHeld = false;
      descendPending = false;
      descendingHeld = false;
      targetTurnX = 0;
      targetTiltY = 0;
      yawVel = 0;
      pitchVel = 0;
    },
    pose() {
      return { x: player.x, y: player.y + EYE_HEIGHT, z: player.z, yaw: ctrl.yaw, pitch: ctrl.pitch };
    },
  };
  return ctrl;
}
