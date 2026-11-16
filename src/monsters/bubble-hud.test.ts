import { describe, expect, it } from 'vitest';
import { computeBubbleHud, createBubbleHudState, type BubbleHudInput } from './bubble-hud';
import { addTarget, createTargetList, type TargetKind } from './targets';

const pose = { x: 10, y: 20, z: 10, yaw: 0 };
type T = [TargetKind, number, number, number];

function input(over: { msLeft?: number; runs?: boolean; held?: boolean; bubbleOn?: boolean; moleOn?: boolean; targets?: T[]; yaw?: number } = {}): BubbleHudInput {
  const targets = createTargetList();
  (over.targets ?? []).forEach((t, i) => addTarget(targets, `${t[0]}-${i}`, t[0], t[1], t[2], t[3]));
  return {
    clock: { runs: over.runs ?? true, held: over.held ?? false, msLeft: over.msLeft ?? 600_000 },
    targets,
    pose: { ...pose, yaw: over.yaw ?? 0 },
    bubbleOn: over.bubbleOn ?? true,
    moleOn: over.moleOn ?? true,
  };
}
const run = (i: BubbleHudInput) => computeBubbleHud(i, createBubbleHudState());

describe('computeBubbleHud clock (AC301)', () => {
  it.each([
    [200_000, 'Bubbel over 3:20'],
    [199_000, 'Bubbel over 3:19'],
    [500, 'Bubbel over 0:01'],
    [1, 'Bubbel over 0:01'],
    [600_000, 'Bubbel over 10:00'],
    [59_001, 'Bubbel over 1:00'],
  ])('AC301: %i ms left reads %s', (ms, text) => {
    const s = run(input({ msLeft: ms }));
    expect(s).toMatchObject({ shown: true, kind: 'clock', text, distance: 0, vertical: null });
  });
  it('AC301: due and held says "Bubbel komt zo!" and never a time below 0:00', () => {
    expect(run(input({ held: true, msLeft: 0 }))).toMatchObject({ shown: true, kind: 'soon', text: 'Bubbel komt zo!' });
    expect(run(input({ msLeft: 0 })).text).toBe('Bubbel komt zo!');
  });
  it('AC302: no clock when it does not run or the switch is off', () => {
    expect(run(input({ runs: false })).shown).toBe(false);
    expect(run(input({ bubbleOn: false })).shown).toBe(false);
    expect(run(input({ runs: false })).text).toBe('');
  });
});

describe('computeBubbleHud targets (AC304, AC305)', () => {
  it('AC304: a bubble 8 blocks ahead, then left, then behind', () => {
    const t: T[] = [['bubble', 10, 20, 18]];
    const a = run(input({ targets: t }));
    expect(a).toMatchObject({ shown: true, kind: 'bubble', text: 'Bubbel: 8 blokken', distance: 8, vertical: null });
    expect(Math.abs(a.angle)).toBeLessThan(10);
    // The kid turns 90 degrees to the left (yaw +90): the bubble is now on the right, 90 on the arrow.
    const left = run(input({ targets: t, yaw: Math.PI / 2 }));
    expect(Math.abs(left.angle - 90)).toBeLessThan(10);
    const away = run(input({ targets: t, yaw: Math.PI }));
    expect(Math.abs(Math.abs(away.angle) - 180)).toBeLessThan(10);
  });
  it('AC304: a target on the left of the kid gives about -90', () => {
    // Facing +z, right is -x, so +x is on the left. `targetAngle` is the one source of the angle.
    const a = run(input({ targets: [['bubble', 18, 20, 10]], yaw: 0 }));
    expect(Math.abs(a.angle + 90)).toBeLessThan(10);
  });
  it('AC304: Klodder, and "1 blok"', () => {
    expect(run(input({ targets: [['klodder', 10, 20, 15]] }))).toMatchObject({ kind: 'klodder', text: 'Klodder: 5 blokken' });
    expect(run(input({ targets: [['klodder', 10, 20, 11]] })).text).toBe('Klodder: 1 blok');
  });
  it('AC304: boven je at 4 up, onder je at 4 down, nothing at 2', () => {
    expect(run(input({ targets: [['bubble', 10, 24, 10.1]] }))).toMatchObject({ vertical: 'above' });
    expect(run(input({ targets: [['bubble', 10, 24, 10.1]] })).text).toMatch(/ boven je$/);
    expect(run(input({ targets: [['bubble', 10, 16, 10.1]] })).text).toMatch(/ onder je$/);
    expect(run(input({ targets: [['bubble', 10, 16, 10.1]] })).vertical).toBe('below');
    const flat = run(input({ targets: [['bubble', 10, 22, 14]] }));
    expect(flat.vertical).toBeNull();
    expect(flat.text).not.toMatch(/boven|onder/);
    expect(run(input({ targets: [['bubble', 10, 23, 14]] })).vertical).toBe('above');
  });
  it('AC304: the nearest target wins, a Klodder walking closer takes over', () => {
    const far = run(input({ targets: [['bubble', 10, 20, 30], ['klodder', 10, 20, 16]] }));
    expect(far.kind).toBe('klodder');
    const near = run(input({ targets: [['klodder', 10, 20, 30], ['bubble', 10, 20, 16]] }));
    expect(near.kind).toBe('bubble');
  });
  it('AC305: a free mole shows kind mole, and the nearer of mole and Klodder wins', () => {
    expect(run(input({ targets: [['mole', 10, 20, 22]] }))).toMatchObject({ kind: 'mole', text: 'Mol: 12 blokken' });
    expect(run(input({ targets: [['mole', 10, 20, 22], ['klodder', 10, 20, 15]] })).kind).toBe('klodder');
    expect(run(input({ targets: [['mole', 10, 20, 12], ['klodder', 10, 20, 15]] })).kind).toBe('mole');
  });
  it('AC305: a caught mole and the bar are never a target, the clock shows instead', () => {
    const s = run(input({ targets: [['mole-caught', 10, 20, 11], ['bar', 10, 20, 12]], msLeft: 200_000 }));
    expect(s).toMatchObject({ kind: 'clock', text: 'Bubbel over 3:20' });
    expect(run(input({ targets: [['mole-caught', 10, 20, 11]], runs: false })).shown).toBe(false);
    // A caught mole nearer than a real target never takes the arrow.
    expect(run(input({ targets: [['mole-caught', 10, 20, 11], ['bubble', 10, 20, 20]] })).kind).toBe('bubble');
  });
  it('AC302: the switches', () => {
    const bub: T[] = [['bubble', 10, 20, 18]];
    const klo: T[] = [['klodder', 10, 20, 18]];
    const mol: T[] = [['mole', 10, 20, 18]];
    expect(run(input({ targets: bub, bubbleOn: false })).shown).toBe(false);
    expect(run(input({ targets: klo, bubbleOn: false })).shown).toBe(false);
    expect(run(input({ targets: mol, bubbleOn: false })).kind).toBe('mole');
    expect(run(input({ targets: mol, moleOn: false })).kind).toBe('clock');
    expect(run(input({ targets: mol, moleOn: false, bubbleOn: false })).shown).toBe(false);
    expect(run(input({ targets: bub, moleOn: false })).kind).toBe('bubble');
  });
  it('a bubble target still shows when the clock is not running', () => {
    expect(run(input({ targets: [['bubble', 10, 20, 18]], runs: false })).kind).toBe('bubble');
  });
  it('reuses the object it is given', () => {
    const out = createBubbleHudState();
    expect(computeBubbleHud(input(), out)).toBe(out);
  });
});
