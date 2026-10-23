// One ready signal for the app (R1b, decisions 78 and 83).
// `whenReady(action)` runs the action now when the app is ready. Before that it shows one shared waiting
// card with Terug, and runs the action by itself on ready if the card is still open. When storage fails,
// or the app is not ready after READY_SLOW_MS, the card says the game cannot load.

import { createWaitingCard, type WaitingCard } from '../ui/waiting-card';

export const READY_SLOW_MS = 10_000;

export interface ReadyGateOptions {
  /** Puts the card on screen. */
  show: (node: HTMLElement) => void;
  /** Takes the card off screen without going anywhere. */
  hide: () => void;
  /** Terug: back to the world. */
  back: () => void;
  slowMs?: number;
}

export interface ReadyGate {
  whenReady(action: () => void): void;
  /** Boot is done: flows exist. */
  markReady(): void;
  /** Boot could not open storage. */
  markFailed(): void;
  isReady(): boolean;
  /** Resolves on ready, rejects on failure. */
  readonly ready: Promise<void>;
}

export function createReadyGate(options: ReadyGateOptions): ReadyGate {
  let state: 'waiting' | 'ready' | 'failed' = 'waiting';
  let slow = false;
  let card: WaitingCard | null = null;
  let pending: (() => void) | null = null;
  let resolveReady: () => void = () => {};
  let rejectReady: (e: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {});

  const slowTimer = setTimeout(() => {
    if (state !== 'waiting') return;
    slow = true;
    card?.showFailure();
  }, options.slowMs ?? READY_SLOW_MS);

  function closeCard() {
    card?.destroy();
    card = null;
    pending = null;
  }

  return {
    ready,
    isReady: () => state === 'ready',
    whenReady(action) {
      if (state === 'ready') {
        action();
        return;
      }
      // One card, one pending action: a second tap while it is open never runs twice.
      pending = state === 'failed' ? null : action;
      if (card) return;
      const made = createWaitingCard({
        failed: state === 'failed' || slow,
        onBack: () => {
          if (card !== made) return;
          closeCard();
          options.back();
        },
      });
      card = made;
      options.show(made.element);
    },
    markReady() {
      if (state !== 'waiting') return;
      state = 'ready';
      clearTimeout(slowTimer);
      const run = pending;
      if (card) {
        closeCard();
        options.hide();
      }
      resolveReady();
      run?.();
    },
    markFailed() {
      if (state !== 'waiting') return;
      state = 'failed';
      clearTimeout(slowTimer);
      pending = null;
      card?.showFailure();
      rejectReady(new Error('boot failed'));
    },
  };
}
