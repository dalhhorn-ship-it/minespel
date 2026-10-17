import { describe, expect, it } from 'vitest';
import { createBreakFlow } from './break-flow';
import { createScreens } from './screens';

describe('break flow stub', () => {
  it('stops the world, opens a learn screen, and end gives a full timer', () => {
    const screens = createScreens(document.createElement('div'));
    const calls: string[] = [];
    const flow = createBreakFlow({
      screens,
      pauseWorld: () => calls.push('pause'),
      resumeWorld: () => calls.push('resume'),
      restartTimer: () => calls.push('restart'),
    });
    flow.start();
    flow.start();
    expect(calls).toEqual(['pause']);
    expect(flow.isActive()).toBe(true);
    expect(screens.current()).toBe('learn');
    flow.end();
    expect(calls).toEqual(['pause', 'restart', 'resume']);
    expect(screens.current()).toBe('world');
    expect(flow.isActive()).toBe(false);
    flow.end();
    expect(calls.length).toBe(3);
  });
});
