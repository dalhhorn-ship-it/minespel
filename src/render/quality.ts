// The knobs the speed spike (T32) may turn. Fallbacks in order: pixel ratio 1.5, closer fog, 48 x 48 world.

export interface Quality {
  /** Highest pixel ratio the canvas may use. */
  pixelRatioCap: number;
  /** Fog starts here, in blocks from the camera. */
  fogNear: number;
  /** Everything is fog colour from here on. Also the view distance. */
  fogFar: number;
  /**
   * Near mode (speed fallback step 1, v15): only chunks near the player have a mesh. Off by default, `?near=1` turns
   * it on. Turning it on for everybody is a change of the default only.
   */
  near: boolean;
  /** Kijkafstand Dichtbij (AC243): a chunk farther than this many chunks from the player's chunk is not drawn. Null: no limit. */
  drawRadius: number | null;
}

export const DEFAULT_QUALITY: Quality = { pixelRatioCap: 2, fogNear: 28, fogFar: 60, near: false, drawRadius: null };

/** The parent setting "Kijkafstand" (AC243). Missing or unknown reads as Ver. */
export type ViewDistance = 'ver' | 'dichtbij';

export const DICHTBIJ_FOG_FAR = 40;
export const DICHTBIJ_CHUNKS = 3;

export function viewDistanceOf(settings: { viewDistance?: unknown } | null | undefined): ViewDistance {
  return settings?.viewDistance === 'dichtbij' ? 'dichtbij' : 'ver';
}

/** The quality for a Kijkafstand: Ver leaves `base` alone, Dichtbij ends the fog at 40 blocks and draws 3 chunks around the player. */
export function qualityForView(view: ViewDistance, base: Quality = DEFAULT_QUALITY): Quality {
  if (view === 'ver') return base;
  return {
    ...base,
    fogNear: Math.min(base.fogNear, Math.round(DICHTBIJ_FOG_FAR / 2)),
    fogFar: Math.min(base.fogFar, DICHTBIJ_FOG_FAR),
    drawRadius: DICHTBIJ_CHUNKS,
  };
}

/** Pixel ratio for a device: never above the cap, never below 1. */
export function pixelRatioFor(devicePixelRatio: number, quality: Quality): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.max(1, Math.min(dpr, quality.pixelRatioCap));
}

function num(params: URLSearchParams, key: string, min: number, max: number): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}

/**
 * Lets the spike try fallbacks without a rebuild: `?pr=1.5&fog=40` and `?near=1` (fog is the far distance, near is half of it).
 * Anything unreadable is ignored.
 */
export function qualityFromSearch(search: string, base: Quality = DEFAULT_QUALITY): Quality {
  const params = new URLSearchParams(search);
  const pr = num(params, 'pr', 1, 3);
  const fog = num(params, 'fog', 8, 200);
  return {
    pixelRatioCap: pr ?? base.pixelRatioCap,
    fogNear: fog === null ? base.fogNear : Math.round(fog / 2),
    fogFar: fog ?? base.fogFar,
    near: params.has('near') ? params.get('near') === '1' : base.near,
    drawRadius: base.drawRadius,
  };
}
