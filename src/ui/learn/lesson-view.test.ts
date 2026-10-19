// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Lesson } from '../../content/format';
import { createLessonView } from './lesson-view';

const lesson: Lesson = {
  pages: [
    { title: 'Een', text: 'Eerste', examples: [{ good: 'goed', bad: 'fout', why: 'omdat' }], tip: 'Let op' },
    { title: 'Twee', text: 'Tweede', examples: [] },
    { title: 'Drie', text: 'Derde', examples: [] },
  ],
};

function ptr(type: string, id: number, x = 0, y = 0): Event {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}

function setup() {
  let time = 1000;
  let done = 0;
  const view = createLessonView({ lesson, onDone: () => done++, now: () => time });
  const button = view.element.querySelector('.lesson-next') as HTMLButtonElement;
  const body = view.element.querySelector('.lesson-body') as HTMLElement;
  const tap = () => {
    button.dispatchEvent(ptr('pointerdown', 1));
    button.dispatchEvent(ptr('pointerup', 1));
    time += 1000;
  };
  const swipe = (dx: number, dy = 0) => {
    body.dispatchEvent(ptr('pointerdown', 2, 300, 300));
    body.dispatchEvent(ptr('pointerup', 2, 300 + dx, 300 + dy));
  };
  return { view, button, tap, swipe, done: () => done, time: () => time, advance: (n: number) => (time += n) };
}

describe('lesson view', () => {
  it('shows page one with title, text, examples and tip', () => {
    const { view, button } = setup();
    const t = view.element.textContent ?? '';
    for (const s of ['Een', 'Eerste', 'goed', 'fout', 'omdat', 'Let op']) expect(t).toContain(s);
    expect(button.textContent).toBe('Volgende');
  });

  it('the page text scrolls on its own and Volgende stays outside it (F6)', () => {
    const { view, button } = setup();
    const body = view.element.querySelector('.lesson-body');
    expect(body?.classList.contains('scrollable')).toBe(true);
    expect(body?.contains(button)).toBe(false);
  });

  it('Volgende pages forward and the last page has Ik snap het!', () => {
    const t = setup();
    t.tap();
    expect(t.view.pageIndex()).toBe(1);
    t.tap();
    expect(t.view.pageIndex()).toBe(2);
    expect(t.button.textContent).toBe('Ik snap het!');
    expect(t.done()).toBe(0);
  });

  it('Ik snap het! calls onDone once, also on a double tap', () => {
    const t = setup();
    t.tap();
    t.tap();
    t.button.dispatchEvent(ptr('pointerdown', 1));
    t.button.dispatchEvent(ptr('pointerup', 1));
    t.button.dispatchEvent(ptr('pointerdown', 1));
    t.button.dispatchEvent(ptr('pointerup', 1));
    expect(t.done()).toBe(1);
  });

  it('a double tap on Volgende moves one page only', () => {
    const t = setup();
    t.button.dispatchEvent(ptr('pointerdown', 1));
    t.button.dispatchEvent(ptr('pointerup', 1));
    t.button.dispatchEvent(ptr('pointerdown', 1));
    t.button.dispatchEvent(ptr('pointerup', 1));
    expect(t.view.pageIndex()).toBe(1);
  });

  it('swipe left pages forward, swipe right goes back', () => {
    const t = setup();
    t.swipe(-120);
    expect(t.view.pageIndex()).toBe(1);
    t.swipe(120);
    expect(t.view.pageIndex()).toBe(0);
    t.swipe(120);
    expect(t.view.pageIndex()).toBe(0);
  });

  it('short or mostly vertical swipes do nothing, and swiping never finishes', () => {
    const t = setup();
    t.swipe(-20);
    t.swipe(-60, 100);
    expect(t.view.pageIndex()).toBe(0);
    t.swipe(-120);
    t.swipe(-120);
    t.swipe(-120);
    expect(t.view.pageIndex()).toBe(2);
    expect(t.done()).toBe(0);
  });

  it('shows imported text as plain text', () => {
    const view = createLessonView({
      lesson: { pages: [{ title: '<b>x</b>', text: '<img src=x>', examples: [] }] },
      onDone: () => {},
    });
    expect(view.element.querySelector('b, img')).toBeNull();
  });
});
