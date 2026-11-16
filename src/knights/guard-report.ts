// The guard report (AC206): what a knight on Pas op de dieren says when the kid taps him.
// Dinos and chickens (kind 'kip') within 8 blocks of his spot, along each axis. Eggs never count.
export const GUARD_RADIUS = 8;
export const LINE_NO_ANIMALS = 'Hier zijn nog geen dieren.';

export interface GuardAnimal {
  kind: string;
  x: number;
  y: number;
  z: number;
}

export interface GuardSpot {
  x: number;
  y: number;
  z: number;
}

/** A knight guards at most this many animals (AC331), so the report counts at most this many. */
export const REPORT_MAX = 4;
export const LINE_MORE = 'Meer dan 4 lukt me niet.';

/** The animals in his guard area, nearest first. */
function inArea(spot: GuardSpot, animals: readonly GuardAnimal[]): GuardAnimal[] {
  const found: { a: GuardAnimal; d: number }[] = [];
  for (const a of animals) {
    const near =
      Math.abs(a.x - spot.x) <= GUARD_RADIUS &&
      Math.abs(a.y - spot.y) <= GUARD_RADIUS &&
      Math.abs(a.z - spot.z) <= GUARD_RADIUS;
    if (near) found.push({ a, d: Math.hypot(a.x - spot.x, a.y - spot.y, a.z - spot.z) });
  }
  found.sort((p, q) => p.d - q.d);
  return found.map((f) => f.a);
}

/** Counts the animals he reports: the nearest 4 of his guard area. `more` is true when the area holds more than 4. */
export function countNear(spot: GuardSpot, animals: readonly GuardAnimal[]): { dinos: number; chickens: number; more: boolean } {
  const all = inArea(spot, animals);
  let dinos = 0;
  let chickens = 0;
  for (const a of all.slice(0, REPORT_MAX)) {
    if (a.kind === 'kip') chickens += 1;
    else dinos += 1;
  }
  return { dinos, chickens, more: all.length > REPORT_MAX };
}

export function guardReport(spot: GuardSpot, animals: readonly GuardAnimal[]): string {
  const { dinos, chickens, more } = countNear(spot, animals);
  if (dinos + chickens === 0) return LINE_NO_ANIMALS;
  const parts: string[] = [];
  if (dinos > 0) parts.push(dinos === 1 ? '1 dino' : `${dinos} dino's`);
  if (chickens > 0) parts.push(chickens === 1 ? '1 kip' : `${chickens} kippen`);
  return `Ik pas op ${parts.join(' en ')}.${more ? ` ${LINE_MORE}` : ''} Alles veilig!`;
}
