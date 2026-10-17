// Parent area shell (T48a). One 'parent' screen: the timers stop while it is open. A menu on the left,
// the chosen section on the right. The gate (T48b) decides who may call openParentArea.
import '../../styles/parent.css';
import type { AppEnv } from '../../app/app-env';
import type { Screens } from '../../app/screens';
import { el } from '../dom';
import { onTap } from '../tap';
import { createContentScreen } from './content-screen';
import { createExamsScreen } from './exams-screen';
import { createImportExportScreen } from './import-export-screen';
import { createModulesScreen } from './modules-screen';
import { createParentNotes } from './notes';
import { createResultsScreen } from './results-screen';
import { createSettingsScreen } from './settings-screen';

export interface ParentSectionContext {
  env: AppEnv;
  /** Goes back to the menu. */
  back(): void;
}
export interface ParentSection {
  node: HTMLElement;
  destroy(): void;
}

export interface SectionDef {
  id: string;
  title: string;
  create(ctx: ParentSectionContext): ParentSection;
}

export const PARENT_SECTIONS: readonly SectionDef[] = [
  { id: 'settings', title: 'Instellingen', create: createSettingsScreen },
  { id: 'content', title: 'Inhoud kiezen', create: createContentScreen },
  { id: 'exams', title: 'Examens', create: createExamsScreen },
  { id: 'results', title: 'Resultaten', create: createResultsScreen },
  { id: 'modules', title: 'Eigen modules', create: createModulesScreen },
  { id: 'import-export', title: 'Backup en import', create: createImportExportScreen },
];

export interface ParentArea {
  /** Closes the whole parent area. Safe to call twice. */
  close(): void;
  /** Id of the open section, or null at the menu. */
  section(): string | null;
}

/** Opens the parent area as a 'parent' screen. Returns a handle to close it. */
export function openParentArea(screens: Screens, env: AppEnv, onClose?: () => void): ParentArea {
  let closeScreen: (() => void) | null = null;
  let active: { id: string; section: ParentSection } | null = null;
  const cleanups: Array<() => void> = [];
  const content = el('div', { class: 'parent-content', attrs: { 'data-parent': 'content' } });
  const buttons = new Map<string, HTMLElement>();

  function showMenu() {
    active?.section.destroy();
    active = null;
    for (const b of buttons.values()) b.removeAttribute('aria-current');
    content.replaceChildren(
      createParentNotes(),
      el('p', { class: 'parent-hint', text: 'Kies links wat je wilt doen.' }),
    );
  }
  function show(def: SectionDef) {
    active?.section.destroy();
    const section = def.create({ env, back: showMenu });
    active = { id: def.id, section };
    for (const [id, b] of buttons) {
      if (id === def.id) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
    content.replaceChildren(section.node);
  }
  function close() {
    if (!closeScreen) return;
    const c = closeScreen;
    closeScreen = null;
    active?.section.destroy();
    active = null;
    for (const f of cleanups) f();
    cleanups.length = 0;
    c();
    onClose?.();
  }

  const menu = el('nav', { class: 'parent-menu', attrs: { 'aria-label': 'Ouderomgeving' } });
  for (const def of PARENT_SECTIONS) {
    const b = el('button', { class: 'parent-btn', text: def.title, attrs: { type: 'button', 'data-parent': `menu-${def.id}` } });
    cleanups.push(onTap(b, () => show(def)));
    buttons.set(def.id, b);
    menu.append(b);
  }
  const closeBtn = el('button', { class: 'parent-btn parent-btn-close', text: 'Sluiten', attrs: { type: 'button', 'data-parent': 'close' } });
  cleanups.push(onTap(closeBtn, close));
  menu.append(closeBtn);

  showMenu();
  const node = el('div', { class: 'parent parent-area', attrs: { role: 'dialog', 'aria-label': 'Ouderomgeving', 'data-screen-id': 'parent' } }, [
    el('header', { class: 'parent-header' }, [el('h1', { class: 'parent-title', text: 'Ouderomgeving' })]),
    el('div', { class: 'parent-body' }, [menu, content]),
  ]);
  closeScreen = screens.open('parent', node);
  return { close, section: () => active?.id ?? null };
}
