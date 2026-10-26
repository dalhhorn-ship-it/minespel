// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCountdownView } from '../ui/countdown';
import { createRng } from '../core/rng';
import type { Game } from '../game/game';
import mainSource from '../main.ts?raw';
import { createBoot, createReadyGate, READY_SLOW_MS } from './boot';
import { createScreenManager } from './screens';
import { FAILED_TEXT, WAITING_TEXT } from '../ui/waiting-card';

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const back = vi.fn();
  const gate = createReadyGate({
    show: (node) => host.replaceChildren(node),
    hide: () => host.replaceChildren(),
    back,
  });
  const text = () => host.querySelector('[data-testid="waiting-text"]')?.textContent;
  const backBtn = () => host.querySelector('[data-testid="waiting-back"]') as HTMLElement;
  return { gate, host, back, text, backBtn };
}

describe('whenReady (R1b, decision 83)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('AC163: when ready the action runs at once and no card shows', () => {
    const t = setup();
    t.gate.markReady();
    const action = vi.fn();
    t.gate.whenReady(action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(t.host.children.length).toBe(0);
  });

  it('not ready shows the card, then the action runs once on ready and the card goes', () => {
    const t = setup();
    const action = vi.fn();
    t.gate.whenReady(action);
    expect(action).not.toHaveBeenCalled();
    expect(t.text()).toBe(WAITING_TEXT);
    t.gate.markReady();
    expect(action).toHaveBeenCalledTimes(1);
    expect(t.host.children.length).toBe(0);
  });

  it('two taps before ready run the action once', () => {
    const t = setup();
    const action = vi.fn();
    t.gate.whenReady(action);
    t.gate.whenReady(action);
    expect(t.host.querySelectorAll('[data-testid="waiting-card"]').length).toBe(1);
    t.gate.markReady();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('Terug before ready closes the card and the action never runs', () => {
    const t = setup();
    const action = vi.fn();
    t.gate.whenReady(action);
    tap(t.backBtn());
    expect(t.back).toHaveBeenCalledTimes(1);
    expect(t.host.children.length).toBe(0);
    t.gate.markReady();
    expect(action).not.toHaveBeenCalled();
  });

  it('a failed boot says the game cannot load and never runs the action', async () => {
    const t = setup();
    const action = vi.fn();
    t.gate.whenReady(action);
    t.gate.markFailed();
    expect(t.text()).toBe(FAILED_TEXT);
    await expect(t.gate.ready).rejects.toThrow();
    expect(action).not.toHaveBeenCalled();
    // A later tap shows the failure text at once.
    tap(t.backBtn());
    t.gate.whenReady(action);
    expect(t.text()).toBe(FAILED_TEXT);
    expect(action).not.toHaveBeenCalled();
  });

  it('after READY_SLOW_MS the card text changes, and the action still runs if the app gets ready', () => {
    const t = setup();
    const action = vi.fn();
    t.gate.whenReady(action);
    vi.advanceTimersByTime(READY_SLOW_MS - 1);
    expect(t.text()).toBe(WAITING_TEXT);
    vi.advanceTimersByTime(1);
    expect(t.text()).toBe(FAILED_TEXT);
    t.gate.markReady();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('a tap after the slow limit shows the failure text at once', () => {
    const t = setup();
    vi.advanceTimersByTime(READY_SLOW_MS);
    t.gate.whenReady(vi.fn());
    expect(t.text()).toBe(FAILED_TEXT);
  });

  it('the slow timer is cleared when ready', () => {
    const t = setup();
    t.gate.markReady();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// A game that answers every call with a harmless fake: the flows only touch it later.
function fakeGame(): Game {
  const fn = (): unknown => new Proxy(vi.fn(() => fn()), { get: (t, k) => (k in t ? Reflect.get(t, k) : fn()) });
  return new Proxy({}, { get: (_t, k) => (k === 'isRunning' ? () => false : fn()) }) as unknown as Game;
}

function bootDeps(game: Game | null) {
  const host = document.createElement('div');
  document.body.append(host);
  return {
    host,
    deps: {
      screens: createScreenManager({ host, onWorldActiveChange: () => {} }),
      game,
      guard: { state: () => ({ portrait: false, tooSmall: false }), subscribe: () => () => {} } as never,
      sound: new Proxy({}, { get: () => () => {} }) as never,
      rng: createRng(1),
      countdownView: createCountdownView({}),
    },
  };
}

describe('createBoot (R2a)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('R2a: the ready promise resolves with an App that has every flow', async () => {
    const { deps } = bootDeps(fakeGame());
    const boot = createBoot(deps);
    expect(boot.current()).toBeUndefined();
    await boot.create();
    const app = await boot.app;
    expect(boot.current()).toBe(app);
    expect(boot.gate.isReady()).toBe(true);
    for (const key of [
      'queue', 'records', 'timerDriver', 'breakFlow', 'parentFlow', 'shopFlow', 'practiceFlow', 'examFlow', 'villageFlow',
    ] as const) {
      expect(app[key], key).toBeTruthy();
    }
    expect(typeof app.catalog().modules).not.toBe('undefined');
    const action = vi.fn();
    boot.whenApp(action);
    expect(action).toHaveBeenCalledWith(app);
  });

  it('R2a: a storage that cannot open shows the cannot-load text and rejects the app', async () => {
    const db = await import('../storage/db');
    vi.spyOn(db, 'openDb').mockRejectedValue(new Error('no storage'));
    const { deps, host } = bootDeps(fakeGame());
    const boot = createBoot(deps);
    await expect(boot.create()).rejects.toThrow('no storage');
    await expect(boot.app).rejects.toThrow('no storage');
    boot.whenApp(() => {});
    expect(host.querySelector('[data-testid="waiting-text"]')?.textContent).toBe(FAILED_TEXT);
  });

  it('R2a: without a game boot fails at once', async () => {
    const boot = createBoot(bootDeps(null).deps);
    await expect(boot.create()).rejects.toThrow();
    expect(boot.gate.isReady()).toBe(false);
  });
});

describe('main.ts shape (R2a)', () => {
  const main: string = mainSource;
  it('R2a: main.ts is under 250 lines', () => {
    expect(main.split('\n').length).toBeLessThan(250);
  });
  it('R2a: main.ts has no registerHook and registers app hooks only inside __E2E__', () => {
    expect(main).not.toMatch(/registerHook\(/);
    expect(main).toMatch(/if \(__E2E__\) \{\s*registerAppHooks\(/);
  });
  it('R2a: main.ts has no nullable flow variables', () => {
    expect(main).not.toMatch(
      /\b(breakFlow|parentFlow|shopFlow|practiceFlow|examFlow|villageFlow|timerDriver|records|queue)\b[^\n=]*\| null/,
    );
    expect(main).not.toMatch(/waitingShop|shopFlowReady/);
  });
});
