import { describe, expect, it, vi } from 'vitest';
import { createSound } from '../audio/sound';
import { createAudioUnlock } from '../platform/audio-unlock';
import { bootSave, type WorldSave } from '../game/world-save';
import { openDb } from '../storage/db';
import { createRecords } from '../storage/records';
import { createSaveQueue } from '../storage/save-queue';
import { FakeAudioContext } from '../../tests/unit/fakes/audio-context';
import { createAppEnv } from './app-env';
import { createScreens } from './screens';
import { startPlayTimer } from './timer-driver';

let dbCount = 0;
const game = { pause: () => undefined, resume: () => undefined };
const noWorldSave = (restore: () => Promise<void>): WorldSave => ({ restore, start: () => () => undefined, cancel: () => undefined });

function parts() {
  const target = new EventTarget();
  const audio = createAudioUnlock(target);
  const made: FakeAudioContext[] = [];
  const sound = createSound({
    unlock: audio,
    enabled: false,
    createContext: () => {
      const c = new FakeAudioContext();
      made.push(c);
      return c as unknown as AudioContext;
    },
  });
  return { target, made, sound, host: createAppEnv({ sound, audio, dinos: {} as never }) };
}

describe('app env', () => {
  it('is safe before anything joins: no storage, not saving, no break', () => {
    const { host } = parts();
    const { env } = host;
    expect([env.db, env.records, env.queue, env.saving, env.breaks.isActive()]).toEqual([null, null, null, false, false]);
    env.breaks.start();
    env.breaks.parentEnd();
    env.timer.applySettings({ breakEveryMinutes: 5, breakWarningEnabled: true });
  });

  it('forwards to the break flow and the timer once they are bound', () => {
    const { host } = parts();
    const flow = { start: vi.fn(), parentEnd: vi.fn(), isActive: () => true };
    const timer = { applySettings: vi.fn() };
    host.bindBreaks(flow);
    host.bindTimer(timer);
    host.env.breaks.start();
    host.env.breaks.parentEnd();
    host.env.timer.applySettings({ breakEveryMinutes: 10, breakWarningEnabled: false });
    expect(host.env.breaks.isActive()).toBe(true);
    expect(flow.start).toHaveBeenCalledOnce();
    expect(flow.parentEnd).toHaveBeenCalledOnce();
    expect(timer.applySettings).toHaveBeenCalledWith({ breakEveryMinutes: 10, breakWarningEnabled: false });
  });

  it('saving is on after a good boot', async () => {
    const { host } = parts();
    const db = await openDb({ name: `app-env-${dbCount++}` });
    const result = await bootSave({
      game,
      create: async () => {
        host.setStorage({ db, records: createRecords(db), queue: createSaveQueue({ db }) });
        return noWorldSave(async () => undefined);
      },
    });
    host.finishBoot(result);
    expect(host.env.saving).toBe(true);
    expect(host.env.db).toBe(db);
  });

  it('saving stays off after a boot timeout, even when the storage opens later', async () => {
    const { host } = parts();
    const db = await openDb({ name: `app-env-${dbCount++}` });
    const result = await bootSave({
      game,
      timeoutMs: 20,
      create: async () => {
        host.setStorage({ db, records: createRecords(db), queue: createSaveQueue({ db }) });
        return noWorldSave(() => new Promise<void>(() => undefined)); // the restore never ends
      },
    });
    expect(result).toBe('not-saving');
    host.finishBoot(result);
    expect(host.env.saving).toBe(false);
    host.setStorage({ db, records: createRecords(db), queue: createSaveQueue({ db }) });
    host.finishBoot(result);
    expect(host.env.saving).toBe(false);
  });

  it('saving stays off when the boot gave no storage', () => {
    const { host } = parts();
    host.finishBoot('saving');
    expect(host.env.saving).toBe(false);
  });
});

describe('the app wide sound follows the settings (AC99, AC100)', () => {
  async function timerRig(settings: { soundEffectsEnabled: boolean; volume: number }) {
    const p = parts();
    const db = await openDb({ name: `app-env-${dbCount++}` });
    const records = createRecords(db);
    await records.put('settings', { ...(await records.get('settings')), ...settings });
    p.host.setStorage({ db, records, queue: createSaveQueue({ db }) });
    const slot = document.createElement('div');
    const t = await startPlayTimer({
      game: { ...game, hud: { countdownSlot: slot } } as never,
      screens: createScreens(document.createElement('div')),
      guard: { subscribe: () => () => undefined },
      env: p.host.env,
    });
    return { ...p, t };
  }

  it('sound off in the settings keeps every sound silent, also after a tap', async () => {
    const { target, made, sound, t } = await timerRig({ soundEffectsEnabled: false, volume: 0.4 });
    target.dispatchEvent(new Event('pointerup'));
    for (const n of ['pop', 'thunk', 'chime', 'tick'] as const) sound.play(n);
    expect(sound.isEnabled()).toBe(false);
    expect(sound.getVolume()).toBeCloseTo(0.4);
    expect(made).toHaveLength(0);
    t.driver.stop();
  });

  it('sound on plays only after the first tap, with the saved volume', async () => {
    const { target, made, sound, t } = await timerRig({ soundEffectsEnabled: true, volume: 0.3 });
    sound.play('pop');
    expect(made).toHaveLength(0);
    target.dispatchEvent(new Event('pointerup'));
    sound.play('pop');
    expect(made).toHaveLength(1);
    expect(made[0]!.started).toBeGreaterThan(0);
    expect(sound.getVolume()).toBeCloseTo(0.3);
    t.driver.stop();
  });
});
