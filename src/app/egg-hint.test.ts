// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createCatalog, REKENEN_MODULE_ID } from '../content/catalog';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import { createBreakFlow } from './break-flow';
import { createPracticeFlow } from './practice-flow';
import { createScreenManager } from './screens';

const seen: Array<((pts: number) => boolean) | undefined> = [];
vi.mock('../ui/learn/break-screen', async () => {
  const actual = await vi.importActual<typeof import('../ui/learn/break-screen')>('../ui/learn/break-screen');
  return {
    ...actual,
    createBreakScreen: (o: Parameters<typeof actual.createBreakScreen>[0]) => {
      seen.push(o.canAffordEgg);
      return actual.createBreakScreen(o);
    },
  };
});

const shop = (n: number) => Array.from({ length: n }, () => ({ kind: 'compy' }));
const golden = (n: number) => Array.from({ length: n }, () => ({ kind: 'compy', golden: true }));
const chickens = (n: number) => Array.from({ length: n }, () => ({ kind: 'kip' }));

const TABLE: Array<{ name: string; dinos: object[]; eggs: object[]; points: number; hint: boolean }> = [
  { name: '12 shop dinos: cap, no hint', dinos: shop(12), eggs: [], points: 100, hint: false },
  { name: '11 shop dinos plus 1 egg: cap, no hint', dinos: shop(11), eggs: shop(1), points: 100, hint: false },
  { name: '11 shop dinos plus golden dinos plus chickens: room, hint', dinos: [...shop(11), ...golden(3), ...chickens(10)], eggs: golden(2), points: 20, hint: true },
  { name: 'few dinos but too few points: no hint', dinos: shop(2), eggs: [], points: 19, hint: false },
  { name: 'only golden and chickens: hint', dinos: [...golden(13), ...chickens(10)], eggs: [], points: 25, hint: true },
];

describe('egg hint is the same after a break and after Extra oefenen (AC169, AC34, AC111)', () => {
  for (const row of TABLE) {
    it(`AC169: ${row.name}`, async () => {
      const db = await openDb({ name: `egg-hint-${Math.random()}` });
      try {
        const records = createRecords(db);
        await records.put('dinos', { dinos: row.dinos, eggs: row.eggs } as never);
        const host = document.createElement('div');
        document.body.append(host);

        const catalog = createCatalog();
        const base = {
          clock: createFakeClock(new Date('2026-10-17T14:00:00Z').getTime()),
          records,
          progressStore: createProgressStore(db),
          logStore: createLogStore(db),
          getCatalog: () => catalog,
        };

        seen.length = 0;
        const practice = createPracticeFlow({ ...base, screens: createScreenManager({ host }), rng: createRng(1) });
        await practice.startTopic(REKENEN_MODULE_ID, 'optellen');
        const practiceHint = seen.at(-1)?.(row.points);
        practice.destroy();

        seen.length = 0;
        const brk = createBreakFlow({
          ...base,
          rng: createRng(1),
          screens: createScreenManager({ host }),
          sessionStore: createSessionStore(db),
        });
        await brk.startBreak();
        const breakHint = seen.at(-1)?.(row.points);
        brk.destroy();

        expect(practiceHint).toBe(row.hint);
        expect(breakHint).toBe(row.hint);
      } finally {
        db.close();
      }
    });
  }
});
