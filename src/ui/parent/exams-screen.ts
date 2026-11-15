// Parent Examens section (T51c, AC72 view part, AC115, decision 125): pick the lesson first, then an
// exam of that lesson, see a warning when the module has too few items, and start only after a
// confirm. Never imports the exam flow.

import { subjectLabel, type Catalog } from '../../content/catalog';
import type { ModuleBundle } from '../../content/format';
import { el } from '../dom';
import { onTap } from '../tap';

/** Structural plan, matches what `planExam` in exam-session.ts reports. */
export interface ExamPlanInfo {
  wanted: number;
  real: number;
}

export interface ExamsScreenOptions {
  catalog: Catalog;
  isBreakActive: boolean;
  planFor: (moduleId: string, examId: string) => ExamPlanInfo;
  onStartExam: (moduleId: string, examId: string) => Promise<void> | void;
  now?: () => number;
}

export interface ExamsScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

interface Pending {
  moduleId: string;
  examId: string;
  plan: ExamPlanInfo;
}

export function createExamsScreen(options: ExamsScreenOptions): ExamsScreen {
  let cleanups: Array<() => void> = [];
  let pending: Pending | null = null;
  let message: string | null = null;
  let selected: string | null = null;
  const root = el('div', { class: 'parent-exams', attrs: { 'data-testid': 'parent-exams' } });

  function clearCleanups() {
    for (const c of cleanups) c();
    cleanups = [];
  }

  function tryStart(moduleId: string, examId: string) {
    if (options.isBreakActive) {
      message = 'Beëindig eerst de pauze';
      pending = null;
      render();
      return;
    }
    const plan = options.planFor(moduleId, examId);
    if (plan.real < plan.wanted) {
      message = null;
      pending = { moduleId, examId, plan };
      render();
      return;
    }
    message = null;
    void options.onStartExam(moduleId, examId);
  }

  function render() {
    clearCleanups();
    root.replaceChildren(el('h2', { class: 'parent-section-title', text: 'Examens' }));

    if (message) {
      root.append(
        el('div', {
          class: 'parent-card parent-notice',
          text: message,
          attrs: { role: 'alert', 'data-testid': 'exam-message' },
        }),
      );
    }

    if (pending) {
      const { moduleId, examId, plan } = pending;
      const pendingMod = options.catalog.getModule(moduleId);
      const pendingExam = pendingMod?.module.exams.find((e) => e.id === examId);
      const pendingName = `${pendingMod?.module.title ?? moduleId}, ${pendingExam?.title ?? examId}`;
      const yes = el('button', {
        class: 'parent-btn parent-btn-primary',
        text: 'Toch starten',
        attrs: { type: 'button', 'data-testid': 'exam-confirm' },
      });
      const no = el('button', {
        class: 'parent-btn',
        text: 'Annuleren',
        attrs: { type: 'button', 'data-testid': 'exam-cancel' },
      });
      cleanups.push(
        onTap(
          yes,
          () => {
            pending = null;
            void options.onStartExam(moduleId, examId);
          },
          { now: options.now },
        ),
        onTap(
          no,
          () => {
            pending = null;
            render();
          },
          { now: options.now },
        ),
      );
      root.append(
        el('div', { class: 'parent-card', attrs: { 'data-testid': 'exam-warning' } }, [
          el('p', {}, [el('strong', { text: pendingName, attrs: { 'data-testid': 'exam-warning-name' } })]),
          el('p', {
            text: `Te weinig vragen voor dit examen, het examen krijgt er ${plan.real} in plaats van ${plan.wanted}`,
          }),
          el('div', { class: 'parent-btn-row' }, [yes, no]),
        ]),
      );
    }

    const withExams = options.catalog.modules().filter((m) => m.module.exams.length > 0);
    if (withExams.length === 0) {
      root.append(el('div', { class: 'parent-card' }, [el('p', { text: 'Er zijn nog geen examens.' })]));
      return;
    }
    const chosen = selected === null ? undefined : withExams.find((m) => m.module.id === selected);
    if (!chosen) {
      selected = null;
      renderLessons(withExams);
    } else {
      renderExams(chosen);
    }
  }

  /** Step 1: one big button per lesson, grouped under a heading per subject. */
  function renderLessons(mods: ReadonlyArray<ModuleBundle>) {
    const groups = new Map<string, ModuleBundle[]>();
    for (const mod of mods) {
      const key = mod.module.subject.trim().toLowerCase();
      const list = groups.get(key) ?? [];
      list.push(mod);
      groups.set(key, list);
    }
    for (const [key, list] of groups) {
      const group = el('div', { class: 'parent-card', attrs: { 'data-subject': key } }, [
        el('strong', { text: subjectLabel(key) }),
      ]);
      for (const mod of list) {
        const n = mod.module.exams.length;
        const btn = el(
          'button',
          {
            class: 'parent-btn parent-btn-primary',
            attrs: {
              type: 'button',
              'data-lesson': mod.module.id,
              'aria-label': `${mod.module.title}, ${n} ${n === 1 ? 'examen' : 'examens'}`,
            },
          },
          [
            el('span', { text: mod.module.title }),
            el('small', { text: ` ${n} ${n === 1 ? 'examen' : 'examens'}` }),
          ],
        );
        cleanups.push(
          onTap(
            btn,
            () => {
              selected = mod.module.id;
              message = null;
              pending = null;
              render();
            },
            { now: options.now },
          ),
        );
        group.append(el('div', { class: 'parent-row' }, [btn]));
      }
      root.append(group);
    }
  }

  /** Step 2: the exams of one lesson, with a way back to all lessons. */
  function renderExams(mod: ModuleBundle) {
    const back = el('button', {
      class: 'parent-btn',
      text: 'Terug naar alle lessen',
      attrs: { type: 'button', 'data-testid': 'exam-lessons-back' },
    });
    cleanups.push(
      onTap(
        back,
        () => {
          selected = null;
          message = null;
          pending = null;
          render();
        },
        { now: options.now },
      ),
    );
    const card = el('div', { class: 'parent-card', attrs: { 'data-testid': 'exam-lesson' } }, [
      el('strong', { text: mod.module.title, attrs: { 'data-testid': 'exam-lesson-title' } }),
    ]);
    for (const exam of mod.module.exams) {
      const btn = el('button', {
        class: 'parent-btn parent-btn-primary',
        text: 'Start',
        attrs: {
          type: 'button',
          'data-exam': `${mod.module.id}/${exam.id}`,
          'aria-label': `Start ${mod.module.title}, ${exam.title}`,
        },
      });
      cleanups.push(onTap(btn, () => tryStart(mod.module.id, exam.id), { now: options.now }));
      const minutes =
        exam.timeLimitMinutes === null ? 'geen tijdslimiet' : `${exam.timeLimitMinutes} minuten`;
      card.append(
        el('div', { class: 'parent-row' }, [
          el('span', { text: `${exam.title}: ${exam.questionCount} vragen, ${minutes}` }),
          btn,
        ]),
      );
    }
    root.append(card, el('div', { class: 'parent-btn-row' }, [back]));
  }

  render();

  return {
    element: root,
    destroy() {
      clearCleanups();
      root.remove();
    },
  };
}
