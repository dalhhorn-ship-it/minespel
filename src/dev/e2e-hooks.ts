// Test hooks for the e2e build only. Features register their own hooks:
//   if (__E2E__) { registerHook('name', fn); }
// In the production build __E2E__ is false, so this code is removed and no `window` hook exists.

type Hook = (...args: never[]) => unknown;

interface DinoHooks {
  [name: string]: Hook;
}

declare global {
  interface Window {
    __dino?: DinoHooks;
  }
}

export function registerHook(name: string, fn: Hook): void {
  if (!__E2E__) return;
  const w = window as Window;
  (w.__dino ??= {})[name] = fn;
}
