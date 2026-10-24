// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReadyGate, READY_SLOW_MS } from './boot';
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
