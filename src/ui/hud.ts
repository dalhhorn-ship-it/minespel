// HUD skeleton: jump, mode buttons, empty hotbar slots, countdown slot, pause button.
// Every button is an ignore zone, so a touch on it never looks or taps the world (AC104).
import '../styles/hud.css';
import { el } from './dom';
import { onTap } from './tap';
import type { PointerRouter } from '../input/pointer-router';
import { LOOK_TAP_MAX_MS } from '../game/player-controller';

export type BuildMode = 'hakken' | 'bouwen';
export const HOTBAR_SLOTS = 8;

export interface HudOptions {
  router: PointerRouter;
  onJump: () => void;
  onMode: (mode: BuildMode) => void;
  onPause: () => void;
  /** Omhoog and Omlaag are plain holds: true on press, false on every kind of release. */
  onAscend?: (on: boolean) => void;
  onDescend?: (on: boolean) => void;
  /** Camera arrows. A press under LOOK_TAP_MAX_MS is one `onLookTap`; a longer one sets `onLook` to the sum of held arrows. */
  onLookTap?: (turnX: number, tiltY: number) => void;
  onLook?: (turnX: number, tiltY: number) => void;
  /** Test seams. */
  win?: Window;
  doc?: Document;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}

export interface Hud {
  readonly root: HTMLElement;
  /** Empty containers for T-hotbar to fill. Index 0 to 7. */
  readonly slots: HTMLElement[];
  /** Holder for the "Alle blokken" button. */
  readonly allBlocksSlot: HTMLElement;
  /** Holder for the countdown text. */
  readonly countdownSlot: HTMLElement;
  setMode(mode: BuildMode): void;
  /** Replaces what the Pauze button does (the pause menu sets it). */
  setPauseHandler(handler: () => void): void;
  /** Lets go of every held fly and look control (pause, a screen on top, blur, rotation). Safe to call any time. */
  releaseAll(): void;
  destroy(): void;
}

