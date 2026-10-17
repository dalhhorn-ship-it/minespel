import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords, type Records } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import { createAudioUnlock } from '../platform/audio-unlock';
import { createSound } from '../audio/sound';
import { FakeAudioContext } from '../../tests/unit/fakes/audio-context';
import { createBreakFlow, type BreakEnv, type BreakFlow } from './break-flow';
import { createScreens, type Screens } from './screens';

const TAAL = 'cito-taalverzorging';
const REKENEN = 'rekenen-basis';

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

interface Rig {
  db: IDBDatabase;
  records: Records;
  host: HTMLElement;
  screens: Screens;
  calls: string[];
  flow: BreakFlow;
  env: BreakEnv;
  newFlow(): { flow: BreakFlow; host: HTMLElement; calls: string[]; screens: Screens };
}

async function rig(options: { storage?: boolean; taalOn?: boolean; rekenenOn?: boolean } = {}): Promise<Rig> {
  const db = await openDb({ name: `break-flow-${dbCount++}` });
  const records = createRecords(db);
  await records.put('switches', {
    modules: { [TAAL]: { on: options.taalOn ?? false }, [REKENEN]: { on: options.rekenenOn ?? true } },
  });
  const clock = createFakeClock(new Date(2026, 9, 17, 12, 0, 0).getTime());
  const env: BreakEnv =
    options.storage === false
      ? { db: null, records: null, queue: null, clock, rng: createRng(7) }
      : { db, records, queue: { flushNow: async () => undefined }, clock, rng: createRng(7) };
  const make = () => {
    const host = document.createElement('div');
    document.body.append(host);
    const screens = createScreens(host);
    const calls: string[] = [];
    const flow = createBreakFlow({
      screens,
      env,
      pauseWorld: () => calls.push('pause'),
      resumeWorld: () => calls.push('resume'),
      restartTimer: () => calls.push('restart'),
    });
    return { host, screens, calls, flow };
  };
  const first = make();
  return { db, records, env, ...first, newFlow: () => make() };
}

const until = (fn: () => unknown) => vi.waitFor(() => expect(fn()).toBeTruthy(), { timeout: 4000 });

/** Taps through the lesson pages until the questions start. */
async function skipLesson(host: HTMLElement): Promise<void> {
  await until(() => host.querySelector('.lesson-view'));
  for (let i = 0; i < 12 && host.querySelector('.lesson-view'); i++) tap(host.querySelector('.lesson-next'));
  await until(() => host.querySelector('.number-view'));
}

function typeNumber(host: HTMLElement, text: string): void {
  for (const ch of text.replace('.', ',')) {
    const key = [...host.querySelectorAll('.kb-char')].find((k) => k.textContent === ch);
    tap(key);
  }
  tap(host.querySelector('.kb-done'));
}

/** The question on screen, from the saved session. */
async function current(r: { flow: BreakFlow; db: IDBDatabase }) {
  await r.flow.settled();
  const saved = (await createSessionStore(r.db).load()) as unknown as {
    state: { index: number; try: number; phase: string; entries: Array<{ item: { id: string; answer: string[]; prompt: string } }> };
  };
  return { ...saved.state, item: saved.state.entries[saved.state.index]?.item };
}

async function right(r: Rig, host: HTMLElement = r.host): Promise<void> {
  const q = await current(r);
  typeNumber(host, q.item?.answer[0] ?? '');
  await until(() => host.querySelector('.break-feedback'));
  tap(host.querySelector('.break-button'));
}

/** A wrong answer, then the question comes again. */
async function wrongOnce(r: Rig, host: HTMLElement = r.host): Promise<void> {
  typeNumber(host, '7777');
  await until(() => host.querySelector('.break-retry'));
}

async function wrongTwice(r: Rig): Promise<void> {
  await wrongOnce(r);
  typeNumber(r.host, '7777');
  await until(() => r.host.querySelector('.teach-done'));
  tap(r.host.querySelector('.teach-done'));
}

