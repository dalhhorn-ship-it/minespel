import type { Point } from '../dinos/dino-ai';

// The angle from where the kid looks to a target (v22 and v24, decision 144). One function, so the arrow of the pill
// and the pan of a near sound always agree (AC325). Degrees: 0 ahead, 90 right, 180 behind, -90 left.

/** Where the kid stands and looks: the feet (x, z) and the yaw. */
export type LookPose = Pick<Point, 'x' | 'z'> & { yaw: number };

/** Forward is (sin yaw, cos yaw); right is (-cos yaw, sin yaw), as in `screenPointOf` (actor-hit.ts). */
export function targetAngle(pose: LookPose, target: { x: number; z: number }): number {
  const dx = target.x - pose.x;
  const dz = target.z - pose.z;
  const forward = dx * Math.sin(pose.yaw) + dz * Math.cos(pose.yaw);
  const right = -dx * Math.cos(pose.yaw) + dz * Math.sin(pose.yaw);
  if (Math.abs(forward) < 1e-9 && Math.abs(right) < 1e-9) return 0;
  const deg = (Math.atan2(right, forward) * 180) / Math.PI;
  return deg <= -180 ? 180 : deg;
}
