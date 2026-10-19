// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCatalog } from '../content/catalog';
import { APP_NAME, FORMAT_VERSION, type ChoiceItem, type ModuleBundle } from '../content/format';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import { SHOP_DINO_IDS } from '../dinos/kinds';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import { createExamFlow, type ExamFlow } from './exam-flow';
import { resumeSessionIfAny } from './resume';
import { createScreenManager } from './screens';
import { createTimerDriver } from './timer-driver';

const choice = (i: number): ChoiceItem => ({
  id: `c${i}`,
  type: 'choice',
  level: 'M6',
  skill: 's',
  prompt: `Vraag ${i}`,
  explain: `Uitleg ${i}`,
  options: ['goed', 'fout'],
  answer: 0,
});

function bundle(count: number): ModuleBundle {
  const items = Array.from({ length: 8 }, (_, i) => choice(i));
  return {
    app: APP_NAME,
    kind: 'module',
    formatVersion: FORMAT_VERSION,
    createdAt: '2026-10-19T00:00:00.000Z',
    module: {
      id: 'fix',
      title: 'Fix',
      subject: 'taal',
      version: 1,
      language: 'nl',
      levels: ['M6'],
      topics: ['a', 'b'],
      exams: [
        { id: 'ex', title: 'Fix examen', levels: ['M6'], questionCount: count, timeLimitMinutes: 10, passPercent: 70, mix: { a: 1, b: 1 } },
      ],
    },
    topics: [
      { id: 'a', title: 'A', groups: [6], lesson: { pages: [] }, items: items.slice(0, 4) },
      { id: 'b', title: 'B', groups: [6], lesson: { pages: [] }, items: items.slice(4) },
    ],
  };
}

