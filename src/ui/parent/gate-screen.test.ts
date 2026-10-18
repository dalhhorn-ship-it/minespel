// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../../core/clock';
import { createRng } from '../../core/rng';
import { hasPin } from '../../gate/pin';
import { makeResetQuestion } from '../../gate/reset-question';
import { defaultKv, type GateRecord } from '../../storage/schema';
import { createGateScreen } from './gate-screen';

function tap(el: Element | null | undefined) {
  if (!el) throw new Error('missing element');
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

function setup(forceSetPin = false) {
  const clock = createFakeClock(new Date('2026-10-18T10:00:00Z').getTime());
  const store: { gate: GateRecord } = { gate: defaultKv('gate') as GateRecord };
  const records = {
    get: async () => store.gate,
    put: async (_k: string, v: GateRecord) => {
      store.gate = v;
    },
  } as never;
  let unlocked = 0;
  const screen = createGateScreen({
    records,
    clock,
    rng: createRng(7),
    initialRecord: store.gate,
    forceSetPin,
    onUnlocked: () => unlocked++,
    onCancel: () => undefined,
  });
  const host = document.createElement('div');
  host.append(screen.element);
  const answerQuestion = async (text: string) => {
    const input = host.querySelector<HTMLInputElement>('input.parent-input')!;
    input.value = text;
    tap(host.querySelector('.parent-btn-primary'));
    await new Promise((r) => setTimeout(r, 10));
  };
  const pin = async (digits: string) => {
    for (const d of digits) {
      tap(host.querySelector(`[data-key="${d}"]`));
      clock.advance(300);
    }
    await new Promise((r) => setTimeout(r, 10));
  };
  return { host, store, clock, answerQuestion, pin, unlocked: () => unlocked };
}

// The question the gate shows first comes from the same rng seed.
const firstQuestion = makeResetQuestion(createRng(7));

describe('first PIN needs a grown up answer (decision 52)', () => {
  it('shows the sum first, no PIN pad, and sets nothing before it is right', async () => {
    const t = setup();
    expect(t.host.textContent).toContain(firstQuestion.text);
    expect(t.host.querySelector('[data-key="1"]')).toBeNull();
    await t.answerQuestion('0');
    expect(t.unlocked()).toBe(0);
    expect(hasPin(t.store.gate)).toBe(false);
  });

  it('a right answer lets the parent choose and confirm the PIN', async () => {
    const t = setup();
    await t.answerQuestion(String(firstQuestion.answer));
    expect(t.host.textContent).toContain('Kies een pincode');
    await t.pin('1234');
    expect(t.host.textContent).toContain('nog een keer');
    expect(t.unlocked()).toBe(0);
    await t.pin('1234');
    expect(t.unlocked()).toBe(1);
    expect(hasPin(t.store.gate)).toBe(true);
  });

  it('a different second PIN starts over without saving', async () => {
    const t = setup();
    await t.answerQuestion(String(firstQuestion.answer));
    await t.pin('1234');
    await t.pin('4321');
    expect(t.host.textContent).toContain('niet hetzelfde');
    expect(t.unlocked()).toBe(0);
    expect(hasPin(t.store.gate)).toBe(false);
  });

  it('two wrong answers lock out for 10 minutes, even with the right answer, like PIN vergeten', async () => {
    const t = setup();
    await t.answerQuestion('0');
    await t.answerQuestion('0');
    expect(t.host.textContent).toContain('Te vaak fout');
    expect(t.store.gate.blockedUntil).toBeGreaterThan(t.clock.now());
    // The new question is different, so just prove the old right answer does not open it.
    await t.answerQuestion(String(firstQuestion.answer));
    expect(t.host.textContent).not.toContain('Kies een pincode');
    expect(t.unlocked()).toBe(0);
    t.clock.advance(10 * 60 * 1000 + 1000);
    expect(t.clock.now()).toBeGreaterThan(t.store.gate.blockedUntil);
  });

  it('changing the PIN from Instellingen (already unlocked) skips the sum', () => {
    const t = setup(true);
    expect(t.host.querySelector('[data-key="1"]')).not.toBeNull();
    expect(t.host.querySelector('input.parent-input')).toBeNull();
  });
});
