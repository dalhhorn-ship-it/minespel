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

export function countNear(spot: GuardSpot, animals: readonly GuardAnimal[]): { dinos: number; chickens: number } {
  let dinos = 0;
  let chickens = 0;
  for (const a of animals) {
    const near =
      Math.abs(a.x - spot.x) <= GUARD_RADIUS &&
      Math.abs(a.y - spot.y) <= GUARD_RADIUS &&
      Math.abs(a.z - spot.z) <= GUARD_RADIUS;
    if (!near) continue;
    if (a.kind === 'kip') chickens += 1;
    else dinos += 1;
  }
  return { dinos, chickens };
}

export function guardReport(spot: GuardSpot, animals: readonly GuardAnimal[]): string {
  const { dinos, chickens } = countNear(spot, animals);
  if (dinos + chickens === 0) return LINE_NO_ANIMALS;
  const parts: string[] = [];
  if (dinos > 0) parts.push(dinos === 1 ? '1 dino' : `${dinos} dino's`);
  if (chickens > 0) parts.push(chickens === 1 ? '1 kip' : `${chickens} kippen`);
  return `Ik pas op ${parts.join(' en ')}. Alles veilig!`;
}
