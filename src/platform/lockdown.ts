// Makes the page feel like an app: no zoom gestures, no callout menu, no scrolling in game areas (AC10).

/** Elements inside these may scroll and select. The parent area uses .parent. */
export const SCROLL_SELECTOR = '.parent, .scrollable, .lesboek-card';

function insideScrollArea(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(SCROLL_SELECTOR) !== null;
}

/** Returns a function that removes the listeners again. */
export function installLockdown(doc: Document = document): () => void {
  const stop = (e: Event) => {
    e.preventDefault();
  };
  const stopTouchMove = (e: Event) => {
    if (!insideScrollArea(e.target)) e.preventDefault();
  };
  const stopContextMenu = (e: Event) => {
    if (!(e.target instanceof Element && e.target.closest('input, textarea'))) e.preventDefault();
  };

  const opts = { passive: false } as const;
  const handlers: Array<[string, (e: Event) => void]> = [
    ['gesturestart', stop],
    ['gesturechange', stop],
    ['gestureend', stop],
    ['dblclick', stop],
    ['contextmenu', stopContextMenu],
    ['touchmove', stopTouchMove],
  ];
  for (const [name, fn] of handlers) doc.addEventListener(name, fn, opts);
  return () => {
    for (const [name, fn] of handlers) doc.removeEventListener(name, fn);
  };
}
