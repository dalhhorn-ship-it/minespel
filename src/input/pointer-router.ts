// Decides who owns each finger: the stick (left half), the look zone (right half), or nobody
// (a touch that starts on a button, the hotbar or another ignore zone). Each owner gets at
// most one finger at a time, so stick and look work together (AC8).

export interface PointerOwner {
  down(e: PointerEvent): void;
  move(e: PointerEvent): void;
  up(e: PointerEvent): void;
  cancel(e: PointerEvent): void;
}

export interface PointerRouterOptions {
  stick: PointerOwner;
  look: PointerOwner;
  /** X coordinate that splits left from right. Default: half the window width. */
  splitX?: () => number;
}

export interface PointerRouter {
  /** Touches that start inside this element never look, tap or steer (AC104). Returns a remover. */
  addIgnoreZone(zone: Element): () => void;
  /** Who owns this pointer right now. */
  ownerOf(pointerId: number): 'stick' | 'look' | null;
  destroy(): void;
}

export function createPointerRouter(root: HTMLElement, options: PointerRouterOptions): PointerRouter {
  const zones = new Set<Element>();
  const owned = new Map<number, 'stick' | 'look'>();
  const owners = { stick: options.stick, look: options.look };
  const split = options.splitX ?? (() => window.innerWidth / 2);

  const inIgnoreZone = (target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) return false;
    for (const z of zones) if (z === target || z.contains(target)) return true;
    return false;
  };
  const sideTaken = (side: 'stick' | 'look'): boolean => {
    for (const s of owned.values()) if (s === side) return true;
    return false;
  };

  const down = (e: PointerEvent) => {
    if (owned.has(e.pointerId) || inIgnoreZone(e.target)) return;
    const side = e.clientX < split() ? 'stick' : 'look';
    if (sideTaken(side)) return; // a second finger on the same side is ignored
    owned.set(e.pointerId, side);
    try {
      root.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is only a convenience */
    }
    owners[side].down(e);
  };
  const move = (e: PointerEvent) => {
    const side = owned.get(e.pointerId);
    if (side) owners[side].move(e);
  };
  const end = (kind: 'up' | 'cancel') => (e: PointerEvent) => {
    const side = owned.get(e.pointerId);
    if (!side) return;
    owned.delete(e.pointerId);
    owners[side][kind](e);
  };
  const up = end('up');
  const cancel = end('cancel');

  root.addEventListener('pointerdown', down);
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', cancel);

  return {
    addIgnoreZone(zone) {
      zones.add(zone);
      return () => zones.delete(zone);
    },
    ownerOf: (id) => owned.get(id) ?? null,
    destroy() {
      root.removeEventListener('pointerdown', down);
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', up);
      root.removeEventListener('pointercancel', cancel);
      owned.clear();
      zones.clear();
    },
  };
}
