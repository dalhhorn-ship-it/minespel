// The near sound mix (v24, decision 144, AC323 to AC326): pure rules for how loud and where a source sounds. V22a holds
// the shared pan rule and a closeness that gives 0; V24b fills the distances of each kind: the closeness from the start
// distance to the loudest distance, the fixed beat per kind, the 2 sources with the highest closeness.
import type { TargetKind } from '../monsters/targets';

/** The pan of a source: half the sine of the arrow angle (degrees), so -0.5 left, 0 ahead and behind, 0.5 right (AC325). */
export function panOf(angleDeg: number): number {
  return 0.5 * Math.sin((angleDeg * Math.PI) / 180);
}

/** How close a source of this kind is, 0 to 1: 0 when out of range, 1 at the loudest distance. 0 until V24b. */
export function closeness(kind: TargetKind, distance: number): number {
  void kind;
  void distance;
  return 0;
}
