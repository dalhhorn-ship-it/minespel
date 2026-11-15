// The shared tap hit test for creatures (knights now, monsters in v18): the closest box the aim hits,
// in front of any solid block. Built on `rayHitsBox` and `aimFromScreen`; `screenPointOf` is the reverse of the aim.
import type { CameraPose } from '../render/renderer';
import type { Aim, Box } from '../world/build';
import { raycast, REACH } from '../world/raycast';
import type { World } from '../world/world';
import { CAMERA_FOV } from './build-controller';
import { rayHitsBox } from './dino-system';

export interface ActorBox {
  id: string;
  box: Box;
}

/** Tap padding around a box in blocks, so a tap on a moving creature feels fair. */
export const ACTOR_PAD = 0.15;

/**
 * The id of the closest box the ray hits within `maxDistance`, or null. With `world`, a box behind a solid block
 * is not hit. A box that holds the eye is skipped.
 */
export function pickActor(aim: Aim, boxes: readonly ActorBox[], maxDistance: number = REACH, world?: World): string | null {
  const blockHit = world ? raycast(world, aim.ox, aim.oy, aim.oz, aim.dx, aim.dy, aim.dz, maxDistance) : null;
  let best = blockHit ? blockHit.distance : maxDistance;
  let id: string | null = null;
  for (const a of boxes) {
    const b = a.box;
    const padded: Box = [b[0] - ACTOR_PAD, b[1], b[2] - ACTOR_PAD, b[3] + ACTOR_PAD, b[4] + ACTOR_PAD, b[5] + ACTOR_PAD];
    if (aim.ox > padded[0] && aim.ox < padded[3] && aim.oy > padded[1] && aim.oy < padded[4] && aim.oz > padded[2] && aim.oz < padded[5]) continue;
    const t = rayHitsBox(aim, padded, maxDistance);
    if (t !== null && t <= best) {
      best = t;
      id = a.id;
    }
  }
  return id;
}

/** Where a world point shows on the screen (css pixels), or null when it is behind the camera. Reverse of `aimFromScreen`. */
export function screenPointOf(pose: CameraPose, width: number, height: number, p: { x: number; y: number; z: number }): { x: number; y: number } | null {
  const dx = p.x - pose.x, dy = p.y - pose.y, dz = p.z - pose.z;
  const th = pose.yaw + Math.PI;
  const cx = dx * Math.cos(th) - dz * Math.sin(th);
  const z1 = dx * Math.sin(th) + dz * Math.cos(th);
  const cy = dy * Math.cos(pose.pitch) + z1 * Math.sin(pose.pitch);
  const cz = -dy * Math.sin(pose.pitch) + z1 * Math.cos(pose.pitch);
  if (!(cz < -1e-6)) return null;
  const t = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const ndcX = cx / -cz / (t * (width / Math.max(1, height)));
  const ndcY = cy / -cz / t;
  return { x: ((ndcX + 1) / 2) * width, y: ((1 - ndcY) / 2) * height };
}
