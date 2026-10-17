// iOS only lets sound start after a tap. Nothing may be resumed before the first tap (AC100).

export interface ResumableContext {
  /** Optional. When known, later taps resume the context if it is not running. */
  readonly state?: string;
  resume(): Promise<void> | void;
}

export interface AudioUnlock {
  isUnlocked(): boolean;
  /**
   * Registers an AudioContext. It is resumed on the first tap, or at once if a tap already happened.
   * After that, every tap resumes it again while it is not running (iOS suspends it in the background).
   */
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

  // Listeners stay on for good: every tap is a chance to wake a suspended context.
  const onTapEvent = () => {
    if (unlocked) {
      for (const c of contexts) {
        if (c.state !== undefined && c.state !== 'running' && c.state !== 'closed') resume(c);
      }
      return;
    }
    unlocked = true;
    for (const c of contexts) resume(c);
    // Contexts made by these callbacks are resumed by watch(), inside this same tap.
    for (const fn of callbacks.splice(0)) {
      try {
        fn();
      } catch {
        /* sound must never break the game (AC99) */
      }
    }
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
