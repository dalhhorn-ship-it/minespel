// HUD skeleton: jump, sky ascend, eased camera angle arrows, mode buttons, hotbar slots,
// countdown slot, pause button, and parental controls button.
// Every button is an ignore zone, so a touch on it never looks or taps the world (AC104, AC127).
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
  /** Optional parental controls button handler ("Ouders"). */
  onParent?: () => void;
  /** Optional sky-ascend hold/tap handler ("Omhoog") to climb higher into the sky. */
  onAscend?: (active: boolean) => void;
  /** Optional eased camera angle arrow controls (turnX: -1 left / +1 right, tiltY: +1 up / -1 down). */
  onLookInput?: (turnX: number, tiltY: number) => void;
  onLookNudge?: (turnX: number, tiltY: number) => void;
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
  destroy(): void;
}

export function createHud(options: HudOptions): Hud {
  const cleanups: Array<() => void> = [];
  const zone = (node: HTMLElement) => {
    cleanups.push(options.router.addIgnoreZone(node));
    return node;
  };
  const button = (
    text: string,
    cls: string,
    handler: () => void,
    extraAttrs?: Record<string, string>,
  ) => {
    const b = el('button', {
      class: `hud-btn ${cls}`,
      text,
      attrs: { type: 'button', ...(extraAttrs ?? {}) },
    });
    cleanups.push(onTap(b, handler));
    return zone(b);
  };

  const jump = button('Spring', 'hud-jump', options.onJump);
  const pause = button('Pauze', 'hud-pause', options.onPause);
  const hakken = button('Hakken', 'hud-mode', () => select('hakken'));
  const bouwen = button('Bouwen', 'hud-mode', () => select('bouwen'));
  const countdownSlot = zone(el('div', { class: 'hud-countdown' }));
  const slots = Array.from({ length: HOTBAR_SLOTS }, () => el('div', { class: 'hud-slot' }));
  const allBlocksSlot = el('div', { class: 'hud-all-blocks' });
  const hotbar = zone(el('div', { class: 'hud-hotbar' }, [...slots, allBlocksSlot]));
  const modes = el('div', { class: 'hud-modes' }, [hakken, bouwen]);

  const topRightChildren: HTMLElement[] = [];
  if (options.onParent) {
    const parentBtn = button('\u{1F512} Ouders', 'hud-parent', options.onParent, {
      'aria-label': 'Ouders',
      'data-testid': 'parent-controls-btn',
    });
    topRightChildren.push(parentBtn);
  }
  topRightChildren.push(pause);

  const topBar = el('div', { class: 'hud-top' }, [
    countdownSlot,
    topRightChildren.length === 1
      ? pause
      : el('div', { class: 'hud-top-right' }, topRightChildren),
  ]);

  const rootChildren: HTMLElement[] = [topBar, modes, jump];

  if (options.onAscend) {
    const ascendBtn = zone(
      el('button', {
        class: 'hud-btn hud-ascend',
        text: 'Omhoog \u{2B06}',
        attrs: {
          type: 'button',
          'aria-label': 'Hoger in de lucht',
          'data-testid': 'hud-ascend',
        },
      }),
    );
    const down = () => options.onAscend?.(true);
    const up = () => options.onAscend?.(false);
    ascendBtn.addEventListener('pointerdown', down);
    ascendBtn.addEventListener('pointerup', up);
    ascendBtn.addEventListener('pointercancel', up);
    ascendBtn.addEventListener('pointerleave', up);
    cleanups.push(() => {
      ascendBtn.removeEventListener('pointerdown', down);
      ascendBtn.removeEventListener('pointerup', up);
      ascendBtn.removeEventListener('pointercancel', up);
      ascendBtn.removeEventListener('pointerleave', up);
    });
    rootChildren.push(ascendBtn);
  }

  if (options.onLookInput || options.onLookNudge) {
    let heldX = 0;
    let heldY = 0;
    const makeCamArrow = (
      symbol: string,
      cls: string,
      label: string,
      dir: string,
      dx: number,
      dy: number,
    ) => {
      const b = zone(
        el('button', {
          class: `hud-btn hud-cam-btn ${cls}`,
          text: symbol,
          attrs: {
            type: 'button',
            'aria-label': label,
            'data-cam-dir': dir,
          },
        }),
      );
      const onDown = () => {
        heldX = dx;
        heldY = dy;
        options.onLookInput?.(heldX, heldY);
        options.onLookNudge?.(dx, dy);
      };
      const onUp = () => {
        if (heldX === dx && heldY === dy) {
          heldX = 0;
          heldY = 0;
          options.onLookInput?.(0, 0);
        }
      };
      b.addEventListener('pointerdown', onDown);
      b.addEventListener('pointerup', onUp);
      b.addEventListener('pointercancel', onUp);
      b.addEventListener('pointerleave', onUp);
      cleanups.push(() => {
        b.removeEventListener('pointerdown', onDown);
        b.removeEventListener('pointerup', onUp);
        b.removeEventListener('pointercancel', onUp);
        b.removeEventListener('pointerleave', onUp);
      });
      return b;
    };

    const camPad = zone(
      el(
        'div',
        {
          class: 'hud-camera-pad',
          attrs: { 'aria-label': 'Kijkrichting', 'data-testid': 'camera-arrows' },
        },
        [
          makeCamArrow('\u{25B2}', 'hud-cam-up', 'Kijk omhoog', 'up', 0, 1),
          makeCamArrow('\u{25C0}', 'hud-cam-left', 'Kijk links', 'left', -1, 0),
          makeCamArrow('\u{25BC}', 'hud-cam-down', 'Kijk omlaag', 'down', 0, -1),
          makeCamArrow('\u{25B6}', 'hud-cam-right', 'Kijk rechts', 'right', 1, 0),
        ],
      ),
    );
    rootChildren.push(camPad);
  }

  rootChildren.push(hotbar);
  const root = el('div', { class: 'hud' }, rootChildren);

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
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
