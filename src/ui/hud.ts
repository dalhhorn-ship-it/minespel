// HUD skeleton: jump, mode buttons, empty hotbar slots, countdown slot, pause button.
// Every button is an ignore zone, so a touch on it never looks or taps the world (AC104).
import '../styles/hud.css';
import { el } from './dom';
import { onTap } from './tap';
import type { PointerRouter } from '../input/pointer-router';

export type BuildMode = 'hakken' | 'bouwen';
export const HOTBAR_SLOTS = 8;

export interface HudOptions {
  router: PointerRouter;
  onJump: () => void;
  onMode: (mode: BuildMode) => void;
  onPause: () => void;
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
    setPauseHandler(handler) {
      onPause = handler;
    },
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
