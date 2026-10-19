// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { installLockdown } from './lockdown';

function fire(target: EventTarget, type: string): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
}

describe('lockdown', () => {
  let remove: (() => void) | undefined;
  afterEach(() => {
    remove?.();
    document.body.replaceChildren();
  });

  it('prevents gestures, double click and the callout menu', () => {
    remove = installLockdown(document);
    for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu']) {
      expect(fire(document.body, type).defaultPrevented, type).toBe(true);
    }
  });

  it('prevents touchmove on game areas but not in the parent area', () => {
    remove = installLockdown(document);
    const parent = document.createElement('div');
    parent.className = 'parent';
    const inner = document.createElement('p');
    parent.append(inner);
    document.body.append(parent);
    expect(fire(document.body, 'touchmove').defaultPrevented).toBe(true);
    expect(fire(inner, 'touchmove').defaultPrevented).toBe(false);
  });

  it('lets a finger scroll kid screens that are marked scrollable, like the Lesboek and Extra oefenen', () => {
    remove = installLockdown(document);
    for (const cls of ['scrollable', 'lesboek-card']) {
      const card = document.createElement('div');
      card.className = cls;
      const inner = document.createElement('p');
      card.append(inner);
      document.body.append(card);
      expect(fire(inner, 'touchmove').defaultPrevented, cls).toBe(false);
    }
  });

  it('lets inputs keep their context menu and stops after removal', () => {
    remove = installLockdown(document);
    const input = document.createElement('input');
    document.body.append(input);
    expect(fire(input, 'contextmenu').defaultPrevented).toBe(false);
    remove();
    remove = undefined;
    expect(fire(document.body, 'gesturestart').defaultPrevented).toBe(false);
  });
});
