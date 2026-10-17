// Frame time stats and the small on screen counter shown with `?fps=1`.

export interface FrameStats {
  frames: number;
  /** Average frames per second. */
  fps: number;
  /** 95th percentile frame time in ms (nearest rank, rounded up to whole ms). */
  p95: number;
  /** Slowest frame in ms. */
  worst: number;
  /** Share of frames at 34 ms or less (one 30 fps frame), 0 to 1. */
  shareWithin34: number;
  /** Frames slower than 200 ms. */
  over200: number;
}

/** Longest frame time (ms) with its own bucket. Slower frames share the last bucket. */
const MAX_BUCKET = 1000;
/** A frame counts as smooth at this many ms or less. 34 so a steady 30 fps (33.3 ms) passes. */
export const SMOOTH_MS = 34;
/** Time before measuring starts, so startup frames do not count. */
export const WARMUP_MS = 3000;

export interface FrameAccumulator {
  add(ms: number): void;
  stats(): FrameStats;
}

/** Running totals over every frame added, in constant memory. */
export function createFrameAccumulator(): FrameAccumulator {
  const buckets = new Array<number>(MAX_BUCKET + 1).fill(0);
  let n = 0;
  let total = 0;
  let worst = 0;
  let smooth = 0;
  let over200 = 0;
  return {
    add(ms) {
      n++;
      total += ms;
      if (ms > worst) worst = ms;
      if (ms <= SMOOTH_MS) smooth++;
      if (ms > 200) over200++;
      const i = Math.min(MAX_BUCKET, Math.max(0, Math.ceil(ms)));
      buckets[i] = (buckets[i] ?? 0) + 1;
    },
    stats() {
      if (n === 0) return { frames: 0, fps: 0, p95: 0, worst: 0, shareWithin34: 1, over200: 0 };
      const rank = Math.max(1, Math.ceil(0.95 * n));
      let seen = 0;
      let p95 = worst;
      for (let i = 0; i <= MAX_BUCKET; i++) {
        seen += buckets[i] ?? 0;
        if (seen >= rank) {
          p95 = i === MAX_BUCKET ? worst : i;
          break;
        }
      }
      return { frames: n, fps: total > 0 ? (n * 1000) / total : 0, p95, worst, shareWithin34: smooth / n, over200 };
    },
  };
}

/** Pure. Frame times in ms. Empty input gives zeros. */
export function computeFrameStats(frameMs: readonly number[]): FrameStats {
  const acc = createFrameAccumulator();
  for (const v of frameMs) acc.add(v);
  return acc.stats();
}

export function isFpsEnabled(search: string): boolean {
  return new URLSearchParams(search).get('fps') === '1';
}

/** Short enough to read out loud. */
export function formatStats(s: FrameStats): string {
  return `${s.fps.toFixed(0)} fps  smooth ${(s.shareWithin34 * 100).toFixed(0)}%  worst ${s.worst.toFixed(0)} ms`;
}

export interface FpsCounter {
  /**
   * Call once per drawn frame with a timestamp in ms (requestAnimationFrame time).
   * Pass the loop's dt (seconds) too: dt === 0 marks a first frame or a restart after a pause,
   * and that gap is not counted as a frame.
   */
  frame(nowMs: number, dtSeconds?: number): void;
  /** Stats over the whole session since the warm up ended. */
  stats(): FrameStats;
  dispose(): void;
}

const REFRESH_MS = 500;

/** Counter that records nothing and draws nothing. Used without `?fps=1`. */
export const noFpsCounter: FpsCounter = {
  frame() {},
  stats: () => computeFrameStats([]),
  dispose() {},
};

/** Makes the counter when `?fps=1` is in the address, otherwise a silent one. */
export function createFpsCounter(search: string, parent: HTMLElement): FpsCounter {
  if (!isFpsEnabled(search)) return noFpsCounter;
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;left:calc(env(safe-area-inset-left,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);' +
    'z-index:9999;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.6);color:#fff;' +
    'font:12px/1.2 ui-monospace,monospace;pointer-events:none;user-select:none;-webkit-user-select:none';
  parent.appendChild(el);

  const acc = createFrameAccumulator();
  let last: number | null = null;
  let startedAt: number | null = null;
  let lastShown = 0;
  el.textContent = 'measuring...';
  return {
    frame(now, dt) {
      startedAt ??= now;
      if (dt === 0) last = null; // restart: skip the gap
      if (last !== null && last - startedAt >= WARMUP_MS) acc.add(now - last);
      last = now;
      if (now - lastShown >= REFRESH_MS && acc.stats().frames > 0) {
        lastShown = now;
        el.textContent = formatStats(acc.stats());
      }
    },
    stats: () => acc.stats(),
    dispose() {
      el.remove();
    },
  };
}
