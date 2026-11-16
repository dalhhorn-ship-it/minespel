// The things the pill and the near sounds point at (v22 and v24, decision 144). Owners fill one reused list: the
// monster system (bubble, Klodder, moles) and the Lavakip-bar. Nobody allocates per call: `createTargetList` makes the
// 8 objects once, `addTarget` writes into the next one.

export type TargetKind = 'bubble' | 'klodder' | 'mole' | 'mole-caught' | 'bar';

export const MAX_TARGETS = 8;

export interface Target {
  /** Stable while the thing exists ('bubble', 'klodder', 'mole-<id>', 'bar'), so a sound keeps its voice. */
  id: string;
  kind: TargetKind;
  /** The feet centre of the thing. */
  x: number;
  y: number;
  z: number;
}

export interface TargetList {
  items: Target[];
  count: number;
}

export function createTargetList(): TargetList {
  const items: Target[] = [];
  for (let i = 0; i < MAX_TARGETS; i++) items.push({ id: '', kind: 'bubble', x: 0, y: 0, z: 0 });
  return { items, count: 0 };
}

export function clearTargets(list: TargetList): void {
  list.count = 0;
}

/** Writes one target into the list. False (and nothing written) when the list is full. */
export function addTarget(list: TargetList, id: string, kind: TargetKind, x: number, y: number, z: number): boolean {
  if (list.count >= list.items.length) return false;
  const t = list.items[list.count] as Target;
  t.id = id;
  t.kind = kind;
  t.x = x;
  t.y = y;
  t.z = z;
  list.count++;
  return true;
}
