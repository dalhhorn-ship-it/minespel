// Teasing (v18, AC220, AC221). STUB until V18c: picks nobody. `teaseNow` is the hook and the call V18c fills in.
import type { MonsterContext } from './monster-types';

/** Klodder teases one dino or chicken now. Returns true when one was teased. */
export function teaseNow(ctx: MonsterContext): boolean {
  void ctx;
  return false;
}

/** Called every step while Klodder is out (V18c decides when to tease). */
export function stepTease(ctx: MonsterContext, dt: number): void {
  void ctx;
  void dt;
}
