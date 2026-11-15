// The Moed bar over Klodder (v18, AC216): a small DOM bar placed at his head while a knight pokes him. Cheap: one
// element, moved only when shown. No text, never red.
import '../styles/moed.css';

export interface MoedBar {
  /** Shows the bar at a screen point with a fill of 0 to 1, or hides it (null). */
  update(at: { x: number; y: number } | null, fraction: number): void;
  dispose(): void;
}

export function createMoedBar(parent: HTMLElement = document.body): MoedBar {
  const bar = document.createElement('div');
  bar.className = 'moed-bar';
  bar.hidden = true;
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('i');
  bar.append(fill);
  parent.append(bar);
  return {
    update(at, fraction) {
      if (!at) {
        bar.hidden = true;
        return;
      }
      bar.hidden = false;
      bar.style.left = `${Math.round(at.x)}px`;
      bar.style.top = `${Math.round(at.y)}px`;
      bar.dataset.fill = fraction.toFixed(2);
      fill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    },
    dispose() {
      bar.remove();
    },
  };
}
