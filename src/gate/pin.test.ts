import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createRng } from '../core/rng';
import { KV_DEFAULTS } from '../storage/schema';
import {
  blockMsLeft, checkPin, checkResetAnswer, hashPin, hasPin, isValidPin, setPin,
} from './pin';

const fresh = () => KV_DEFAULTS.gate();

describe('pin', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const p of ['123', '12345', 'abcd', '12a4', '']) expect(isValidPin(p)).toBe(false);
    expect(() => setPin(fresh(), '12', createRng(1))).toThrow();
  });

  it('stores a salted hash, not the PIN', () => {
    const a = setPin(fresh(), '1234', createRng(1));
    const b = setPin(fresh(), '1234', createRng(2));
    expect(hasPin(a)).toBe(true);
    expect(a.pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.pinHash).not.toContain('1234');
    expect(a.pinHash).not.toBe(b.pinHash);
    expect(a.pinHash).toBe(hashPin(a.salt, '1234'));
  });

  it('works without crypto.subtle (plain http)', () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      const clock = createFakeClock(1000);
      const rec = setPin(fresh(), '4321', createRng(3));
      expect(checkPin(rec, '4321', clock).result).toBe('ok');
      expect(checkPin(rec, '1234', clock).result).toBe('wrong');
    } finally {
      if (saved) Object.defineProperty(globalThis, 'crypto', saved);
    }
  });

  it('says no-pin when none is set', () => {
    expect(checkPin(fresh(), '1234', createFakeClock(0)).result).toBe('no-pin');
  });

  it('blocks 1 minute after 3 wrong codes and survives a reload', () => {
    const clock = createFakeClock(100_000);
    let rec = setPin(fresh(), '1234', createRng(1));
    let o = checkPin(rec, '0000', clock);
    expect(o.result).toBe('wrong');
    rec = o.record;
    o = checkPin(rec, '1111', clock);
    expect(o.result).toBe('wrong');
    rec = o.record;
    o = checkPin(rec, '2222', clock);
    expect(o.result).toBe('blocked');
    expect(o.msLeft).toBe(60_000);
    rec = JSON.parse(JSON.stringify(o.record));
    clock.advance(30_000);
    const during = checkPin(rec, '1234', clock);
    expect(during.result).toBe('blocked');
    expect(during.msLeft).toBe(30_000);
    clock.advance(30_000);
    expect(checkPin(rec, '1234', clock).result).toBe('ok');
  });

  it('a right code resets the wrong count', () => {
    const clock = createFakeClock(0);
    let rec = setPin(fresh(), '1234', createRng(1));
    rec = checkPin(rec, '0000', clock).record;
    rec = checkPin(rec, '1234', clock).record;
    expect(rec.wrongTries).toBe(0);
    expect(checkPin(rec, '0000', clock).result).toBe('wrong');
  });

  it('PIN vergeten: 2 wrong answers block for 10 minutes, the pin pad too', () => {
    const clock = createFakeClock(5_000_000);
    let rec = setPin(fresh(), '1234', createRng(1));
    let o = checkResetAnswer(rec, false, clock);
    expect(o.result).toBe('wrong');
    rec = o.record;
    o = checkResetAnswer(rec, false, clock);
    expect(o.result).toBe('blocked');
    expect(o.msLeft).toBe(600_000);
    rec = JSON.parse(JSON.stringify(o.record));
    expect(checkPin(rec, '1234', clock).result).toBe('blocked');
    expect(checkResetAnswer(rec, true, clock).result).toBe('blocked');
    clock.advance(599_000);
    expect(checkPin(rec, '1234', clock).result).toBe('blocked');
    clock.advance(1_000);
    expect(checkPin(rec, '1234', clock).result).toBe('ok');
  });

  it('a pin pad block also blocks PIN vergeten, and a short block never shortens a long one', () => {
    const clock = createFakeClock(0);
    let rec = setPin(fresh(), '1234', createRng(1));
    for (let i = 0; i < 3; i++) rec = checkPin(rec, '0000', clock).record;
    expect(blockMsLeft(rec, clock)).toBe(60_000);
    expect(checkResetAnswer(rec, true, clock).result).toBe('blocked');
    clock.advance(60_000);
    rec = checkResetAnswer(rec, false, clock).record;
    rec = checkResetAnswer(rec, false, clock).record;
    expect(blockMsLeft(rec, clock)).toBe(600_000);
  });

  it('a right answer lets the parent set a new PIN', () => {
    const clock = createFakeClock(0);
    let rec = setPin(fresh(), '1234', createRng(1));
    rec = checkResetAnswer(rec, false, clock).record;
    const o = checkResetAnswer(rec, true, clock);
    expect(o.result).toBe('ok');
    const renewed = setPin(o.record, '9876', createRng(4));
    expect(checkPin(renewed, '9876', clock).result).toBe('ok');
    expect(checkPin(renewed, '1234', clock).result).toBe('wrong');
  });

  it('a clock set far back cannot lock the gate for longer than 10 minutes', () => {
    const clock = createFakeClock(10_000_000_000);
    let rec = setPin(fresh(), '1234', createRng(1));
    for (let i = 0; i < 3; i++) rec = checkPin(rec, '0000', clock).record;
    clock.set(0);
    expect(blockMsLeft(rec, clock)).toBe(600_000);
  });
});
