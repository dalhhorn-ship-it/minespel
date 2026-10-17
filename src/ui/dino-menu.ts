// The menu that opens when the kid taps a dino (AC16): Volg mij, Blijf hier, Naam geven, Knuffel.
// Naam geven swaps the panel for the naming screen (src/ui/name-screen.ts). Styles: src/styles/dino-menu.css.
import '../styles/dino-menu.css';
import type { PointerRouter } from '../input/pointer-router';
import type { DinoMode } from '../dinos/dino-ai';
import { DINO_KINDS, type DinoKindId } from '../dinos/kinds';
import { el } from './dom';
import { createNameScreen, type NameScreen } from './name-screen';
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
  /** The kid finished a name. The owner stores it (the store trims it to 12 characters). */
  onRename?: (id: number, name: string) => void;
  /** Knuffel: the owner shows hearts at the dino and plays a happy sound. The menu closes after it. */
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

export function createDinoMenu(options: DinoMenuOptions): DinoMenu {
  const cleanups: Array<() => void> = [];
  let current: DinoMenuTarget | null = null;
  let naming: NameScreen | null = null;

  const button = (label: string, handler: () => void): HTMLButtonElement => {
    const b = el('button', { class: 'dino-btn', text: label, attrs: { type: 'button' } });
    cleanups.push(onTap(b, handler));
    return b;
  };
  const title = el('div', { class: 'dino-menu-title' });
  const follow = button('Volg mij', () => choose('follow'));
  const stay = button('Blijf hier', () => choose('stay'));
  const name = button('Naam geven', () => openNaming());
  const hug = button('Knuffel', () => {
    if (!current) return;
    options.onHug?.(current.id);
    close();
  });
  const back = button('Terug naar de wereld', () => close());
  const panel = el('div', { class: 'dino-menu-panel' }, [title, follow, stay, name, hug, back]);
  const root = el('div', { class: 'dino-menu', attrs: { role: 'dialog', 'aria-label': 'Dino' } }, [panel]);
  setShown(false);
  cleanups.push(options.router.addIgnoreZone(root));
  options.container.append(root);

  /** The hidden attribute alone loses against display:flex in old browsers, so the display is set too. */
  function setShown(shown: boolean): void {
    root.hidden = !shown;
    root.style.display = shown ? '' : 'none';
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
    follow.setAttribute('aria-pressed', String(current.mode === 'follow'));
    stay.setAttribute('aria-pressed', String(current.mode === 'stay'));
  }
  function closeNaming(): void {
    if (!naming) return;
    naming.destroy();
    naming = null;
    panel.hidden = false;
  }
  function openNaming(): void {
    if (!current || naming) return;
    const id = current.id;
    naming = createNameScreen({
      initial: current.name,
      onDone(value) {
        options.onRename?.(id, value);
        if (current) current = { ...current, name: value };
        closeNaming();
        refresh();
      },
      onCancel: closeNaming,
    });
    panel.hidden = true;
    root.append(naming.root);
  }
  function close(): void {
    if (root.hidden) return;
    closeNaming();
    setShown(false);
    current = null;
    options.onClose?.();
  }

  return {
    root,
    open(target) {
      closeNaming();
      current = target;
      refresh();
      setShown(true);
    },
    close,
    isOpen: () => !root.hidden,
    destroy() {
      closeNaming();
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
