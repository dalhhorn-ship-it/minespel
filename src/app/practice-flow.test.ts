// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createCatalog, REKENEN_MODULE_ID } from '../content/catalog';
import { createRng } from '../core/rng';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createLesboek } from '../ui/learn/lesboek';
import { createPracticeFlow } from './practice-flow';
import { createScreenManager } from './screens';

function tap(el: Element | undefined | null) {
  if (!el) return;
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('lesboek and practice-flow (T46, AC51, AC52, AC175)', () => {
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

  it('AC175: Extra oefenen has no day limit, even when 50 points were counted today (a save from 0.3.0)', async () => {
    const db = await openDb({ name: `practice-test-${Math.random()}` });
    const records = createRecords(db);
    const catalog = createCatalog();
    const host = document.createElement('div');
    const screens = createScreenManager({ host });
    await records.put('economy', { points: 60, practicePointsToday: 50, practiceDay: '2026-10-17' });

    const flow = createPracticeFlow({
      screens,
      clock: { now: () => Date.parse('2026-10-17T12:00:00Z') },
      rng: createRng(99),
      records,
      progressStore: createProgressStore(db),
      logStore: createLogStore(db),
      getCatalog: () => catalog,
    });

    flow.open();
    await vi.waitFor(() => expect(host.textContent).toContain('Extra oefenen'));
    expect(host.textContent).not.toContain('Genoeg geoefend');
    expect(host.textContent).not.toContain('Vandaag:');
    expect(host.querySelector('[data-testid="practice-cap-banner"]')).toBeNull();

    await flow.startTopic(REKENEN_MODULE_ID, 'optellen');
    const m = /(\d+) \+ (\d+)/.exec(host.querySelector('.q-prompt')?.textContent ?? '');
    const answer = String(Number(m?.[1]) + Number(m?.[2]));
    for (const ch of answer) {
      tap(Array.from(host.querySelectorAll('.kb-char')).find((b) => b.textContent === ch));
    }
    tap(host.querySelector('.kb-done'));
    await vi.waitFor(() => expect(host.textContent).toContain('Goed! +2 punten'));
    await vi.waitFor(async () => expect((await records.get('economy')).points).toBe(62));
    expect(host.textContent).not.toContain('Genoeg geoefend');

    flow.destroy();
    db.close();
  });

  it('AC172 and AC173: Extra oefenen follows the saved Punten setting (Moeilijk takes 1 on a wrong first try)', async () => {
    const db = await openDb({ name: `practice-mode-${Math.random()}` });
    const records = createRecords(db);
    const host = document.createElement('div');
    const screens = createScreenManager({ host });
    await records.update('settings', (st) => ({ ...st, pointsMode: 'moeilijk' }));
    await records.put('economy', { points: 10, practicePointsToday: 0, practiceDay: '' });
    const flow = createPracticeFlow({
      screens,
      clock: { now: () => Date.parse('2026-10-17T12:00:00Z') },
      rng: createRng(7),
      records,
      progressStore: createProgressStore(db),
      logStore: createLogStore(db),
      getCatalog: () => createCatalog(),
    });
    await flow.startTopic(REKENEN_MODULE_ID, 'optellen');
    for (const ch of '9999') {
      tap(Array.from(host.querySelectorAll('.kb-char')).find((b) => b.textContent === ch));
    }
    tap(host.querySelector('.kb-done'));
    await vi.waitFor(() => expect(host.querySelector('.break-banner-wrong .points-minus')?.textContent).toBe('-1 punt'));
    await vi.waitFor(async () => expect((await records.get('economy')).points).toBe(9));
    flow.destroy();
    db.close();
  });

  it('Stoppen ends an Extra oefenen session, keeps the points earned and goes back to the world (decision 51)', async () => {
    const db = await openDb({ name: `practice-stop-${Math.random()}` });
    const records = createRecords(db);
    const host = document.createElement('div');
    const screens = createScreenManager({ host });
    const flow = createPracticeFlow({
      screens,
      clock: { now: () => Date.parse('2026-10-17T12:00:00Z') },
      rng: createRng(5),
      records,
      progressStore: createProgressStore(db),
      logStore: createLogStore(db),
      getCatalog: () => createCatalog(),
    });

    await flow.startTopic(REKENEN_MODULE_ID, 'optellen');
    expect(screens.current()).toBe('learn');
    const stop = host.querySelector<HTMLButtonElement>('[data-testid="practice-stop"]');
    expect(stop).not.toBeNull();
    expect(stop?.hidden).toBe(false);

    // Answer the first sum right: +2 points, saved per step.
    const m = /(\d+) \+ (\d+)/.exec(host.querySelector('.q-prompt')?.textContent ?? '');
    expect(m).not.toBeNull();
    const answer = String(Number(m?.[1]) + Number(m?.[2]));
    for (const ch of answer) {
      tap(Array.from(host.querySelectorAll('.kb-char')).find((b) => b.textContent === ch));
    }
    tap(host.querySelector('.kb-done'));
    await vi.waitFor(() => expect(host.textContent).toContain('Goed'));
    // Stoppen is also there on the feedback step.
    expect(host.querySelector<HTMLButtonElement>('[data-testid="practice-stop"]')?.hidden).toBe(false);

    tap(host.querySelector('[data-testid="practice-stop"]'));
    await vi.waitFor(() => expect(screens.current()).toBe('world'));
    expect(host.querySelector('.break-screen')).toBeNull();
    await vi.waitFor(async () => {
      const economy = await records.get('economy');
      expect(economy.points).toBe(2);
    });

    flow.destroy();
    db.close();
  });
});