export function createHud(options: HudOptions): Hud {
  const cleanups: Array<() => void> = [];
  let onPause = options.onPause;
  const zone = (node: HTMLElement) => {
    cleanups.push(options.router.addIgnoreZone(node));
    return node;
  };
  const button = (text: string, cls: string, handler: () => void, label?: string) => {
    const b = el('button', { class: `hud-btn ${cls}`, text, attrs: { type: 'button', ...(label ? { 'aria-label': label } : {}) } });
    cleanups.push(onTap(b, handler));
    return zone(b);
  };

  const jump = button('Spring', 'hud-jump', options.onJump);
  const win = options.win ?? window;
  const doc = options.doc ?? document;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));

  interface Held {
    node: HTMLElement;
    pointerId: number | null;
    /** Arrows only: the 200 ms timer, and whether it fired (so the press is a hold). */
    timer: unknown;
    fired: boolean;
    turnX: number;
    tiltY: number;
    kind: 'up' | 'down' | 'look';
  }
  const helds: Held[] = [];
  let lastLookSent = '0,0';
  const sendLook = () => {
    let x = 0;
    let y = 0;
    for (const h of helds) if (h.kind === 'look' && h.pointerId !== null && h.fired) { x += h.turnX; y += h.tiltY; }
    const key = `${x},${y}`;
    if (key === lastLookSent) return;
    lastLookSent = key;
    options.onLook?.(x, y);
  };
  /** Frees the given controls, then tells the game once per kind. `tap` lets an arrow that never reached 200 ms count as a tap. */
  const release = (list: Held[], tap: boolean) => {
    let lookChanged = false;
    for (const h of list) {
      if (h.pointerId === null) continue;
      const id = h.pointerId;
      h.pointerId = null;
      h.node.removeAttribute('data-held');
      try {
        if (h.node.hasPointerCapture?.(id)) h.node.releasePointerCapture(id);
      } catch {
        /* already gone */
      }
      if (h.kind === 'up') options.onAscend?.(false);
      else if (h.kind === 'down') options.onDescend?.(false);
      else {
        if (h.timer !== null) clearTimer(h.timer);
        h.timer = null;
        if (h.fired) lookChanged = true;
        else if (tap) options.onLookTap?.(h.turnX, h.tiltY);
        h.fired = false;
      }
    }
    if (lookChanged) sendLook();
  };
  const heldControl = (node: HTMLElement, kind: Held['kind'], turnX = 0, tiltY = 0) => {
    const h: Held = { node, pointerId: null, timer: null, fired: false, turnX, tiltY, kind };
    helds.push(h);
    const down = (e: PointerEvent) => {
      if (h.pointerId !== null) return; // a second finger on the same button is ignored
      h.pointerId = e.pointerId;
      node.setAttribute('data-held', 'true');
      try {
        node.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is only a safety net */
      }
      if (kind === 'up') options.onAscend?.(true);
      else if (kind === 'down') options.onDescend?.(true);
      else {
        h.fired = false;
        h.timer = setTimer(() => {
          h.timer = null;
          if (h.pointerId === null) return;
          h.fired = true;
          sendLook();
        }, LOOK_TAP_MAX_MS);
      }
    };
    const end = (tap: boolean) => (e: PointerEvent) => {
      if (e.pointerId === h.pointerId) release([h], tap);
    };
    const up = end(true);
    const other = end(false);
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', other);
    node.addEventListener('lostpointercapture', other);
    cleanups.push(() => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', other);
      node.removeEventListener('lostpointercapture', other);
    });
    return zone(node);
  };
  const holdButton = (text: string, cls: string, label: string, kind: 'up' | 'down') =>
    heldControl(el('button', { class: `hud-btn hud-fly ${cls}`, text, attrs: { type: 'button', 'aria-label': label } }), kind);
  const arrow = (glyph: string, cls: string, label: string, turnX: number, tiltY: number) =>
    heldControl(el('button', { class: `hud-btn hud-arrow ${cls}`, text: glyph, attrs: { type: 'button', 'aria-label': label } }), 'look', turnX, tiltY);
  const releaseAll = () => release(helds, false);

  const ascend = holdButton('▲ Omhoog', 'hud-fly-up', 'Omhoog vliegen', 'up');
  const descend = holdButton('▼ Omlaag', 'hud-fly-down', 'Omlaag vliegen', 'down');
  const flyColumn = el('div', { class: 'hud-fly-column' }, [ascend, descend]);
  const arrows = el('div', { class: 'hud-arrows' }, [
    arrow('▲', 'hud-arrow-up', 'Kijk omhoog', 0, 1),
    arrow('◀', 'hud-arrow-left', 'Kijk naar links', -1, 0),
    arrow('▶', 'hud-arrow-right', 'Kijk naar rechts', 1, 0),
    arrow('▼', 'hud-arrow-down', 'Kijk omlaag', 0, -1),
  ]);

  // Anything that could swallow the pointerup lets go of every held control.
  let landscape = win.innerWidth >= win.innerHeight;
  const onResize = () => {
    const now = win.innerWidth >= win.innerHeight;
    if (now !== landscape) {
      landscape = now;
      releaseAll();
    }
  };
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') releaseAll();
  };
  win.addEventListener('blur', releaseAll);
  win.addEventListener('orientationchange', releaseAll);
  win.addEventListener('resize', onResize);
  doc.addEventListener('visibilitychange', onVisibility);
  cleanups.push(() => {
    releaseAll();
    win.removeEventListener('blur', releaseAll);
    win.removeEventListener('orientationchange', releaseAll);
    win.removeEventListener('resize', onResize);
    doc.removeEventListener('visibilitychange', onVisibility);
  });

  const pause = button('Pauze', 'hud-pause', () => onPause());
  const hakken = button('Hakken', 'hud-mode', () => select('hakken'));
  const bouwen = button('Bouwen', 'hud-mode', () => select('bouwen'));
  const countdownSlot = zone(el('div', { class: 'hud-countdown' }));
  const slots = Array.from({ length: HOTBAR_SLOTS }, () => el('div', { class: 'hud-slot' }));
  const allBlocksSlot = el('div', { class: 'hud-all-blocks' });
  const hotbar = zone(el('div', { class: 'hud-hotbar' }, [...slots, allBlocksSlot]));
  const modes = el('div', { class: 'hud-modes' }, [hakken, bouwen]);

  const root = el('div', { class: 'hud' }, [
    el('div', { class: 'hud-top' }, [countdownSlot, pause]),
    modes,
    jump,
    flyColumn,
    arrows,
    hotbar,
  ]);

  function setMode(mode: BuildMode) {
    hakken.setAttribute('aria-pressed', String(mode === 'hakken'));
    bouwen.setAttribute('aria-pressed', String(mode === 'bouwen'));
  }
  function select(mode: BuildMode) {
    setMode(mode);
    options.onMode(mode);
  }
  setMode('hakken');

  return {
    root,
    slots,
    allBlocksSlot,
    countdownSlot,
    setMode,
    releaseAll,
    setPauseHandler(handler) {
      onPause = handler;
    },
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
