// Frame time stats and the small on screen counter shown with `?fps=1`.

export interface FrameStats {
  frames: number;
  /** Average frames per second. */
  fps: number;
  /** 95th percentile frame time in ms (nearest rank). */
  p95: number;
  /** Slowest frame in ms. */
  worst: number;
  /** Share of frames at 33 ms or less, 0 to 1. */
  shareWithin33: number;
  /** Frames slower than 200 ms. */
  over200: number;
}

/** Pure. Frame times in ms. Empty input gives zeros. */
export function computeFrameStats(frameMs: readonly number[]): FrameStats {
  const n = frameMs.length;
  if (n === 0) return { frames: 0, fps: 0, p95: 0, worst: 0, shareWithin33: 1, over200: 0 };
  const sorted = [...frameMs].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  const rank = Math.max(1, Math.ceil(0.95 * n));
  return {
    frames: n,
    fps: total > 0 ? (n * 1000) / total : 0,
    p95: sorted[rank - 1] ?? 0,
    worst: sorted[n - 1] ?? 0,
    shareWithin33: sorted.filter((v) => v <= 33).length / n,
    over200: sorted.filter((v) => v > 200).length,
  };
}

export function isFpsEnabled(search: string): boolean {
  return new URLSearchParams(search).get('fps') === '1';
}

export function formatStats(s: FrameStats): string {
  return `${s.fps.toFixed(0)} fps  p95 ${s.p95.toFixed(0)} ms  worst ${s.worst.toFixed(0)} ms  ok ${(s.shareWithin33 * 100).toFixed(0)}%  >200: ${s.over200}`;
}

export interface FpsCounter {
  /** Call once per drawn frame with a timestamp in ms (requestAnimationFrame time). */
  frame(nowMs: number): void;
  /** Stats over the last window of frames. */
  stats(): FrameStats;
  dispose(): void;
}

const WINDOW = 600;
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

  const times: number[] = [];
  let last: number | null = null;
  let lastShown = 0;
  const stats = (): FrameStats => computeFrameStats(times);
  return {
    frame(now) {
      if (last !== null) {
        times.push(now - last);
        if (times.length > WINDOW) times.shift();
      }
      last = now;
      if (now - lastShown >= REFRESH_MS && times.length > 0) {
        lastShown = now;
        el.textContent = formatStats(stats());
      }
    },
    stats,
    dispose() {
      el.remove();
    },
  };
}
