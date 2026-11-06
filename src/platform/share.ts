// Share a file through the share sheet, or open it in a new view (T19, AC133).
// iPad Safari only shares inside a tap: call shareFile straight from the tap handler, with a file that is already made.

export type ShareResult = 'shared' | 'opened' | 'cancelled' | 'failed';

export interface ShareEnv {
  nav: { share?: (data: { files: File[] }) => Promise<void>; canShare?: (data: { files: File[] }) => boolean };
  open: (url: string) => unknown;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  setTimeout: (fn: () => void, ms: number) => unknown;
}

const REVOKE_AFTER_MS = 60_000;

function defaultEnv(): ShareEnv {
  return {
    nav: navigator as ShareEnv['nav'],
    open: (url) => window.open(url, '_blank'),
    createObjectURL: (b) => URL.createObjectURL(b),
    revokeObjectURL: (u) => URL.revokeObjectURL(u),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  };
}

export async function shareFile(file: File, env: ShareEnv = defaultEnv()): Promise<ShareResult> {
  try {
    const data = { files: [file] };
    if (typeof env.nav.share === 'function' && env.nav.canShare?.(data) === true) {
      try {
        await env.nav.share(data);
        return 'shared';
      } catch (err) {
        if ((err as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
        // Any other error: try the new view below.
      }
    }
    const url = env.createObjectURL(file);
    const win = env.open(url);
    if (!win) {
      env.revokeObjectURL(url);
      return 'failed';
    }
    env.setTimeout(() => env.revokeObjectURL(url), REVOKE_AFTER_MS);
    return 'opened';
  } catch {
    return 'failed';
  }
}
