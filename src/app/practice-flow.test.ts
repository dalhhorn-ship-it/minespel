import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import type { SessionState } from '../learning/break-session';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import type { AppEnv } from './app-env';
import { openPractice } from './practice-flow';
import { createScreens } from './screens';

const TAAL = 'cito-taalverzorging';
const REKENEN = 'rekenen-basis';
const DAY = new Date(2026, 9, 17, 12, 0, 0).getTime();

let dbCount = 0;
let ids = 1;
let perf = 0;

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
function tap(target: Element | null | undefined): void {
  if (!target) throw new Error('nothing to tap');
  const id = ids++;
  target.dispatchEvent(ptr('pointerdown', id));
  target.dispatchEvent(ptr('pointerup', id));
}
const until = (fn: () => unknown) => vi.waitFor(() => expect(fn()).toBeTruthy(), { timeout: 4000 });

async function rig(economy = { points: 0, practicePointsToday: 0, practiceDay: '' }, at = DAY) {
  const db = await openDb({ name: `practice-${dbCount++}` });
  const records = createRecords(db);
  await records.put('switches', { modules: { [TAAL]: { on: false }, [REKENEN]: { on: true } } });
  await records.put('economy', economy);
  const clock = createFakeClock(at);
  const env: AppEnv = {
    db,
    records,
    queue: null,
    sound: { play: () => undefined } as never,
    audio: {} as never,
    clock,
    dinos: {} as never,
    saving: true,
    breaks: { start: () => undefined, parentEnd: () => undefined, isActive: () => false },
    timer: { applySettings: () => undefined },
  };
  const host = document.createElement('div');
  document.body.append(host);
  const screens = createScreens(host);
  return { db, records, env, host, screens, clock };
}
type Rig = Awaited<ReturnType<typeof rig>>;

/** Opens the round and keeps the latest state, so the test knows the right answer. */
async function start(r: Rig, module = REKENEN) {
  const box: { state: SessionState | null } = { state: null };
  const close = openPractice(r.screens, r.env, { rng: createRng(7), onState: (s) => { box.state = s; } });
  await until(() => r.host.querySelector(`[data-practice-module="${module}"]`));
  tap(r.host.querySelector(`[data-practice-module="${module}"]`));
  await until(() => box.state);
  return { box, close };
}

async function skipLesson(host: HTMLElement): Promise<void> {
  await until(() => host.querySelector('.lesson-view') || host.querySelector('.number-view'));
  for (let i = 0; i < 12 && host.querySelector('.lesson-view'); i++) tap(host.querySelector('.lesson-next'));
  await until(() => host.querySelector('.number-view'));
}

function typeNumber(host: HTMLElement, text: string): void {
  for (const ch of text.replace('.', ',')) {
    tap([...host.querySelectorAll('.kb-char')].find((k) => k.textContent === ch));
  }
  tap(host.querySelector('.kb-done'));
}
const answerOf = (box: { state: SessionState | null }): string => String((box.state?.entries[box.state.index]?.item as { answer?: string[] } | undefined)?.answer?.[0] ?? '');

async function rightAnswer(r: Rig, box: { state: SessionState | null }): Promise<void> {
  typeNumber(r.host, answerOf(box));
  await until(() => r.host.querySelector('.break-feedback'));
  tap(r.host.querySelector('.break-button'));
}

