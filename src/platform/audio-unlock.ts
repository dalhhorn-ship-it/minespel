// iOS only lets sound start after a tap. Nothing may be resumed before the first tap (AC100).

export interface ResumableContext {
  resume(): Promise<void> | void;
}

export interface AudioUnlock {
  isUnlocked(): boolean;
  /** Registers an AudioContext. It is resumed on the first tap, or at once if a tap already happened. */
  watch(ctx: ResumableContext): void;
  /** Calls fn on the first tap (or now when already unlocked). */
  whenUnlocked(fn: () => void): void;
  dispose(): void;
}

const EVENTS = ['pointerup', 'touchend', 'click'] as const;

export function createAudioUnlock(target: EventTarget = document): AudioUnlock {
  let unlocked = false;
  const contexts: ResumableContext[] = [];
  const callbacks: Array<() => void> = [];

  const resume = (ctx: ResumableContext) => {
    try {
      void Promise.resolve(ctx.resume()).catch(() => undefined);
    } catch {
      /* sound must never break the game (AC99) */
    }
  };

  const onTapEvent = () => {
    if (unlocked) return;
    unlocked = true;
    dispose();
    for (const c of contexts) resume(c);
    for (const fn of callbacks.splice(0)) fn();
  };
  const dispose = () => {
    for (const name of EVENTS) target.removeEventListener(name, onTapEvent, true);
  };
  for (const name of EVENTS) target.addEventListener(name, onTapEvent, true);

  return {
    isUnlocked: () => unlocked,
    watch(ctx) {
      contexts.push(ctx);
      if (unlocked) resume(ctx);
    },
    whenUnlocked(fn) {
      if (unlocked) fn();
      else callbacks.push(fn);
    },
    dispose,
  };
}
