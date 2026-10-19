// Parent shell (T48a): left navigation list, scrollable main pane, and section views.

import '../../styles/parent.css';
import type { Catalog } from '../../content/catalog';
import type { BreakRecord } from '../../storage/log-store';
import type { ProgressRecord } from '../../storage/progress-store';
import type { SettingsRecord, StatsRecord, SwitchesRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';
import { createContentScreen } from './content-screen';
import { createExamsScreen, type ExamPlanInfo } from './exams-screen';
import { createSettingsScreen } from './settings-screen';

export type ParentSectionId =
  | 'instellingen'
  | 'inhoud'
  | 'resultaten'
  | 'examens'
  | 'modules'
  | 'import-export';

const SECTIONS: readonly { id: ParentSectionId; label: string }[] = [
  { id: 'instellingen', label: 'Instellingen' },
  { id: 'inhoud', label: 'Inhoud kiezen' },
  { id: 'resultaten', label: 'Resultaten' },
  { id: 'examens', label: 'Examens' },
  { id: 'modules', label: 'Eigen modules' },
  { id: 'import-export', label: 'Import & Export' },
];

export interface ParentShellOptions {
  catalog: Catalog;
  settings: SettingsRecord;
  switches: SwitchesRecord;
  progress: readonly ProgressRecord[];
  breaks?: readonly BreakRecord[];
  stats?: StatsRecord;
  isBreakActive: boolean;
  isExamActive?: boolean;
  planFor?: (moduleId: string, examId: string) => ExamPlanInfo;
  onStartExam?: (moduleId: string, examId: string) => Promise<void> | void;
  initialSection?: ParentSectionId;
  onUpdateSettings: (next: SettingsRecord) => Promise<void> | void;
  onUpdateSwitches: (next: SwitchesRecord) => Promise<void> | void;
  onStartBreakNow: () => Promise<void> | void;
  onEndBreakNow: () => Promise<void> | void;
  onChangePin: () => void;
  onResetWorld?: () => Promise<void> | void;
  onClose: () => void;
  now?: () => number;
}

export interface ParentShell {
  readonly element: HTMLElement;
  currentSection(): ParentSectionId;
  selectSection(id: ParentSectionId): void;
  destroy(): void;
}

export function createParentShell(options: ParentShellOptions): ParentShell {
  let activeSection: ParentSectionId = options.initialSection ?? 'instellingen';
  let currentSettings: SettingsRecord = { ...options.settings };
  let currentSwitches: SwitchesRecord = options.switches;
  const navCleanups: Array<() => void> = [];
  let sectionCleanup: (() => void) | null = null;

  const sidebar = el('nav', { class: 'parent-sidebar', attrs: { 'aria-label': 'Oudermenu' } });
  const main = el('main', { class: 'parent-main' });
  const shell = el('div', { class: 'parent-shell' }, [sidebar, main]);
  const root = el('div', { class: 'parent', attrs: { 'data-testid': 'parent-shell' } }, [shell]);

  function clearSection() {
    if (sectionCleanup) {
      sectionCleanup();
      sectionCleanup = null;
    }
    main.replaceChildren();
  }

  function renderNav() {
    for (const c of navCleanups) c();
    navCleanups.length = 0;
    sidebar.replaceChildren();

    sidebar.append(el('h1', { class: 'parent-sidebar-title', text: 'Ouders' }));

    for (const sec of SECTIONS) {
      const btn = el('button', {
        class: 'parent-nav-btn',
        text: sec.label,
        attrs: {
          type: 'button',
          'data-section': sec.id,
          ...(sec.id === activeSection ? { 'aria-current': 'page' } : {}),
        },
      });
      navCleanups.push(
        onTap(
          btn,
          () => {
            if (activeSection !== sec.id) {
              activeSection = sec.id;
              renderNav();
              renderSection();
            }
          },
          { now: options.now },
        ),
      );
      sidebar.append(btn);
    }

    const closeBtn = el('button', {
      class: 'parent-close-btn',
      text: 'Sluiten',
      attrs: { type: 'button', 'data-testid': 'parent-close-btn' },
    });
    navCleanups.push(onTap(closeBtn, options.onClose, { now: options.now }));
    sidebar.append(closeBtn);
  }

  function renderSection() {
    clearSection();

    if (activeSection === 'instellingen') {
      const view = createSettingsScreen({
        settings: currentSettings,
        isBreakActive: options.isBreakActive,
        isExamActive: options.isExamActive,
        onUpdateSettings: async (next) => {
          currentSettings = next;
          await options.onUpdateSettings(next);
        },
        onStartBreakNow: options.onStartBreakNow,
        onEndBreakNow: options.onEndBreakNow,
        onChangePin: options.onChangePin,
        onResetWorld: options.onResetWorld,
        now: options.now,
      });
      main.append(view.element);
      sectionCleanup = () => view.destroy();
      return;
    }

    if (activeSection === 'inhoud') {
      const view = createContentScreen({
        catalog: options.catalog,
        switches: currentSwitches,
        progress: options.progress,
        onUpdateSwitches: async (next) => {
          currentSwitches = next;
          await options.onUpdateSwitches(next);
        },
        now: options.now,
      });
      main.append(view.element);
      sectionCleanup = () => view.destroy();
      return;
    }

    if (activeSection === 'examens') {
      const { planFor, onStartExam } = options;
      const view = createExamsScreen({
        catalog: options.catalog,
        isBreakActive: options.isBreakActive,
        planFor: planFor ?? ((m, e) => {
          const n = options.catalog.getExam(m, e)?.questionCount ?? 0;
          return { wanted: n, real: n };
        }),
        onStartExam: onStartExam ?? (() => undefined),
        now: options.now,
      });
      main.append(view.element);
      sectionCleanup = () => view.destroy();
      return;
    }

    if (activeSection === 'resultaten') {
      const breaks = options.breaks ?? [];
      const card = el('div', { class: 'parent-card' });
      if (breaks.length === 0) {
        card.append(el('p', { text: 'Nog geen leerpauzes afgerond.' }));
      } else {
        for (const b of [...breaks].reverse().slice(0, 20)) {
          const badge = b.snelGeklikt ? ' (snel geklikt)' : '';
          card.append(
            el('div', { class: 'parent-row' }, [
              el('span', { text: `${b.day} — ${b.moduleId}` }),
              el('span', {
                text: `${b.score}/${b.n} goed, +${b.points} pt${badge}`,
              }),
            ]),
          );
        }
      }
      main.append(el('h2', { class: 'parent-section-title', text: 'Resultaten' }), card);
      return;
    }

    const label = SECTIONS.find((s) => s.id === activeSection)?.label ?? activeSection;
    main.append(
      el('h2', { class: 'parent-section-title', text: label }),
      el('div', { class: 'parent-card' }, [
        el('p', { text: `Onderdeel "${label}".` }),
      ]),
    );
  }

  renderNav();
  renderSection();

  return {
    element: root,
    currentSection: () => activeSection,
    selectSection(id) {
      activeSection = id;
      renderNav();
      renderSection();
    },
    destroy() {
      clearSection();
      for (const c of navCleanups) c();
      root.remove();
    },
  };
}
