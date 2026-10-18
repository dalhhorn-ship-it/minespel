// Dino interaction menu when tapping a dino in the world (T45, AC16, AC18, AC23).
// Actions: Volg mij, Blijf hier, Naam geven (opens NameScreen), Knuffel (hearts + chirp), Sluiten.

import '../styles/dino-menu.css';
import type { DinoMode } from '../dinos/dino-ai';
import type { WorldDino } from '../dinos/dino-store';
import { DINO_KINDS } from '../dinos/kinds';
import { el } from './dom';
import { createNameScreen, type NameScreen } from './name-screen';
import { onTap } from './tap';

export interface DinoMenuOptions {
  dino: WorldDino;
  onModeChange: (mode: DinoMode) => void;
  onNameSave: (name: string) => void;
  onKnuffel: () => void;
  onClose: () => void;
  now?: () => number;
}

export interface DinoMenu {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createDinoMenu(options: DinoMenuOptions): DinoMenu {
  const cleanups: Array<() => void> = [];
  let activeNameScreen: NameScreen | null = null;
  let currentMode: DinoMode = options.dino.mode;
  let currentName: string = options.dino.name;
  let feedbackText: string | null = null;

  const speciesName = DINO_KINDS[options.dino.kind].name;
  const host = el('div', { class: 'dino-menu-host' });

  function clearMenuCleanups() {
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
    if (activeNameScreen) {
      activeNameScreen.destroy();
      activeNameScreen = null;
    }
  }

  function openNameEditor() {
    clearMenuCleanups();
    host.replaceChildren();
    activeNameScreen = createNameScreen({
      initialName: currentName,
      speciesName,
      now: options.now,
      onSave: (name) => {
        currentName = name;
        options.onNameSave(name);
        feedbackText = `Je dino heet nu ${name}!`;
        renderMainMenu();
      },
      onCancel: () => {
        renderMainMenu();
      },
    });
    host.append(activeNameScreen.element);
  }

  function renderMainMenu() {
    clearMenuCleanups();
    host.replaceChildren();

    const titleText = currentName ? `${currentName} (${speciesName})` : speciesName;
    const headerChildren: HTMLElement[] = [
      el('h2', { class: 'dino-menu-title', text: titleText }),
    ];
    if (options.dino.golden) {
      headerChildren.push(
        el('div', { class: 'dino-menu-badge', text: '\u{2B50} Gouden dino' }),
      );
    }
    const header = el('div', { class: 'dino-menu-header' }, headerChildren);

    const status = el('p', {
      class: 'dino-menu-status',
      text:
        feedbackText ??
        (currentMode === 'follow'
          ? 'Volgt jou overal door de wereld!'
          : 'Blijft rustig op deze plek wachten.'),
    });

    const followBtn = el('button', {
      class: 'dino-menu-btn',
      text: 'Volg mij',
      attrs: {
        type: 'button',
        'aria-pressed': String(currentMode === 'follow'),
      },
    });
    const stayBtn = el('button', {
      class: 'dino-menu-btn',
      text: 'Blijf hier',
      attrs: {
        type: 'button',
        'aria-pressed': String(currentMode === 'stay'),
      },
    });
    const nameBtn = el('button', {
      class: 'dino-menu-btn',
      text: 'Naam geven',
      attrs: { type: 'button' },
    });
    const knuffelBtn = el('button', {
      class: 'dino-menu-btn dino-menu-btn-knuffel',
      text: '\u{2764}\u{FE0F} Knuffel',
      attrs: { type: 'button' },
    });
    const closeBtn = el('button', {
      class: 'dino-menu-btn dino-menu-btn-close',
      text: 'Sluiten',
      attrs: { type: 'button' },
    });

    cleanups.push(
      onTap(
        followBtn,
        () => {
          currentMode = 'follow';
          feedbackText = null;
          options.onModeChange('follow');
          renderMainMenu();
        },
        { now: options.now },
      ),
      onTap(
        stayBtn,
        () => {
          currentMode = 'stay';
          feedbackText = null;
          options.onModeChange('stay');
          renderMainMenu();
        },
        { now: options.now },
      ),
      onTap(nameBtn, () => openNameEditor(), { now: options.now }),
      onTap(
        knuffelBtn,
        () => {
          feedbackText = '\u{2764}\u{FE0F} Wat een fijne knuffel!';
          options.onKnuffel();
          renderMainMenu();
        },
        { now: options.now },
      ),
      onTap(closeBtn, () => options.onClose(), { now: options.now }),
    );

    const grid = el('div', { class: 'dino-menu-grid' }, [
      followBtn,
      stayBtn,
      nameBtn,
      knuffelBtn,
    ]);

    const card = el(
      'div',
      {
        class: 'dino-menu-card',
        attrs: { role: 'dialog', 'aria-label': 'Dino menu' },
      },
      [header, status, grid, closeBtn],
    );
    const backdrop = el('div', { class: 'dino-menu-backdrop' }, [card]);
    host.append(backdrop);
  }

  renderMainMenu();

  return {
    element: host,
    destroy() {
      clearMenuCleanups();
      host.remove();
    },
  };
}
