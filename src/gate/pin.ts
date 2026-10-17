// Parent PIN: salted hash, check, and one shared saved lockout (AC74, AC75, AC128).
// Pure: functions take a GateRecord and return a new one. The caller saves it.
import type { Clock } from '../core/clock';
import type { Rng } from '../core/rng';
import type { GateRecord } from '../storage/schema';
import { sha256Hex } from './sha256';

export const PIN_WRONG_LIMIT = 3;
export const PIN_BLOCK_MS = 60_000;
export const RESET_WRONG_LIMIT = 2;
export const RESET_BLOCK_MS = 600_000;

export type PinResult = 'ok' | 'wrong' | 'blocked' | 'no-pin';
export interface GateOutcome {
  result: PinResult;
  record: GateRecord;
  /** Milliseconds left of the block, 0 when not blocked. */
  msLeft: number;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

function makeSalt(rng: Rng): string {
  let s = '';
  for (let i = 0; i < 16; i++) s += rng.int(0, 15).toString(16);
  return s;
}

export function hashPin(salt: string, pin: string): string {
  return sha256Hex(`${salt}:${pin}`);
}

export function hasPin(record: GateRecord): boolean {
  return record.pinHash !== '' && record.salt !== '';
}

/** Milliseconds of block left. A clock set far back cannot make a block longer than the longest one. */
export function blockMsLeft(record: GateRecord, clock: Clock): number {
  const left = record.blockedUntil - clock.now();
  if (left <= 0) return 0;
  return Math.min(left, RESET_BLOCK_MS);
}

/** Saves a new PIN with a fresh salt. Clears wrong tries but keeps a running block. */
export function setPin(record: GateRecord, pin: string, rng: Rng): GateRecord {
  if (!isValidPin(pin)) throw new Error('PIN must be 4 digits');
  const salt = makeSalt(rng);
  return { ...record, salt, pinHash: hashPin(salt, pin), wrongTries: 0, resetWrongTries: 0 };
}

function block(record: GateRecord, clock: Clock, ms: number): number {
  return Math.max(blockMsLeft(record, clock) > 0 ? record.blockedUntil : 0, clock.now() + ms);
}

/** Checks a typed PIN. Three wrong codes block the gate for 1 minute. */
export function checkPin(record: GateRecord, pin: string, clock: Clock): GateOutcome {
  const left = blockMsLeft(record, clock);
  if (left > 0) return { result: 'blocked', record, msLeft: left };
  if (!hasPin(record)) return { result: 'no-pin', record, msLeft: 0 };
  if (isValidPin(pin) && hashPin(record.salt, pin) === record.pinHash) {
    return { result: 'ok', record: { ...record, wrongTries: 0, resetWrongTries: 0, blockedUntil: 0 }, msLeft: 0 };
  }
  const tries = record.wrongTries + 1;
  if (tries >= PIN_WRONG_LIMIT) {
    const next = { ...record, wrongTries: 0, blockedUntil: block(record, clock, PIN_BLOCK_MS) };
    return { result: 'blocked', record: next, msLeft: blockMsLeft(next, clock) };
  }
  return { result: 'wrong', record: { ...record, wrongTries: tries }, msLeft: 0 };
}

/**
 * Handles an answer to the PIN vergeten question. Two wrong answers block everything for
 * 10 minutes. Returns 'ok' when right; the caller then lets the parent set a new PIN.
 */
export function checkResetAnswer(record: GateRecord, isRight: boolean, clock: Clock): GateOutcome {
  const left = blockMsLeft(record, clock);
  if (left > 0) return { result: 'blocked', record, msLeft: left };
  if (isRight) {
    return { result: 'ok', record: { ...record, wrongTries: 0, resetWrongTries: 0, blockedUntil: 0 }, msLeft: 0 };
  }
  const tries = record.resetWrongTries + 1;
  if (tries >= RESET_WRONG_LIMIT) {
    const next = { ...record, resetWrongTries: 0, blockedUntil: block(record, clock, RESET_BLOCK_MS) };
    return { result: 'blocked', record: next, msLeft: blockMsLeft(next, clock) };
  }
  return { result: 'wrong', record: { ...record, resetWrongTries: tries }, msLeft: 0 };
}
