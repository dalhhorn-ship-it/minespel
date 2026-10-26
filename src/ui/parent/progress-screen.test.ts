// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { computeProgress } from '../../learning/progress-stats';
import type { AnswerRecord } from '../../storage/log-store';
import { createProgressScreen, shortDay } from './progress-screen';

function answer(day: string, correct: boolean, n: number): AnswerRecord {
  return {
    id: n, ts: n, day, context: 'break', sessionId: 's', moduleId: 'taal', topic: 'dt', skill: 'x', level: 'E6',
    itemId: `i${n % 3}`, try: 1, correct, given: 'x', ms: 3000,
  };
}

describe('Voortgang screen (decision 115)', () => {
  it('shows an empty note before any answer', () => {
    const stats = computeProgress({ answers: [], breaks: [], exams: [], ledger: [], stats: { playMsPerDay: {} }, today: '2026-10-28' });
    const view = createProgressScreen({ stats });
    expect(view.element.querySelector('[data-testid="progress-empty"]')).not.toBeNull();
    expect(view.element.querySelector('svg')).toBeNull();
  });

  it('shows the week report, three charts with a title per bar, the topics and the hard questions', () => {
    const answers = [answer('2026-10-27', true, 1), answer('2026-10-27', false, 2), answer('2026-10-14', true, 3)];
    const stats = computeProgress({
      answers, breaks: [], exams: [], ledger: [], stats: { playMsPerDay: { '2026-10-27': 600_000 } }, today: '2026-10-28',
    });
    const root = createProgressScreen({ stats }).element;
    expect(root.querySelector('[data-testid="progress-week-report"] h3')?.textContent).toBe('Weekrapport (26 okt tot en met 1 nov)');
    expect(root.querySelector('[data-testid="progress-tile-questions"] .progress-tile-value')?.textContent).toBe('2 ↑');
    expect(root.querySelector('[data-testid="progress-tile-pct"] .progress-tile-value')?.textContent).toBe('50%');
    for (const id of ['progress-chart-pct', 'progress-chart-questions', 'progress-chart-days']) {
      expect(root.querySelector(`[data-testid="${id}"]`)).not.toBeNull();
    }
    const pctChart = root.querySelector('[data-testid="progress-chart-pct"]')!;
    expect(pctChart.querySelectorAll('title')).toHaveLength(12);
    expect(pctChart.querySelectorAll('.progress-bar')).toHaveLength(2);
    // Two series get a legend.
    expect(root.querySelector('.progress-legend')?.textContent).toContain('Leren');
    expect(root.querySelector('[data-testid="progress-topics"] tbody tr')?.textContent).toContain('taal: dt');
    expect(root.querySelectorAll('[data-testid="progress-hard"] li')).toHaveLength(1);
    expect(root.querySelectorAll('details table').length).toBe(2);
  });

  it('writes a short Dutch day', () => {
    expect(shortDay('2026-10-05')).toBe('5 okt');
  });
});
