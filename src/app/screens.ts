// Screen manager. Keeps a stack of open screens. The top one decides the screen kind for the timer matrix (PRD 4.4).
// Kinds: world (nothing open), kid-overlay (pause menu, shop, Lesboek, dino menu, block grid, name keyboard),
// learn (break, practice), exam, parent. The guard overlays (portrait, too small) are not screens: the guard reports them.
import type { ScreenKind } from '../core/timers';
import { el } from '../ui/dom';

export interface Screens {
  /** Kind of the top screen, or 'world'. */
  current(): ScreenKind;
  /** Opens a screen on top. `node` is shown in the screen layer. Returns a function that closes exactly this screen. */
  open(kind: ScreenKind, node?: HTMLElement): () => void;
  /** Number of open screens. */
  depth(): number;
  /** Calls the listener now and on every change. Returns an unsubscribe function. */
  subscribe(listener: (kind: ScreenKind) => void): () => void;
}

export function createScreens(host?: HTMLElement, doc: Document = document): Screens {
  const root = host ?? doc.getElementById('overlays') ?? doc.body;
  const layer = el('div', { class: 'screen-layer' });
  root.append(layer);
  const stack: Array<{ kind: ScreenKind; node: HTMLElement | undefined }> = [];
  const listeners = new Set<(k: ScreenKind) => void>();

  const current = (): ScreenKind => stack[stack.length - 1]?.kind ?? 'world';
  const emit = () => {
    const k = current();
    layer.dataset.screen = k;
    layer.hidden = stack.length === 0;
    for (const l of [...listeners]) l(k);
  };
  layer.hidden = true;

  return {
    current,
    open(kind, node) {
      const entry = { kind, node };
      stack.push(entry);
      if (node) layer.append(node);
      emit();
      let closed = false;
      return () => {
        if (closed) return;
        closed = true;
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
        node?.remove();
        emit();
      };
    },
    depth: () => stack.length,
    subscribe(listener) {
      listeners.add(listener);
      listener(current());
      return () => listeners.delete(listener);
    },
  };
}