beforeEach(() => {
  perf = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => (perf += 1000));
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('break flow', () => {
  it('plays a whole break: lesson first, saves, logs, points, boxes, back with a full timer', async () => {
    const r = await rig();
    r.flow.start();
    r.flow.start(); // safe to call twice
    expect(r.calls).toEqual(['pause']);
    expect(r.screens.current()).toBe('learn');
    expect(r.flow.isActive()).toBe(true);

    await skipLesson(r.host);
    expect(r.host.querySelectorAll('.break-dot').length).toBe(5);
    await right(r); // +2
    await wrongOnce(r);
    typeNumber(r.host, (await current(r)).item?.answer[0] ?? '');
    await until(() => r.host.querySelector('.break-feedback')); // right on the retry, +1
    tap(r.host.querySelector('.break-button'));
    await wrongTwice(r); // -1
    await right(r); // +2
    await right(r); // +2
    await until(() => r.host.querySelector('.break-summary'));
    expect(r.host.textContent).toContain('4 van de 5 goed!');
    tap(r.host.querySelector('.break-button'));
    await until(() => r.screens.current() === 'world');
    await r.flow.settled();

    expect(r.calls[0]).toBe('pause');
    expect(r.calls).toContain('restart');
    expect(r.calls).toContain('resume');
    expect(r.flow.isActive()).toBe(false);

    const logs = createLogStore(r.db);
    const answers = await logs.listAnswers();
    expect(answers.map((a) => [a.try, a.correct])).toEqual([[1, true], [1, false], [2, true], [1, false], [2, false], [1, true], [1, true]]);
    expect(answers[0]).toMatchObject({ context: 'break', moduleId: REKENEN, topic: 'optellen' });
    expect(answers[1]?.given).toBe('7777');
    const breaks = await logs.listBreaks();
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toMatchObject({ moduleId: REKENEN, n: 5, score: 4, points: 6, endedBy: 'done' });
    expect(breaks[0]?.firstAnswerMs).toHaveLength(5);
    const ledger = await logs.listLedger();
    expect(ledger.map((l) => [l.delta, l.reason])).toEqual([[2, 'break'], [1, 'break'], [-1, 'malus'], [2, 'break'], [2, 'break']]);
    expect((await r.records.get('economy')).points).toBe(6);

    // Generated sums are saved only when the first try was wrong, in box 1 with their level, topic and skill.
    const progress = await createProgressStore(r.db).list(REKENEN);
    expect(progress).toHaveLength(2);
    for (const p of progress) {
      expect(p).toMatchObject({ box: 1, topic: 'optellen', seen: 1 });
      expect(p.level).toMatch(/^[ME][67]$/);
      expect(p.skill).not.toBe('');
    }
    expect((await r.records.get('rotation')).lessonsSeen).toContain(`${REKENEN}/optellen`);
    expect(await createSessionStore(r.db).load()).toBeNull();
  });

  it('shows the lesson only the first time a topic gives new items', async () => {
    const r = await rig();
    await r.records.put('rotation', { weights: {}, topicPointers: {}, lessonsSeen: [`${REKENEN}/optellen`] });
    r.flow.start();
    await until(() => r.host.querySelector('.number-view'));
    expect(r.host.querySelector('.lesson-view')).toBeNull();
    r.flow.end();
  });

  it('resumes a saved break on the same question and the same try (AC37)', async () => {
    const r = await rig();
    r.flow.start();
    await skipLesson(r.host);
    await right(r);
    await wrongOnce(r);
    const before = await current(r);
    expect(before).toMatchObject({ index: 1, try: 2 });

    // The app is killed and opened again: a new flow finds the saved break.
    const again = r.newFlow();
    const flow2 = again.flow;
    flow2.start();
    await until(() => again.host.querySelector('.break-retry'));
    expect(again.calls).toEqual(['pause']);
    expect(again.host.querySelectorAll('.break-dot.done').length).toBe(1);
    expect(again.host.querySelector('.lesson-view')).toBeNull();
    expect(again.host.textContent).toContain(before.item?.prompt.replace(' = ?', '') ?? 'x');
    expect(await current({ flow: flow2, db: r.db })).toMatchObject({ index: 1, try: 2 });
    // It plays on to the end without asking anything twice.
    typeNumber(again.host, before.item?.answer[0] ?? '');
    await until(() => again.host.querySelector('.break-feedback'));
    tap(again.host.querySelector('.break-button'));
    expect((await current({ flow: flow2, db: r.db })).index).toBe(2);
    flow2.end();
    await flow2.settled();
    expect(await createSessionStore(r.db).load()).toBeNull();
  });

  it('a kill between steps never loses or doubles a log line, box, ledger line or points', async () => {
    const r = await rig();
    r.flow.start();
    await skipLesson(r.host);
    const logs = createLogStore(r.db);
    await right(r); // +2
    await r.flow.settled();
    const counts = async () => ({
      answers: (await logs.listAnswers()).length,
      ledger: (await logs.listLedger()).map((l) => l.delta),
      points: (await r.records.get('economy')).points,
      breaks: (await logs.listBreaks()).length,
    });
    expect(await counts()).toEqual({ answers: 1, ledger: [2], points: 2, breaks: 0 });

    // Killed and opened again, three times: opening writes nothing and pays nothing.
    for (let i = 0; i < 3; i++) {
      const again = r.newFlow();
      again.flow.start();
      await until(() => again.host.querySelector('.number-view'));
      await again.flow.settled();
      expect(await counts()).toEqual({ answers: 1, ledger: [2], points: 2, breaks: 0 });
    }
    // The resumed break goes on from question 2.
    const again = r.newFlow();
    again.flow.start();
    await until(() => again.host.querySelector('.number-view'));
    await right(r, again.host);
    await again.flow.settled();
    expect(await counts()).toEqual({ answers: 2, ledger: [2, 2], points: 4, breaks: 0 });
  });

  it('a resume on the summary writes the break log once, and none after the break is over', async () => {
    const r = await rig();
    r.flow.start();
    await skipLesson(r.host);
    for (let i = 0; i < 5; i++) await right(r);
    await until(() => r.host.querySelector('.break-summary'));
    await r.flow.settled();
    const logs = createLogStore(r.db);
    expect(await logs.listBreaks()).toHaveLength(0); // the break log comes with the last step
    expect((await createSessionStore(r.db).load())?.kind).toBe('break');

    // Killed on the summary: the new flow shows it again and the tap ends the break.
    const again = r.newFlow();
    again.flow.start();
    await until(() => again.host.querySelector('.break-summary'));
    await again.flow.settled();
    expect(await logs.listBreaks()).toHaveLength(0);
    tap(again.host.querySelector('.break-button'));
    await until(() => again.screens.current() === 'world');
    await again.flow.settled();
    expect(await logs.listBreaks()).toHaveLength(1);
    expect(await createSessionStore(r.db).load()).toBeNull();
    expect((await r.records.get('economy')).points).toBe(13); // 5 right answers and the perfect break bonus
    expect((await logs.listLedger()).map((l) => l.delta)).toEqual([2, 2, 2, 2, 2, 3]);

    // Killed again after the end: nothing to resume, no second log.
    const third = r.newFlow();
    third.flow.start();
    await until(() => third.host.querySelector('.lesson-view, .number-view'));
    await third.flow.settled();
    expect(await logs.listBreaks()).toHaveLength(1);
    third.flow.end();
  });

  it('a parent can end the break: open questions are logged "niet beantwoord" (AC95)', async () => {
    const r = await rig();
    r.flow.start();
    await skipLesson(r.host);
    await right(r);
    r.flow.parentEnd();
    await until(() => r.screens.current() === 'world');
    await r.flow.settled();
    const logs = createLogStore(r.db);
    const answers = await logs.listAnswers();
    expect(answers).toHaveLength(5);
    expect(answers.filter((a) => a.given === 'niet beantwoord')).toHaveLength(4);
    const b = (await logs.listBreaks())[0];
    expect(b).toMatchObject({ n: 5, score: 1, points: 2, endedBy: 'stopped' });
    expect(r.calls).toContain('restart');
    expect(await createSessionStore(r.db).load()).toBeNull();
    // Unanswered questions change no box.
    expect((await createProgressStore(r.db).list()).length).toBe(0);
  });

  it('a resumed break takes its points from the stored economy record, not the saved session', async () => {
    const r = await rig();
    const e0 = await r.records.get('economy');
    await r.records.put('economy', { ...e0, points: 25 });
    r.flow.start();
    await skipLesson(r.host);
    await right(r); // 27
    await r.flow.settled();
    expect((await r.records.get('economy')).points).toBe(27);
    // Something else (a purchase) lowers the points by 20 while the app is closed.
    await r.records.put('economy', { ...(await r.records.get('economy')), points: 7 });
    const again = r.newFlow();
    again.flow.start();
    await until(() => again.host.querySelector('.number-view'));
    await right(r, again.host); // +2
    await again.flow.settled();
    expect((await r.records.get('economy')).points).toBe(9);
    again.flow.end();
  });

  it('start() waits while a parent screen is on top and opens the break when it closes', async () => {
    const r = await rig();
    const closeParent = r.screens.open('parent', document.createElement('div'));
    r.flow.start();
    r.flow.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(r.calls).toEqual([]);
    expect(r.flow.isActive()).toBe(false);
    expect(r.host.querySelector('.break-host')).toBeNull();
    closeParent();
    expect(r.calls).toEqual(['pause']);
    expect(r.screens.current()).toBe('learn');
    await until(() => r.host.querySelector('.lesson-view, .number-view'));
    expect(r.host.querySelectorAll('.break-host')).toHaveLength(1);
    r.flow.end();
  });

  it('a parent end while the break is still loading is kept and applied when it mounts', async () => {
    const r = await rig();
    r.flow.start();
    r.flow.parentEnd(); // the questions are not there yet
    await until(() => r.screens.current() === 'world');
    await r.flow.settled();
    const logs = createLogStore(r.db);
    const answers = await logs.listAnswers();
    expect(answers).toHaveLength(5);
    expect(answers.every((a) => a.given === 'niet beantwoord')).toBe(true);
    expect((await logs.listBreaks())[0]).toMatchObject({ n: 5, score: 0, endedBy: 'stopped' });
    expect(r.calls).toContain('restart');
    expect(await createSessionStore(r.db).load()).toBeNull();
  });

  it('a parent end on the summary logs the break as done', async () => {
    const r = await rig();
    r.flow.start();
    await skipLesson(r.host);
    for (let i = 0; i < 5; i++) await right(r);
    await until(() => r.host.querySelector('.break-summary'));
    r.flow.parentEnd();
    await until(() => r.screens.current() === 'world');
    await r.flow.settled();
    const logs = createLogStore(r.db);
    expect(await logs.listBreaks()).toHaveLength(1);
    expect((await logs.listBreaks())[0]).toMatchObject({ n: 5, score: 5, endedBy: 'done' });
    expect((await logs.listAnswers()).filter((a) => a.given === 'niet beantwoord')).toHaveLength(0);
    expect(await createSessionStore(r.db).load()).toBeNull();
  });

  it('with nothing switched on it shows the friendly empty break and logs nothing (AC39)', async () => {
    const r = await rig({ rekenenOn: false, taalOn: false });
    r.flow.start();
    await until(() => r.host.querySelector('.break-empty'));
    expect(r.host.textContent).toContain('Er staan geen vragen aan');
    expect(r.screens.current()).toBe('learn');
    r.flow.end();
    await r.flow.settled();
    expect(r.screens.current()).toBe('world');
    expect(r.calls).toContain('restart');
    expect(await createLogStore(r.db).listBreaks()).toHaveLength(0);
    expect((await r.records.get('economy')).points).toBe(0);
    expect(await createSessionStore(r.db).load()).toBeNull();
  });

  it('asks Taal questions when only Taal is on, and the lesson comes first', async () => {
    const r = await rig({ taalOn: true, rekenenOn: false });
    r.flow.start();
    await until(() => r.host.querySelector('.lesson-view'));
    const saved = (await (async () => {
      await r.flow.settled();
      return createSessionStore(r.db).load();
    })()) as unknown as { moduleId: string; lessonTopic: string };
    expect(saved.moduleId).toBe(TAAL);
    expect(saved.lessonTopic).toBeTruthy();
    expect((await r.records.get('rotation')).lessonsSeen).toContain(`${TAAL}/${saved.lessonTopic}`);
    r.flow.end();
  });

  it('keeps at most 200 saved sums per topic, dropping the oldest (AC126)', async () => {
    const r = await rig();
    const progress = createProgressStore(r.db);
    for (let i = 1; i <= 200; i++) {
      // Mixed boxes and due days. The oldest saved sums (small i) sit in high boxes with far away due days,
      // the newest sit in box 1 and are due soon. Due day order is the reverse of added order.
      const box = 1 + (i % 5);
      const due = `2030-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`;
      await progress.put({ moduleId: REKENEN, itemId: `optellen:1+${i}`, box, due: i > 100 ? '2020-01-01' : due, level: 'M6', topic: 'optellen', skill: 's', seen: 1, added: 1000 + i });
    }
    await r.records.put('rotation', { weights: {}, topicPointers: {}, lessonsSeen: [`${REKENEN}/optellen`] });
    r.flow.start();
    await until(() => r.host.querySelector('.number-view'));
    for (let i = 0; i < 5; i++) await wrongTwice(r);
    await until(() => r.host.querySelector('.break-summary'));
    await r.flow.settled();
    const saved = (await progress.list(REKENEN)).filter((p) => p.topic === 'optellen');
    expect(saved).toHaveLength(200);
    expect(saved.filter((p) => p.due === '2026-10-17').length).toBe(5);
    // the 5 oldest by added (1..5) are gone, even though they are in high boxes
    for (let i = 1; i <= 5; i++) expect(saved.some((p) => p.itemId === `optellen:1+${i}`)).toBe(false);
    for (let i = 6; i <= 200; i++) expect(saved.some((p) => p.itemId === `optellen:1+${i}`)).toBe(true);
    r.flow.end();
  });

  it('three breaks in a row use one app wide Sound and so one AudioContext (decision 46)', async () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const made: FakeAudioContext[] = [];
    const sound = createSound({
      unlock,
      createContext: () => {
        const c = new FakeAudioContext();
        made.push(c);
        return c as unknown as AudioContext;
      },
    });
    const r = await rig();
    r.env.sound = sound;
    expect(made).toHaveLength(0); // nothing before the first tap (AC100)
    target.dispatchEvent(new Event('pointerup'));
    for (let i = 0; i < 3; i++) {
      r.flow.start();
      await until(() => r.host.querySelector('.lesson-view, .number-view'));
      if (r.host.querySelector('.lesson-view')) await skipLesson(r.host);
      const before = made[0]?.started ?? 0;
      await right(r);
      expect(made[0]!.started).toBeGreaterThan(before); // the chime played
      r.flow.end();
      await r.flow.settled();
      expect(r.flow.isActive()).toBe(false);
    }
    expect(made).toHaveLength(1);
  });

  it('a break is silent when the app Sound is off in the settings (AC99)', async () => {
    const target = new EventTarget();
    const unlock = createAudioUnlock(target);
    const made: FakeAudioContext[] = [];
    const sound = createSound({
      unlock,
      enabled: false,
      createContext: () => {
        const c = new FakeAudioContext();
        made.push(c);
        return c as unknown as AudioContext;
      },
    });
    const r = await rig();
    r.env.sound = sound;
    target.dispatchEvent(new Event('pointerup'));
    r.flow.start();
    await skipLesson(r.host);
    await right(r);
    expect(made).toHaveLength(0);
  });

  it('still plays when storage is not available', async () => {
    const r = await rig({ storage: false });
    r.flow.start();
    await skipLesson(r.host);
    expect(r.host.querySelector('.number-view')).not.toBeNull();
    r.flow.end();
    expect(r.calls).toEqual(['pause', 'restart', 'resume']);
    expect(r.screens.current()).toBe('world');
    expect(r.flow.isActive()).toBe(false);
    r.flow.end();
    expect(r.calls.length).toBe(3);
  });

  it('end() before the questions are loaded cancels the break cleanly', async () => {
    const r = await rig();
    r.flow.start();
    r.flow.end();
    await r.flow.settled();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(r.flow.isActive()).toBe(false);
    expect(r.host.querySelector('.break-screen')).toBeNull();
    expect(r.calls.filter((c) => c === 'restart')).toHaveLength(1);
  });
});
