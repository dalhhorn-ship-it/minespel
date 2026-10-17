// The game loop: one callback per drawn frame, with the step capped so a slow frame never jumps the player.

/** Longest step the game ever takes, in seconds (100 ms). */
export const MAX_STEP = 0.1;

export interface LoopOptions {
  /** Called every frame with the step in seconds (0 to MAX_STEP) and the frame time in ms. */
  frame: (dt: number, nowMs: number) => void;
  /** Injectable for tests. Defaults to requestAnimationFrame. */
  request?: (cb: (nowMs: number) => void) => number;
  cancel?: (handle: number) => void;
}

export interface Loop {
  start(): void;
  /** Stops asking for frames. The next start begins with a step of zero. */
  stop(): void;
  readonly running: boolean;
}

/** Turns the time between two frames into a safe step. Pure. */
export function frameStep(previousMs: number | null, nowMs: number): number {
  if (previousMs === null) return 0;
  const dt = (nowMs - previousMs) / 1000;
  if (!(dt > 0)) return 0;
  return Math.min(dt, MAX_STEP);
}

export function createLoop(options: LoopOptions): Loop {
  const request = options.request ?? ((cb) => requestAnimationFrame(cb));
  const cancel = options.cancel ?? ((h) => cancelAnimationFrame(h));
  let handle: number | null = null;
  let last: number | null = null;

  const tick = (now: number) => {
    handle = null;
    const dt = frameStep(last, now);
    last = now;
    try {
      options.frame(dt, now);
    } finally {
      // Keep going even if one frame threw, unless stop() was called inside it.
      if (running) handle = request(tick);
    }
  };
  let running = false;

  return {
    start() {
      if (running) return;
      running = true;
      last = null;
      handle = request(tick);
    },
    stop() {
      running = false;
      if (handle !== null) cancel(handle);
      handle = null;
      last = null;
    },
    get running() {
      return running;
    },
  };
}
