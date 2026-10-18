// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createCatalog, REKENEN_MODULE_ID } from '../content/catalog';
import { MSG_ENOUGH_PRACTICE } from '../core/economy';
import { createRng } from '../core/rng';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createLesboek } from '../ui/learn/lesboek';
import { createPracticeFlow, selectPracticeTopicItems } from './practice-flow';
import { createScreenManager } from './screens';

function tap(el: Element | undefined | null) {
  if (!el) return;
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('lesboek and practice-flow (T46, AC51, AC52, AC120)', () => {
  it('renders switched-on lessons in Lesboek and allows opening a lesson and jumping to practice (AC51)', () => {
    const catalog = createCatalog();
    const practiced: Array<[string, string]> = [];
    let closed = 0;

    const lesboek = createLesboek({
      catalog,
      switches: { modules: {} },
      onClose: () => closed++,
      onPracticeTopic: (m, t) => practiced.push([m, t]),
    });

    const topicButtons = Array.from(
      lesboek.element.querySelectorAll<HTMLButtonElement>('[data-topic-id]'),
    );
    expect(topicButtons.length).toBeGreaterThan(5);

    // Open the first topic lesson
    tap(topicButtons[0]);
    expect(lesboek.element.textContent).toContain('Terug naar Lesboek');

    const practiceBtn = lesboek.element.querySelector<HTMLButtonElement>(
      '[data-testid="lesboek-practice-topic"]',
    );
    expect(practiceBtn).not.toBeNull();
    tap(practiceBtn);
    expect(practiced).toHaveLength(1);

    lesboek.destroy();
    expect(closed).toBe(0);
  });

  it('selects practice items for a topic and enforces the 10-point daily cap in Extra oefenen (AC52, AC120)', async () => {
    const db = await openDb({ name: `practice-test-${Math.random()}` });
    const records = createRecords(db);
    const progressStore = createProgressStore(db);
    const logStore = createLogStore(db);
    const catalog = createCatalog();
    const host = document.createElement('div');
    const screens = createScreenManager({ host });

    const items = selectPracticeTopicItems({
      catalog,
      switches: { modules: {} },
      progress: [],
      moduleId: REKENEN_MODULE_ID,
      topicId: 'optellen',
      count: 5,
      today: '2026-10-17',
      rng: createRng(42),
    });
    expect(items).toHaveLength(5);

    // Reach 10 practice points on 2026-10-17
    await records.put('economy', {
      points: 10,
      practicePointsToday: 10,
      practiceDay: '2026-10-17',
    });

    let currentDay = '2026-10-17';
    const flow = createPracticeFlow({
      screens,
      clock: {
        now: () => Date.parse(`${currentDay}T12:00:00Z`),
      },
      rng: createRng(99),
      records,
      progressStore,
      logStore,
      getCatalog: () => catalog,
    });

    flow.open();
    await new Promise((r) => setTimeout(r, 20));
    expect(host.textContent).toContain(MSG_ENOUGH_PRACTICE);

    // Next day resets the cap (AC120)
    currentDay = '2026-10-18';
    flow.open();
    await new Promise((r) => setTimeout(r, 20));
    expect(host.textContent).not.toContain(MSG_ENOUGH_PRACTICE);
    expect(host.textContent).toContain('Vandaag: 0 / 10 extra');

    flow.destroy();
    db.close();
  });
});