beforeEach(() => {
  perf = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => (perf += 1000));
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('Extra oefenen', () => {
  it('is a learn screen that lists only modules that are switched on (AC48, AC52)', async () => {
    const r = await rig();
    openPractice(r.screens, r.env);
    await until(() => r.host.querySelector('[data-practice-module]'));
    expect(r.screens.current()).toBe('learn');
    const modules = [...r.host.querySelectorAll('[data-practice-module]')].map((b) => b.getAttribute('data-practice-module'));
    expect(modules).toEqual([REKENEN]);
    expect(r.host.textContent).toContain('Extra oefenen');
  });

  it('plays 5 questions with the break rules, no bonus, and logs them as practice (AC52)', async () => {
    const r = await rig();
    const { box } = await start(r);
    await skipLesson(r.host);
    expect(r.host.querySelectorAll('.break-dot').length).toBe(5);
    await rightAnswer(r, box); // +2
    await rightAnswer(r, box); // +2
    typeNumber(r.host, '7777'); // wrong: retry
    await until(() => r.host.querySelector('.break-retry'));
    typeNumber(r.host, answerOf(box)); // right on the retry: +1
    await until(() => r.host.querySelector('.break-feedback'));
    tap(r.host.querySelector('.break-button'));
    typeNumber(r.host, '7777');
    await until(() => r.host.querySelector('.break-retry'));
    typeNumber(r.host, '7777'); // wrong twice: teach moment, no malus
    await until(() => r.host.querySelector('.teach-done'));
    tap(r.host.querySelector('.teach-done'));
    await rightAnswer(r, box); // +2: 7 in total, under the day cap
    await until(() => r.host.querySelector('.break-summary'));
    tap(r.host.querySelector('.break-button'));
    await until(() => r.screens.current() === 'world');
    await vi.waitFor(async () => expect((await r.records.get('economy')).points).toBe(7));

    const eco = await r.records.get('economy');
    expect(eco).toMatchObject({ points: 7, practicePointsToday: 7 });
    const logs = createLogStore(r.db);
    const answers = await logs.listAnswers();
    expect(answers.length).toBe(7);
    expect(answers.every((a) => a.context === 'practice' && a.moduleId === REKENEN)).toBe(true);
    const ledger = await logs.listLedger();
    expect(ledger.map((l) => [l.delta, l.reason])).toEqual([[2, 'practice'], [2, 'practice'], [1, 'practice'], [2, 'practice']]);
    expect(await logs.listBreaks()).toHaveLength(0); // a practice round is not a break
    // The wrong first tries are saved in box 1, like in a break.
    const progress = await createProgressStore(r.db).list(REKENEN);
    expect(progress.length).toBeGreaterThanOrEqual(2);
  });

  it('never writes the saved session, so the boot can not resume it as a break', async () => {
    const r = await rig();
    const sessions = createSessionStore(r.db);
    const saved = { kind: 'break', sessionId: 'b1', marker: 'keep me' } as never;
    await sessions.save(saved);
    const { box } = await start(r);
    await skipLesson(r.host);
    await rightAnswer(r, box);
    await vi.waitFor(async () => expect((await r.records.get('economy')).points).toBe(2));
    expect(await sessions.load()).toEqual(saved);
  });

  it('stops earning at 10 plus points a day, shows the message, and the next day starts again (AC120)', async () => {
    const r = await rig({ points: 20, practicePointsToday: 10, practiceDay: '2026-10-17' });
    const { box } = await start(r);
    await skipLesson(r.host);
    typeNumber(r.host, answerOf(box));
    await until(() => r.host.querySelector('.break-feedback'));
    expect(r.host.textContent).toContain('Genoeg geoefend voor vandaag, ga lekker bouwen!');
    const text = r.host.querySelector('.feedback-text')?.textContent ?? '';
    expect(text).not.toContain('+');
    expect((await r.records.get('economy')).points).toBe(20);
    expect(await createLogStore(r.db).listLedger()).toHaveLength(0);
    // the round still works
    tap(r.host.querySelector('.break-button'));
    await until(() => r.host.querySelector('.number-view'));
  });

  it('the next calendar day the cap starts again (AC120)', async () => {
    const r = await rig({ points: 20, practicePointsToday: 10, practiceDay: '2026-10-17' }, DAY + 24 * 3600 * 1000);
    const { box } = await start(r);
    await skipLesson(r.host);
    typeNumber(r.host, answerOf(box));
    await until(() => r.host.querySelector('.break-feedback'));
    await vi.waitFor(async () => expect(await r.records.get('economy')).toMatchObject({ points: 22, practicePointsToday: 2, practiceDay: '2026-10-18' }));
  });

  it('Stoppen closes the round after its last save and keeps the points', async () => {
    // The pause menu re-reads the points itself when this screen closes (see pause-menu.test.ts).
    const r = await rig();
    const { box } = await start(r);
    await skipLesson(r.host);
    await rightAnswer(r, box);
    tap(r.host.querySelector('[data-practice="stop"]'));
    await vi.waitFor(() => expect(r.screens.current()).toBe('world'));
    expect((await r.records.get('economy')).points).toBe(2);
  });

  it('says so when nothing is switched on, and Stoppen leaves', async () => {
    const r = await rig();
    await r.records.put('switches', { modules: { [TAAL]: { on: false }, [REKENEN]: { on: false } } });
    openPractice(r.screens, r.env);
    await until(() => r.host.querySelector('.lesboek-note')?.textContent?.includes('Er staan geen vragen aan'));
    tap(r.host.querySelector('[data-practice="stop"]'));
    expect(r.screens.current()).toBe('world');
  });
});