function tap(target: Element | null | undefined) {
  if (!target) throw new Error('nothing to tap');
  const ev = (type: string) => {
    const e = new MouseEvent(type, { bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    return e;
  };
  target.dispatchEvent(ev('pointerdown'));
  target.dispatchEvent(ev('pointerup'));
}

async function setup(opts: { addEgg?: () => Promise<unknown>; dbName?: string; count?: number } = {}) {
  const db = await openDb({ name: opts.dbName ?? `exam-flow-${Math.random()}` });
  const records = createRecords(db);
  const progressStore = createProgressStore(db);
  const logStore = createLogStore(db);
  const sessionStore = createSessionStore(db);
  const clock = createFakeClock(new Date('2026-10-19T10:00:00Z').getTime());
  const host = document.createElement('div');
  document.body.append(host);
  const screens = createScreenManager({ host });
  const guard = {
    state: () => ({ portrait: false, tooSmall: false }),
    subscribe(fn: (s: { portrait: boolean; tooSmall: boolean }) => void) {
      fn({ portrait: false, tooSmall: false });
      return () => undefined;
    },
  };
  const onBreakDue = vi.fn();
  const timerDriver = createTimerDriver({
    clock,
    screens,
    guard,
    records,
    initialBreakEveryMinutes: 5,
    initialPlayMsLeft: null,
    initialWarningEnabled: false,
    onBreakDue,
    autoStartInterval: false,
  });
  const resetSpy = vi.spyOn(timerDriver, 'resetPlayTimer');
  const addEgg = vi.fn(opts.addEgg ?? (() => Promise.resolve({})));
  const onLock = vi.fn();
  const make = (): ExamFlow =>
    createExamFlow({
      clock,
      rng: createRng(5),
      screens,
      records,
      progressStore,
      logStore,
      sessionStore,
      timerDriver,
      dinoStore: { addEgg } as never,
      getCatalog: () => createCatalog([bundle(opts.count ?? 4)]),
      onLock,
    });
  return { db, records, progressStore, logStore, sessionStore, screens, timerDriver, resetSpy, addEgg, onLock, onBreakDue, host, make };
}

const q = (id: string) => document.querySelector(`[data-testid="${id}"]`);
const options = () => Array.from(document.querySelectorAll('.q-option'));

async function answer(right: boolean, number: number) {
  await vi.waitFor(() => expect(q('exam-number')?.textContent).toBe(`Vraag ${number} van 4`));
  tap(options()[right ? 0 : 1]);
}

async function runExam(flow: ExamFlow, rights: boolean[]) {
  await flow.start('fix', 'ex', 11);
  tap(q('exam-begin'));
  for (let i = 0; i < rights.length; i++) await answer(rights[i] as boolean, i + 1);
}

describe('exam flow (T51b)', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('plan maps planExam to wanted and real', async () => {
    const env = await setup({ count: 6 });
    expect(env.make().plan('fix', 'ex')).toEqual({ wanted: 6, real: 6 });
    expect(env.make().plan('fix', 'nope')).toEqual({ wanted: 0, real: 0 });
  });

  it('AC65, AC68, AC69: a pass logs answers and boxes, saves the record, gives one golden egg, points never change', async () => {
    const env = await setup();
    await env.records.put('economy', { points: 37, practicePointsToday: 0, practiceDay: '' });
    const flow = env.make();
    await flow.start('fix', 'ex', 11);
    expect(env.screens.current()).toBe('exam');
    expect(q('exam-begin')).not.toBeNull();
    expect(document.body.textContent).toContain('Examen: 4 vragen, 10 minuten');
    expect(document.querySelector('[data-testid="parent-controls-btn"]')).toBeNull();

    tap(q('exam-begin'));
    await answer(true, 1);
    // No feedback after an answer: no right or wrong text, next question just shows.
    await vi.waitFor(() => expect(q('exam-number')?.textContent).toBe('Vraag 2 van 4'));
    expect(document.body.textContent).not.toMatch(/Goed gedaan|Fout|Helaas/);
    expect(q('parent-controls-btn')).not.toBeNull();
    await answer(true, 2);
    await answer(false, 3);
    await answer(true, 4);

    await vi.waitFor(() => expect(q('exam-result')?.textContent).toBe('Geslaagd!'));
    expect(q('exam-score')?.textContent).toBe('Je score: 3 van 4');
    expect((await env.records.get('economy')).points).toBe(37);
    expect(env.addEgg).toHaveBeenCalledTimes(1);
    const [kind, golden] = env.addEgg.mock.calls[0] as unknown as [string, boolean];
    expect(SHOP_DINO_IDS as readonly string[]).toContain(kind);
    expect(golden).toBe(true);

    const exams = await env.logStore.listExams();
    expect(exams).toHaveLength(1);
    expect(exams[0]).toMatchObject({ moduleId: 'fix', examId: 'ex', score: 3, passed: true, status: 'done' });
    expect(exams[0]?.questions).toHaveLength(4);
    const answers = await env.logStore.listAnswers();
    expect(answers).toHaveLength(4);
    expect(answers.every((a) => a.context === 'exam' && a.try === 1)).toBe(true);
    expect((await env.progressStore.list('fix')).length).toBe(4);
    expect((await env.sessionStore.load())?.['phase']).toBe('end');

    // Terug naar de wereld: session gone, world on screen, play timer reset to full.
    tap(q('exam-leave'));
    await vi.waitFor(() => expect(env.screens.current()).toBe('world'));
    expect(await env.sessionStore.load()).toBeNull();
    expect(env.resetSpy).toHaveBeenCalled();
    expect(flow.isActive()).toBe(false);
    expect(env.addEgg).toHaveBeenCalledTimes(1);
  });

  it('AC68: a fail shows Goed geoefend and gives no egg', async () => {
    const env = await setup();
    await runExam(env.make(), [true, false, false, false]);
    await vi.waitFor(() => expect(q('exam-result')?.textContent).toBe('Goed geoefend!'));
    expect(env.addEgg).not.toHaveBeenCalled();
    const exams = await env.logStore.listExams();
    expect(exams[0]).toMatchObject({ score: 1, passed: false, status: 'done' });
  });

  it('AC66: the play timer does not count and no break is due during an exam', async () => {
    const env = await setup();
    await env.make().start('fix', 'ex', 11);
    const before = env.timerDriver.remainingPlayMs();
    env.timerDriver.advancePlayMs(60_000);
    expect(env.timerDriver.isPlayRunning()).toBe(false);
    expect(env.timerDriver.remainingPlayMs()).toBe(before);
    expect(env.onBreakDue).not.toHaveBeenCalled();
  });

  it('AC67: time out ends the exam, open questions are wrong and get no box', async () => {
    const env = await setup();
    const flow = env.make();
    await flow.start('fix', 'ex', 11);
    tap(q('exam-begin'));
    await answer(true, 1);
    await vi.waitFor(() => expect(q('exam-number')?.textContent).toBe('Vraag 2 van 4'));
    await vi.waitFor(() => expect(env.timerDriver.remainingExamMs()).toBe(600_000));
    env.timerDriver.advanceExamMs(600_000, true);
    await vi.waitFor(() => expect(q('exam-result')).not.toBeNull());
    expect(q('exam-result')?.textContent).toBe('Goed geoefend!');
    expect(q('exam-score')?.textContent).toBe('Je score: 1 van 4');
    const exams = await env.logStore.listExams();
    expect(exams[0]?.questions.filter((x) => x.given === 'niet beantwoord')).toHaveLength(3);
    expect((await env.progressStore.list('fix')).length).toBe(1);
    expect(env.timerDriver.remainingExamMs()).toBeNull();
  });

  it('AC70: stop saves gestopt, no egg, no end screen, world with a full play timer', async () => {
    const env = await setup();
    const flow = env.make();
    await runExam(flow, [true, true]);
    await vi.waitFor(() => expect(q('exam-number')?.textContent).toBe('Vraag 3 van 4'));
    await flow.stop();
    expect(env.screens.current()).toBe('world');
    expect(q('exam-result')).toBeNull();
    expect(flow.isActive()).toBe(false);
    expect(env.addEgg).not.toHaveBeenCalled();
    expect(await env.sessionStore.load()).toBeNull();
    expect(env.resetSpy).toHaveBeenCalled();
    const exams = await env.logStore.listExams();
    expect(exams).toHaveLength(1);
    expect(exams[0]).toMatchObject({ status: 'gestopt', passed: false, score: 2 });
  });

  it('AC71: resumes on the question with the saved time left', async () => {
    const env = await setup();
    const flow = env.make();
    await runExam(flow, [true, true]);
    await vi.waitFor(() => expect(q('exam-number')?.textContent).toBe('Vraag 3 van 4'));
    env.timerDriver.advanceExamMs(120_000, true);
    await env.timerDriver.flush();
    flow.destroy();
    env.screens.showWorld();

    const saved = await env.sessionStore.load();
    const second = env.make();
    expect(await second.resumeExam(saved as never)).toBe(true);
    expect(q('exam-number')?.textContent).toBe('Vraag 3 van 4');
    expect(env.timerDriver.remainingExamMs()).toBe(480_000);
    expect(q('exam-clock')?.textContent).toBe('Tijd over: 8:00');
  });

  it('AC68: the egg is given once even when the app was killed before it was saved', async () => {
    let first = true;
    const env = await setup({
      addEgg: () => {
        if (first) {
          first = false;
          return Promise.reject(new Error('killed'));
        }
        return Promise.resolve({});
      },
    });
    await runExam(env.make(), [true, true, true, true]);
    await vi.waitFor(() => expect(env.addEgg).toHaveBeenCalledTimes(1));
    await vi.waitFor(async () => expect((await env.sessionStore.load())?.['phase']).toBe('end'));
    expect((await env.sessionStore.load())?.['eggGiven']).toBe(false);

    const resumed = env.make();
    await resumed.resumeExam((await env.sessionStore.load()) as never);
    await vi.waitFor(() => expect(env.addEgg).toHaveBeenCalledTimes(2));
    await vi.waitFor(async () => expect((await env.sessionStore.load())?.['eggGiven']).toBe(true));
    expect(await env.logStore.listExams()).toHaveLength(1);

    resumed.destroy();
    const again = env.make();
    await again.resumeExam((await env.sessionStore.load()) as never);
    await vi.waitFor(() => expect(q('exam-result')?.textContent).toBe('Geslaagd!'));
    await env.timerDriver.flush();
    expect(env.addEgg).toHaveBeenCalledTimes(2);
    expect(await env.logStore.listExams()).toHaveLength(1);
  });

  it('AC153: the review is saved as review and reopens on the end screen', async () => {
    const env = await setup();
    await runExam(env.make(), [true, false, false, true]);
    await vi.waitFor(() => expect(q('exam-review-open')).not.toBeNull());
    tap(q('exam-review-open'));
    await vi.waitFor(async () => expect((await env.sessionStore.load())?.['phase']).toBe('review'));
    expect(document.body.textContent).toContain('Uitleg');

    const saved = await env.sessionStore.load();
    document.body.replaceChildren();
    const env2 = await setup();
    const flow = env2.make();
    await flow.resumeExam(saved as never);
    expect(q('exam-result')).not.toBeNull();
    expect(q('exam-review-open')).not.toBeNull();
  });

  it('resume.ts: a saved exam resumes before any break, even with an empty play timer', async () => {
    const env = await setup();
    const flow = env.make();
    await flow.start('fix', 'ex', 11);
    await env.records.put('timers', { playMsLeft: 0, examMsLeft: null });
    const startBreak = vi.fn();
    const result = await resumeSessionIfAny({
      sessionStore: env.sessionStore,
      records: env.records,
      breakFlow: { startBreak } as never,
      examFlow: env.make(),
    });
    expect(result).toBe('exam');
    expect(startBreak).not.toHaveBeenCalled();
    expect(q('exam-begin')).not.toBeNull();
  });

  it('resume.ts: an unusable exam save is cleared', async () => {
    const env = await setup();
    await env.sessionStore.save({ kind: 'exam', junk: true });
    const result = await resumeSessionIfAny({
      sessionStore: env.sessionStore,
      records: env.records,
      breakFlow: { startBreak: vi.fn() } as never,
      examFlow: env.make(),
    });
    expect(result).toBeNull();
    expect(await env.sessionStore.load()).toBeNull();
  });

  it('the lock on the question screen calls onLock', async () => {
    const env = await setup();
    await env.make().start('fix', 'ex', 11);
    tap(q('exam-begin'));
    await vi.waitFor(() => expect(q('parent-controls-btn')).not.toBeNull());
    tap(q('parent-controls-btn'));
    expect(env.onLock).toHaveBeenCalledTimes(1);
  });
});
