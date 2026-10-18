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
/** Camera arrows. A tap turns exactly 15 degrees over 250 ms. A hold turns 90 degrees a second, with a 250 ms ease in and out. */
export const LOOK_TAP_ANGLE = (15 * Math.PI) / 180;
export const LOOK_TAP_TIME = 0.25;
export const LOOK_HOLD_SPEED = (90 * Math.PI) / 180;
export const LOOK_HOLD_EASE = 0.25;
/** The arrow code calls `tapLook` for a press shorter than this, and `setLookInput` only once the press is this long. */
export const LOOK_TAP_MAX_MS = 200;
const MAX_LOOK_TAPS = 8;

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
  /**
   * Held camera arrows: turnX and tiltY are each -1, 0 or +1 (+1 turns right and looks up). Values are clamped,
   * so the button code may add two opposite arrows. 0, 0 releases (the turn eases out over 250 ms).
   * Tap versus hold: the button code starts a hold only after LOOK_TAP_MAX_MS (200 ms) of pressing. If the finger lifts
   * sooner, it calls `tapLook` instead and never `setLookInput`. So one press is either a tap or a hold, never both.
   */
  setLookInput(turnX: number, tiltY: number): void;
  /** A short press on a camera arrow: turns exactly 15 degrees in that direction, eased over about 250 ms. */
  tapLook(turnX: number, tiltY: number): void;
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

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/**
 * Moves a speed towards a target at a fixed rate (full speed in LOOK_HOLD_EASE seconds) and returns the angle
 * covered in dt. Exact for any dt, also when the target is reached part way through the frame.
 */
function slewSpeed(speed: number, target: number, dt: number): { speed: number; moved: number } {
  const accel = LOOK_HOLD_SPEED / LOOK_HOLD_EASE;
  const diff = target - speed;
  if (diff === 0) return { speed, moved: speed * dt };
  const sign = Math.sign(diff);
  const t1 = Math.min(dt, Math.abs(diff) / accel);
  const moved = speed * t1 + 0.5 * sign * accel * t1 * t1 + (t1 < dt ? target * (dt - t1) : 0);
  return { speed: t1 < dt ? target : speed + sign * accel * t1, moved };
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
  // Camera arrows: target hold direction, current hold speed (rad/s) and running tap turns.
  let holdX = 0;
  let holdY = 0;
  let speedX = 0;
  let speedY = 0;
  let taps: { x: number; y: number; t: number }[] = [];

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
    setLookInput(turnX, tiltY) {
      holdX = clampUnit(turnX);
      holdY = clampUnit(tiltY);
    },
    tapLook(turnX, tiltY) {
      const x = clampUnit(turnX);
      const y = clampUnit(tiltY);
      if (x === 0 && y === 0) return;
      if (taps.length >= MAX_LOOK_TAPS) taps.shift();
      taps.push({ x, y, t: 0 });
    },
    update(dt) {
      const d = options.look.consumeDelta();
      // Dragging right turns right (yaw falls); dragging up looks up.
      let dYaw = -d.dx * LOOK_SENSITIVITY;
      let dPitch = -d.dy * LOOK_SENSITIVITY;

      // Camera arrows, using the frame time so 30 and 60 fps give the same turn.
      const ldt = Math.min(Math.max(dt, 0), MAX_FRAME_TIME);
      const slew = slewSpeed(speedX, holdX * LOOK_HOLD_SPEED, ldt);
      speedX = slew.speed;
      dYaw -= slew.moved;
      const slewY = slewSpeed(speedY, holdY * LOOK_HOLD_SPEED, ldt);
      speedY = slewY.speed;
      dPitch += slewY.moved;
      if (taps.length > 0) {
        for (const tap of taps) {
          const before = smoothstep(tap.t / LOOK_TAP_TIME);
          tap.t += ldt;
          const step = (smoothstep(tap.t / LOOK_TAP_TIME) - before) * LOOK_TAP_ANGLE;
          dYaw -= tap.x * step;
          dPitch += tap.y * step;
        }
        taps = taps.filter((tap) => tap.t < LOOK_TAP_TIME);
      }
      ctrl.yaw += dYaw;
      ctrl.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, ctrl.pitch + dPitch));

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
      holdX = 0;
      holdY = 0;
      speedX = 0;
      speedY = 0;
      taps = [];
    },
    pose() {
      return { x: player.x, y: player.y + EYE_HEIGHT, z: player.z, yaw: ctrl.yaw, pitch: ctrl.pitch };
    },
  };
  return ctrl;
}
