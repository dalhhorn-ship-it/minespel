// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import { createBreakFlow } from './break-flow';
import { loadCatalog } from './content-loader';
import { resumeSessionIfAny } from './resume';
import { createScreenManager } from './screens';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('break flow & resume (T43)', () => {
  it('starts a break, persists session after every step, resumes on reload, and logs break + economy on finish', async () => {
    const db = await openDb({ name: `break-flow-${Math.random()}` });
    try {
      const catalog = await loadCatalog(db);
      const records = createRecords(db);
      const progressStore = createProgressStore(db);
      const logStore = createLogStore(db);
      const sessionStore = createSessionStore(db);
      const clock = createFakeClock(new Date('2026-10-17T14:00:00Z').getTime());
      const rng = createRng(42);
      const host = document.createElement('div');
      document.body.append(host);
      const screens = createScreenManager({ host });

      // Configure 2 questions per break and skip initial lesson by marking seen or disabling new lessons?
      // Let's keep newLessonsEnabled true and click through the lesson first!
      await records.update('settings', (s) => ({ ...s, questionsPerBreak: 2 }));

      const onBreakFinished = vi.fn();
      const flow = createBreakFlow({
        clock,
        rng,
        screens,
        records,
        progressStore,
        logStore,
        sessionStore,
        getCatalog: () => catalog,
        onBreakFinished,
      });

      await flow.startBreak();
      expect(flow.isActive()).toBe(true);
      expect(screens.current()).toBe('learn');
      expect(flow.currentState()?.phase).toBe('lesson');

      // Advance past lesson button guard and finish lesson
      clock.advance(2000);
      while (flow.currentState()?.phase === 'lesson') {
        const nextOrStart = host.querySelector('.lesson-next') as HTMLButtonElement | null;
        expect(nextOrStart).not.toBeNull();
        tap(nextOrStart!);
        clock.advance(2000);
        await new Promise((r) => setTimeout(r, 10));
      }

      expect(flow.currentState()?.phase).toBe('question');
      expect(flow.currentState()?.index).toBe(0);

      // Simulate a reload right at question 0!
      flow.destroy();
      const screens2 = createScreenManager({ host });
      const flow2 = createBreakFlow({
        clock,
        rng,
        screens: screens2,
        records,
        progressStore,
        logStore,
        sessionStore,
        getCatalog: () => catalog,
        onBreakFinished,
      });

      const resumed = await resumeSessionIfAny({
        sessionStore,
        records,
        breakFlow: flow2,
      });
      expect(resumed).toBe('break');
      expect(flow2.currentState()?.phase).toBe('question');
      expect(flow2.currentState()?.index).toBe(0);

      // Answer both questions via parentEnd or examine parentEnd logging
      await flow2.endBreakByParent();
      expect(flow2.isActive()).toBe(false);
      expect(screens2.current()).toBe('world');
      expect(onBreakFinished).toHaveBeenCalledTimes(1);

      const breaks = await logStore.listBreaks();
      expect(breaks.length).toBe(1);
      expect(breaks[0]?.endedBy).toBe('stopped');

      const answers = await logStore.listAnswers();
      expect(answers.length).toBe(2);
      expect(answers[0]?.given).toBe('niet beantwoord');

      host.remove();
    } finally {
      db.close();
    }
  });

  it('a break from Nu oefenen is early, resumes as early, and a normal break is not early (decision 56)', async () => {
    const db = await openDb({ name: `break-flow-early-${Math.random()}` });
    try {
      const catalog = await loadCatalog(db);
      const records = createRecords(db);
      const progressStore = createProgressStore(db);
      const logStore = createLogStore(db);
      const sessionStore = createSessionStore(db);
      const clock = createFakeClock(new Date('2026-10-17T14:00:00Z').getTime());
      const rng = createRng(7);
      const host = document.createElement('div');
      document.body.append(host);
      const make = () =>
        createBreakFlow({
          clock,
          rng,
          screens: createScreenManager({ host }),
          records,
          progressStore,
          logStore,
          sessionStore,
          getCatalog: () => catalog,
        });

      const normal = make();
      await normal.startBreak();
      expect(normal.currentState()?.early).toBeFalsy();
      await normal.endBreakByParent();

      const early = make();
      await early.startBreak({ early: true });
      expect(early.currentState()?.early).toBe(true);
      early.destroy();

      const again = make();
      expect(await resumeSessionIfAny({ sessionStore, records, breakFlow: again })).toBe('break');
      expect(again.currentState()?.early).toBe(true);
      await again.endBreakByParent();

      // The timer ran out while the app was closed: a normal break, never early.
      await records.update('timers', (t) => ({ ...t, playMsLeft: 0 }));
      const timed = make();
      expect(await resumeSessionIfAny({ sessionStore, records, breakFlow: timed })).toBe('break');
      expect(timed.currentState()?.early).toBeFalsy();
      host.remove();
    } finally {
      db.close();
    }
  });
});
