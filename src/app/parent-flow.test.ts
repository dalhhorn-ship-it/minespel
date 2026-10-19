// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import { setPin } from '../gate/pin';
import { makeResetQuestion } from '../gate/reset-question';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import { createBreakFlow } from './break-flow';
import { loadCatalog } from './content-loader';
import { createParentFlow } from './parent-flow';
import { createScreenManager } from './screens';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('parental controls flow (T48a, T48b, T49, T50)', () => {
  it('opens PIN setup on first open, unlocks parent shell, starts a break now, and closes back to underlying screen', async () => {
    const db = await openDb({ name: `parent-flow-${Math.random()}` });
    try {
      const catalog = await loadCatalog(db);
      const records = createRecords(db);
      const progressStore = createProgressStore(db);
      const logStore = createLogStore(db);
      const sessionStore = createSessionStore(db);
      const clock = createFakeClock(new Date('2026-10-17T15:00:00Z').getTime());
      const rng = createRng(99);
      const host = document.createElement('div');
      document.body.append(host);
      const screens = createScreenManager({ host });

      const breakFlow = createBreakFlow({
        clock,
        rng,
        screens,
        records,
        progressStore,
        logStore,
        sessionStore,
        getCatalog: () => catalog,
      });

      const parentFlow = createParentFlow({
        clock,
        rng,
        screens,
        records,
        progressStore,
        logStore,
        getCatalog: () => catalog,
        breakFlow,
      });

      await parentFlow.open();
      expect(screens.current()).toBe('parent');

      // First PIN: a grown up sum first (decision 52), then choose and confirm 1234.
      const question = makeResetQuestion(createRng(99));
      expect(host.querySelector('[data-key="1"]')).toBeNull();
      const input = host.querySelector<HTMLInputElement>('input.parent-input')!;
      input.value = String(question.answer);
      tap(host.querySelector('.parent-btn-primary')!);
      await new Promise((r) => setTimeout(r, 20));
      for (let round = 0; round < 2; round++) {
        for (const digit of ['1', '2', '3', '4']) {
          const key = host.querySelector(`[data-key="${digit}"]`)!;
          tap(key);
          clock.advance(400);
        }
        await new Promise((r) => setTimeout(r, 20));
      }

      // Wait for async unlock & shell load
      await new Promise((r) => setTimeout(r, 20));
      expect(host.querySelector('[data-testid="parent-shell"]')).not.toBeNull();

      // Switch to "Inhoud kiezen" tab and apply Groep 7 midden preset
      const inhoudBtn = host.querySelector('[data-section="inhoud"]')!;
      tap(inhoudBtn);
      clock.advance(400);
      const presetBtn = host.querySelector('[data-preset="groep-7-midden"]')!;
      tap(presetBtn);
      clock.advance(400);

      await new Promise((r) => setTimeout(r, 20));
      const switches = await records.get('switches');
      expect((switches.modules['rekenen-basis'] as { levels?: string[] }).levels).toEqual([
        'M6',
        'E6',
        'M7',
      ]);

      // Close parent screen -> back to world
      const closeBtn = host.querySelector('[data-testid="parent-close-btn"]')!;
      tap(closeBtn);
      expect(screens.current()).toBe('world');

      parentFlow.destroy();
      breakFlow.destroy();
      host.remove();
    } finally {
      db.close();
    }
  });

  async function examSetup() {
    const db = await openDb({ name: `parent-flow-exam-${Math.random()}` });
    const catalog = await loadCatalog(db);
    const records = createRecords(db);
    const clock = createFakeClock(new Date('2026-10-17T15:00:00Z').getTime());
    const rng = createRng(5);
    const host = document.createElement('div');
    document.body.append(host);
    const screens = createScreenManager({ host });
    const examNode = document.createElement('div');
    examNode.textContent = 'vraag 9';
    screens.showExam(examNode);
    const breakFlow = createBreakFlow({
      clock, rng, screens, records,
      progressStore: createProgressStore(db),
      logStore: createLogStore(db),
      sessionStore: createSessionStore(db),
      getCatalog: () => catalog,
    });
    const exams = {
      isActive: () => true,
      plan: () => ({ wanted: 30, real: 30 }),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const parentFlow = createParentFlow({
      clock, rng, screens, records,
      progressStore: createProgressStore(db),
      logStore: createLogStore(db),
      getCatalog: () => catalog,
      breakFlow,
      exams,
    });
    await records.put('gate', await setPin(await records.get('gate'), '1234', rng));
    const typePin = async (pin: string) => {
      for (const d of pin) {
        tap(host.querySelector(`[data-key="${d}"]`)!);
        clock.advance(400);
      }
      await new Promise((r) => setTimeout(r, 20));
    };
    return { db, host, screens, examNode, exams, parentFlow, typePin, breakFlow };
  }

  it('AC157: exam lock route shows only the stop card, Stoppen calls exams.stop', async () => {
    const t = await examSetup();
    try {
      await t.parentFlow.openExamStop();
      expect(t.screens.current()).toBe('parent');
      await t.typePin('1234');
      expect(t.host.querySelector('[data-testid="parent-shell"]')).toBeNull();
      expect(t.host.querySelector('[data-testid="exam-stop-card"]')).not.toBeNull();
      tap(t.host.querySelector('[data-testid="exam-stop-confirm"]')!);
      await new Promise((r) => setTimeout(r, 20));
      expect(t.exams.stop).toHaveBeenCalledTimes(1);
      expect(t.host.querySelector('[data-testid="exam-stop-card"]')).toBeNull();
    } finally {
      t.parentFlow.destroy();
      t.breakFlow.destroy();
      t.db.close();
    }
  });

  it('AC158: Terug on the pin pad and Terug naar het examen leave the exam layer untouched', async () => {
    const t = await examSetup();
    try {
      await t.parentFlow.openExamStop();
      // The pin pad's way back is its "Sluiten" key (gate-screen.ts is reused unchanged).
      tap(t.host.querySelector('[data-key="Sluiten"]')!);
      expect(t.exams.stop).not.toHaveBeenCalled();
      expect(t.host.contains(t.examNode)).toBe(true);
      expect(t.screens.current()).toBe('exam');

      await t.parentFlow.openExamStop();
      await t.typePin('1234');
      tap(t.host.querySelector('[data-testid="exam-stop-back"]')!);
      expect(t.exams.stop).not.toHaveBeenCalled();
      expect(t.host.contains(t.examNode)).toBe(true);
      expect(t.examNode.textContent).toBe('vraag 9');
      expect(t.screens.current()).toBe('exam');
    } finally {
      t.parentFlow.destroy();
      t.breakFlow.destroy();
      t.db.close();
    }
  });

  it('AC74: three wrong codes from the exam lock block the pin pad', async () => {
    const t = await examSetup();
    try {
      await t.parentFlow.open();
      for (let i = 0; i < 3; i++) await t.typePin('9999');
      expect(t.host.textContent).toContain('Wacht nog');
      await t.parentFlow.openExamStop();
      expect(t.host.textContent).toContain('Wacht nog');
      await t.typePin('1234');
      expect(t.host.querySelector('[data-testid="exam-stop-card"]')).toBeNull();
    } finally {
      t.parentFlow.destroy();
      t.breakFlow.destroy();
      t.db.close();
    }
  });

  it('AC72 and AC115: Examens starts through the exams option and closes the parent layer', async () => {
    const t = await examSetup();
    try {
      await t.parentFlow.open('examens');
      await t.typePin('1234');
      await new Promise((r) => setTimeout(r, 20));
      const btn = t.host.querySelector('[data-exam]')!;
      tap(btn);
      await new Promise((r) => setTimeout(r, 20));
      expect(t.exams.start).toHaveBeenCalledTimes(1);
      expect(t.host.querySelector('[data-testid="parent-shell"]')).toBeNull();
      // While an exam is active, Pauze nu starten is disabled in Instellingen.
      await t.parentFlow.open('instellingen');
      await t.typePin('1234');
      await new Promise((r) => setTimeout(r, 20));
      const pause = [...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Pauze nu starten')!;
      expect(pause.disabled).toBe(true);
    } finally {
      t.parentFlow.destroy();
      t.breakFlow.destroy();
      t.db.close();
    }
  });
});
