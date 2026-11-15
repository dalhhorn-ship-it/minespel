// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createCatalog, subjectLabel } from '../../content/catalog';
import { createExamsScreen } from './exams-screen';
import { createExamStopCard } from './exam-stop-card';
import { createSettingsScreen } from './settings-screen';
import { defaultKv, type SettingsRecord } from '../../storage/schema';

function tap(el: Element | null | undefined) {
  if (!el) throw new Error('missing element');
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

function makeExams(opts: { real: number; breakActive?: boolean }) {
  const catalog = createCatalog();
  const mod = catalog.modules().find((m) => m.module.exams.length > 0)!;
  const exam = mod.module.exams[0]!;
  const start = vi.fn();
  let tick = 0;
  const screen = createExamsScreen({
    catalog,
    isBreakActive: opts.breakActive ?? false,
    planFor: () => ({ wanted: exam.questionCount, real: opts.real }),
    onStartExam: start,
    now: () => (tick += 1000),
  });
  const host = document.createElement('div');
  host.append(screen.element);
  // Step 1: pick the lesson (T51c, decision 125).
  tap(host.querySelector(`[data-lesson="${mod.module.id}"]`));
  return { host, start, mod, exam, screen };
}

describe('Examens section (T51c)', () => {
  it('lists exams per module and starts at once when there are enough questions', () => {
    const { host, start, mod, exam } = makeExams({ real: 99 });
    tap(host.querySelector(`[data-exam="${mod.module.id}/${exam.id}"]`));
    expect(host.querySelector('[data-testid="exam-warning"]')).toBeNull();
    expect(start).toHaveBeenCalledWith(mod.module.id, exam.id);
  });

  it('AC72: warns with the real count and starts only after the confirm', () => {
    const { host, start, mod, exam } = makeExams({ real: 12 });
    tap(host.querySelector(`[data-exam="${mod.module.id}/${exam.id}"]`));
    expect(start).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="exam-warning"]')!.textContent).toContain(
      `Te weinig vragen voor dit examen, het examen krijgt er 12 in plaats van ${exam.questionCount}`,
    );
    // Decision 125: the confirm names the lesson and the exam.
    expect(host.querySelector('[data-testid="exam-warning-name"]')!.textContent).toBe(
      `${mod.module.title}, ${exam.title}`,
    );
    tap(host.querySelector('[data-testid="exam-cancel"]'));
    expect(start).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="exam-warning"]')).toBeNull();
    tap(host.querySelector(`[data-exam="${mod.module.id}/${exam.id}"]`));
    tap(host.querySelector('[data-testid="exam-confirm"]'));
    expect(start).toHaveBeenCalledWith(mod.module.id, exam.id);
  });

  it('AC115: refuses to start while a break runs', () => {
    const { host, start, mod, exam } = makeExams({ real: 99, breakActive: true });
    tap(host.querySelector(`[data-exam="${mod.module.id}/${exam.id}"]`));
    expect(start).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="exam-message"]')!.textContent).toBe(
      'Beëindig eerst de pauze',
    );
  });
});

