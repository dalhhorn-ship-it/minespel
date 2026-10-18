// Screen manager and overlay layers (T41).
// Tracks which screen is on top (`world`, `kid-overlay`, `learn`, `exam`, `parent`),
// pauses the 3D world when a full screen or menu is up, and restores what the kid was doing
// when the parent area closes (PRD 4.12).

import type { ScreenKind } from '../core/timers';
import { registerHook } from '../dev/e2e-hooks';
import { el } from '../ui/dom';

export type { ScreenKind };

export interface ScreenManagerOptions {
  host: HTMLElement;
  onWorldActiveChange?: (active: boolean) => void;
}

export interface ScreenManager {
  readonly root: HTMLElement;
  current(): ScreenKind;
  /** The kid screen underneath when `parent` is open. */
  underlyingKidScreen(): Exclude<ScreenKind, 'parent'>;
  showWorld(): void;
  showKidOverlay(node: HTMLElement | null): void;
  /** Marks an in-HUD kid overlay (such as "Alle blokken") open or closed so the play timer stops (AC23). */
  setExternalKidOverlay(open: boolean): void;
  showLearn(node: HTMLElement | null): void;
  showExam(node: HTMLElement | null): void;
  showParent(node: HTMLElement | null): void;
  subscribe(listener: (kind: ScreenKind) => void): () => void;
  destroy(): void;
}

export function createScreenManager(options: ScreenManagerOptions): ScreenManager {
  const kidOverlayLayer = el('div', { class: 'screen-layer screen-layer-kid-overlay' });
  const learnLayer = el('div', { class: 'screen-layer screen-layer-learn' });
  const examLayer = el('div', { class: 'screen-layer screen-layer-exam' });
  const parentLayer = el('div', { class: 'screen-layer screen-layer-parent' });

  kidOverlayLayer.hidden = true;
  learnLayer.hidden = true;
  examLayer.hidden = true;
  parentLayer.hidden = true;

  const root = el('div', { class: 'screen-layers' }, [
    kidOverlayLayer,
    learnLayer,
    examLayer,
    parentLayer,
  ]);
  options.host.append(root);

  let hasKidOverlayNode = false;
  let externalKidOverlay = false;
  let hasLearnNode = false;
  let hasExamNode = false;
  let hasParentNode = false;

  const listeners = new Set<(kind: ScreenKind) => void>();

  function underlyingKidScreen(): Exclude<ScreenKind, 'parent'> {
    if (hasExamNode) return 'exam';
    if (hasLearnNode) return 'learn';
    if (hasKidOverlayNode || externalKidOverlay) return 'kid-overlay';
    return 'world';
  }

  function computeKind(): ScreenKind {
    if (hasParentNode) return 'parent';
    return underlyingKidScreen();
  }

  let lastKind: ScreenKind = computeKind();
  let lastWorldActive = lastKind === 'world';

  function sync() {
    kidOverlayLayer.hidden = !hasKidOverlayNode;
    learnLayer.hidden = !hasLearnNode;
    examLayer.hidden = !hasExamNode;
    parentLayer.hidden = !hasParentNode;

    const nextKind = computeKind();
    // Keep the 3D world running only when the world is on screen (or when only "Alle blokken" is up).
    const worldActive = nextKind === 'world' || (nextKind === 'kid-overlay' && !hasKidOverlayNode && externalKidOverlay);
    if (worldActive !== lastWorldActive) {
      lastWorldActive = worldActive;
      options.onWorldActiveChange?.(worldActive);
    }
    if (nextKind !== lastKind) {
      lastKind = nextKind;
      for (const l of [...listeners]) l(nextKind);
    }
  }

  const manager: ScreenManager = {
    root,
    current: () => lastKind,
    underlyingKidScreen,
    showWorld() {
      kidOverlayLayer.replaceChildren();
      learnLayer.replaceChildren();
      examLayer.replaceChildren();
      parentLayer.replaceChildren();
      hasKidOverlayNode = false;
      externalKidOverlay = false;
      hasLearnNode = false;
      hasExamNode = false;
      hasParentNode = false;
      sync();
    },
    showKidOverlay(node) {
      kidOverlayLayer.replaceChildren(...(node ? [node] : []));
      hasKidOverlayNode = node !== null;
      sync();
    },
    setExternalKidOverlay(open) {
      externalKidOverlay = open;
      sync();
    },
    showLearn(node) {
      learnLayer.replaceChildren(...(node ? [node] : []));
      hasLearnNode = node !== null;
      if (node !== null) {
        kidOverlayLayer.replaceChildren();
        hasKidOverlayNode = false;
        externalKidOverlay = false;
      }
      sync();
    },
    showExam(node) {
      examLayer.replaceChildren(...(node ? [node] : []));
      hasExamNode = node !== null;
      if (node !== null) {
        kidOverlayLayer.replaceChildren();
        hasKidOverlayNode = false;
        externalKidOverlay = false;
      }
      sync();
    },
    showParent(node) {
      parentLayer.replaceChildren(...(node ? [node] : []));
      hasParentNode = node !== null;
      sync();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(lastKind);
      return () => listeners.delete(listener);
    },
    destroy() {
      listeners.clear();
      root.remove();
    },
  };

  if (__E2E__) {
    registerHook('currentScreen', () => manager.current());
  }

  return manager;
}
