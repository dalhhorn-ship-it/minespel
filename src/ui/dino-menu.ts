// The menu that opens when the kid taps a dino (AC16): Volg mij, Blijf hier, Naam geven, Knuffel.
// STUB from T42: the panel opens and closes and Volg mij / Blijf hier work. T45 adds the naming
// keyboard and the hearts, and the style sheet (src/styles/dino-menu.css). Inline styles for now.
import type { PointerRouter } from '../input/pointer-router';
import type { DinoMode } from '../dinos/dino-ai';
import { DINO_KINDS, type DinoKindId } from '../dinos/kinds';
import { el } from './dom';
import { onTap } from './tap';

export interface DinoMenuTarget {
  id: number;
  kind: DinoKindId;
  name: string;
  mode: DinoMode;
}

export interface DinoMenuOptions {
  container: HTMLElement;
  router: PointerRouter;
  onMode: (id: number, mode: DinoMode) => void;
  /** T45: opens the naming screen. */
  onName?: (id: number) => void;
  /** T45: hearts. */
  onHug?: (id: number) => void;
  /** Called after the menu closed, so the game can go on. */
  onClose?: () => void;
}

export interface DinoMenu {
  readonly root: HTMLElement;
  open(target: DinoMenuTarget): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

const PANEL_STYLE =
  'background:#fff;border:4px solid #1f2d3d;border-radius:16px;padding:16px;min-width:300px;' +
  'display:flex;flex-direction:column;gap:12px;font-family:var(--font-stack);color:#1f2d3d;';
const ROOT_STYLE =
  'position:fixed;inset:0;align-items:center;justify-content:center;' +
  'background:rgb(31 45 61 / 0.35);touch-action:none;user-select:none;-webkit-user-select:none;z-index:20;';
const BUTTON_STYLE =
  'min-height:56px;min-width:56px;font:inherit;font-size:22px;font-weight:700;border:3px solid #1f2d3d;' +
  'border-radius:16px;background:#def5e1;color:#1f2d3d;';

export function createDinoMenu(options: DinoMenuOptions): DinoMenu {
  const cleanups: Array<() => void> = [];
  let current: DinoMenuTarget | null = null;

  const button = (label: string, handler: () => void): HTMLButtonElement => {
    const b = el('button', { text: label, attrs: { type: 'button' } });
    b.style.cssText = BUTTON_STYLE;
    cleanups.push(onTap(b, handler));
    return b;
  };
  const title = el('div', { class: 'dino-menu-title' });
  title.style.cssText = 'font-size:28px;font-weight:800;text-align:center;';
  const follow = button('Volg mij', () => choose('follow'));
  const stay = button('Blijf hier', () => choose('stay'));
  const name = button('Naam geven', () => {
    if (current) options.onName?.(current.id);
  });
  const hug = button('Knuffel', () => {
    if (current) options.onHug?.(current.id);
  });
  const back = button('Terug naar de wereld', () => close());
  const panel = el('div', { class: 'dino-menu-panel' }, [title, follow, stay, name, hug, back]);
  panel.style.cssText = PANEL_STYLE;
  const root = el('div', { class: 'dino-menu', attrs: { role: 'dialog', 'aria-label': 'Dino' } }, [panel]);
  root.style.cssText = ROOT_STYLE;
  setShown(false);
  cleanups.push(options.router.addIgnoreZone(root));
  options.container.append(root);

  /** The hidden attribute alone loses against display:flex, so the display is set too. */
  function setShown(shown: boolean): void {
    root.hidden = !shown;
    root.style.display = shown ? 'flex' : 'none';
  }
  function choose(mode: DinoMode): void {
    if (!current) return;
    options.onMode(current.id, mode);
    current = { ...current, mode };
    refresh();
  }
  function refresh(): void {
    if (!current) return;
    title.textContent = current.name !== '' ? current.name : DINO_KINDS[current.kind].name;
    follow.style.background = current.mode === 'follow' ? '#a5d6a7' : '#def5e1';
    stay.style.background = current.mode === 'stay' ? '#a5d6a7' : '#def5e1';
  }
  function close(): void {
    if (root.hidden) return;
    setShown(false);
    current = null;
    options.onClose?.();
  }

  return {
    root,
    open(target) {
      current = target;
      refresh();
      setShown(true);
    },
    close,
    isOpen: () => !root.hidden,
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