describe('Examens pick the lesson first (decision 125)', () => {
  function bare() {
    const catalog = createCatalog();
    const screen = createExamsScreen({
      catalog,
      isBreakActive: false,
      planFor: () => ({ wanted: 1, real: 1 }),
      onStartExam: () => undefined,
      now: (() => {
        let t = 0;
        return () => (t += 1000);
      })(),
    });
    const host = document.createElement('div');
    host.append(screen.element);
    return { catalog, host };
  }

  it('lists lessons grouped by subject, with the exam count, and no exam buttons yet', () => {
    const { catalog, host } = bare();
    expect(host.querySelector('[data-exam]')).toBeNull();
    const withExams = catalog.modules().filter((m) => m.module.exams.length > 0);
    const lessons = [...host.querySelectorAll('[data-lesson]')];
    // Grouping by subject may reorder, so compare as sets.
    expect(lessons.map((b) => b.getAttribute('data-lesson')).sort()).toEqual(
      withExams.map((m) => m.module.id).sort(),
    );
    for (const group of host.querySelectorAll('[data-subject]')) {
      const key = group.getAttribute('data-subject')!;
      expect(group.querySelector('strong')!.textContent).toBe(subjectLabel(key));
      for (const b of group.querySelectorAll('[data-lesson]')) {
        const mod = catalog.getModule(b.getAttribute('data-lesson')!)!;
        expect(mod.module.subject.trim().toLowerCase()).toBe(key);
        expect(b.textContent).toContain(mod.module.title);
        expect(b.textContent).toContain(`${mod.module.exams.length} exam`);
      }
    }
    const engels = host.querySelector('[data-subject="engels"]');
    expect(engels?.querySelector('strong')!.textContent).toBe('Engels');
  });

  it('picking a lesson shows only its exams, with the lesson in every label, and Terug goes back', () => {
    const { catalog, host } = bare();
    const mods = catalog.modules().filter((m) => m.module.exams.length > 0);
    const mod = mods[mods.length - 1]!;
    tap(host.querySelector(`[data-lesson="${mod.module.id}"]`));
    expect(host.querySelector('[data-testid="exam-lesson-title"]')!.textContent).toBe(mod.module.title);
    const buttons = [...host.querySelectorAll('[data-exam]')];
    expect(buttons.map((b) => b.getAttribute('data-exam'))).toEqual(
      mod.module.exams.map((e) => `${mod.module.id}/${e.id}`),
    );
    mod.module.exams.forEach((e, i) => {
      expect(buttons[i]!.getAttribute('aria-label')).toBe(`Start ${mod.module.title}, ${e.title}`);
    });
    expect(host.querySelector('[data-lesson]')).toBeNull();
    tap(host.querySelector('[data-testid="exam-lessons-back"]'));
    expect(host.querySelector('[data-exam]')).toBeNull();
    expect(host.querySelectorAll('[data-lesson]').length).toBe(mods.length);
  });

  it('falls back to Overig for an empty subject and to the raw value for an unknown one', () => {
    expect(subjectLabel('')).toBe('Overig');
    expect(subjectLabel('muziek')).toBe('Muziek');
  });
});

describe('Pauze nu starten during an exam (AC115)', () => {
  function settings(isExamActive: boolean) {
    const onStartBreakNow = vi.fn();
    const screen = createSettingsScreen({
      settings: defaultKv('settings') as SettingsRecord,
      isBreakActive: false,
      isExamActive,
      onUpdateSettings: () => undefined,
      onStartBreakNow,
      onEndBreakNow: () => undefined,
      onChangePin: () => undefined,
    });
    const btn = [...screen.element.querySelectorAll('button')].find(
      (b) => b.textContent === 'Pauze nu starten',
    )!;
    return { btn, onStartBreakNow };
  }
  it('is disabled and does nothing while an exam runs', () => {
    const { btn, onStartBreakNow } = settings(true);
    expect(btn.disabled).toBe(true);
    tap(btn);
    expect(onStartBreakNow).not.toHaveBeenCalled();
  });
  it('works when no exam runs', () => {
    const { btn, onStartBreakNow } = settings(false);
    expect(btn.disabled).toBe(false);
    tap(btn);
    expect(onStartBreakNow).toHaveBeenCalled();
  });
});

describe('Examen stoppen card (T51c)', () => {
  it('Stoppen and Terug naar het examen call their callbacks', () => {
    const onStop = vi.fn();
    const onBack = vi.fn();
    const card = createExamStopCard({ onStop, onBack });
    expect(card.element.textContent).toContain('Examen stoppen?');
    tap(card.element.querySelector('[data-testid="exam-stop-back"]'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
    tap(card.element.querySelector('[data-testid="exam-stop-confirm"]'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
