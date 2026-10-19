// Parent Examens section (T51c, AC72 view part, AC115): pick an exam, see a warning when the
// module has too few items, and start only after a confirm. Never imports the exam flow.

import type { Catalog } from '../../content/catalog';
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
          el('p', {
            text: `Te weinig vragen voor dit examen, het examen krijgt er ${plan.real} in plaats van ${plan.wanted}`,
          }),
          el('div', { class: 'parent-btn-row' }, [yes, no]),
        ]),
      );
    }

    let any = false;
    for (const mod of options.catalog.modules()) {
      if (mod.module.exams.length === 0) continue;
      any = true;
      const card = el('div', { class: 'parent-card' }, [
        el('strong', { text: mod.module.title }),
      ]);
      for (const exam of mod.module.exams) {
        const btn = el('button', {
          class: 'parent-btn parent-btn-primary',
          text: 'Start',
          attrs: {
            type: 'button',
            'data-exam': `${mod.module.id}/${exam.id}`,
            'aria-label': `Start ${exam.title}`,
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
      root.append(card);
    }
    if (!any) {
      root.append(el('div', { class: 'parent-card' }, [el('p', { text: 'Er zijn nog geen examens.' })]));
    }
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
