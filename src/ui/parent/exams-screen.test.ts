// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createCatalog } from '../../content/catalog';
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
