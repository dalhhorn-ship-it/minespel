// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
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
});
