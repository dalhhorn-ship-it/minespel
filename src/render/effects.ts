// Little visual effects that do not need the renderer: pop bits when a block is mined or placed.
// They are small coloured squares in the page, moved with CSS transforms and removed after a moment.
import {
  AARDE, BAKSTEEN, BLADEREN, BOOMSTAM, GLAS, GRAS, KEISTEEN, PLANKEN, STEEN, WOL_BLAUW, WOL_GEEL,
  WOL_GROEN, WOL_PAARS, WOL_ROOD, WOL_WIT, ZAND,
} from '../world/blocks';

/** A flat colour for each block, for pop bits and the hotbar swatches. */
export const BLOCK_COLORS: Readonly<Record<number, string>> = {
  [GRAS]: '#4caf50',
  [AARDE]: '#8d5a34',
  [STEEN]: '#8e969c',
  [KEISTEEN]: '#6b7075',
  [ZAND]: '#f0dc9a',
  [BOOMSTAM]: '#6d4a2a',
  [PLANKEN]: '#c9955a',
  [BLADEREN]: '#2e8b3a',
  [GLAS]: '#bfe9f7',
  [BAKSTEEN]: '#b5503c',
  [WOL_WIT]: '#f4f4f4',
  [WOL_ROOD]: '#e53935',
  [WOL_GEEL]: '#fdd835',
  [WOL_BLAUW]: '#1e88e5',
  [WOL_GROEN]: '#43a047',
  [WOL_PAARS]: '#8e24aa',
};

export function blockColor(id: number): string {
  return BLOCK_COLORS[id] ?? '#cccccc';
}

export const POP_BITS = 7;
export const POP_MS = 450;
/** Never more bits on screen than this, so fast tapping stays light. */
export const MAX_BITS = 60;

export interface Effects {
  /** Burst of little squares at a screen point, in the block's colour. */
  pop(x: number, y: number, block: number): void;
  dispose(): void;
}

export function createEffects(container: HTMLElement, doc: Document = document): Effects {
  const layer = doc.createElement('div');
  layer.className = 'pop-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;overflow:visible';
  container.append(layer);
  const timers = new Set<ReturnType<typeof setTimeout>>();

  return {
    pop(x, y, block) {
      const color = blockColor(block);
      for (let i = 0; i < POP_BITS; i++) {
        if (layer.childElementCount >= MAX_BITS) break;
        const bit = doc.createElement('div');
        bit.className = 'pop-bit';
        bit.style.cssText =
          `position:absolute;left:${x - 5}px;top:${y - 5}px;width:10px;height:10px;background:${color};` +
          'border:1px solid rgb(31 45 61 / 0.6);pointer-events:none;will-change:transform,opacity;' +
          `transition:transform ${POP_MS}ms ease-out,opacity ${POP_MS}ms ease-in;`;
        layer.append(bit);
        const angle = (i / POP_BITS) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 30 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 20;
        // Next frame, so the browser sees the start state first.
        const start = setTimeout(() => {
          timers.delete(start);
          bit.style.transform = `translate(${dx}px,${dy}px) rotate(${Math.round(angle * 90)}deg)`;
          bit.style.opacity = '0';
        }, 16);
        const end = setTimeout(() => {
          timers.delete(end);
          bit.remove();
        }, POP_MS + 60);
        timers.add(start);
        timers.add(end);
      }
    },
    dispose() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      layer.remove();
    },
  };
}
