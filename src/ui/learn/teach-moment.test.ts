import { describe, expect, it } from 'vitest';
import type { Lesson } from '../../content/format';
import { createTeachMoment, pickLessonPage } from './teach-moment';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}

const lesson: Lesson = {
  pages: [
    { title: 'Eerste', text: 'a', examples: [] },
    { title: 'Komma', text: 'b', examples: [], skill: 'komma-opsomming' },
  ],
};

describe('pickLessonPage', () => {
  it('picks the page linked to the skill', () => {
    expect(pickLessonPage(lesson, 'komma-opsomming')?.title).toBe('Komma');
  });
  it('falls back to the first page', () => {
    expect(pickLessonPage(lesson, 'iets-anders')?.title).toBe('Eerste');
  });
  it('gives undefined for an empty lesson', () => {
    expect(pickLessonPage({ pages: [] }, 'x')).toBeUndefined();
  });
});

describe('teach moment', () => {
  it('shows Zo zit het, answer, explain, lesson page and -1 punt', () => {
    const page = pickLessonPage(lesson, 'komma-opsomming')!;
    const tm = createTeachMoment({ answer: 'Ik eet, drink en slaap.', explain: 'Na eet komt een komma.', teaching: { kind: 'page', page }, onDone: () => {} });
    const t = tm.element.textContent ?? '';
    for (const s of ['Zo zit het:', 'Ik eet, drink en slaap.', 'Na eet komt een komma.', 'Komma', '-1 punt', 'Ik snap het']) expect(t).toContain(s);
    expect(tm.element.querySelector('.teach-malus')).not.toBeNull();
  });

  it('shows a worked example as steps', () => {
    const tm = createTeachMoment({
      answer: '56',
      explain: 'Splits 8 in 4 en 4.',
      teaching: { kind: 'example', example: { title: '7 x 8', steps: ['7 x 4 = 28', '28 + 28 = 56'] } },
      onDone: () => {},
    });
    const steps = [...tm.element.querySelectorAll('.teach-steps li')].map((li) => li.textContent);
    expect(steps).toEqual(['7 x 4 = 28', '28 + 28 = 56']);
    expect(tm.element.textContent).toContain('7 x 8');
  });

  it('Ik snap het acts once on a double tap', () => {
    let n = 0;
    let time = 0;
    const tm = createTeachMoment({ answer: 'a', explain: 'b', onDone: () => n++, now: () => time });
    const b = tm.element.querySelector('.teach-done') as HTMLButtonElement;
    for (let i = 0; i < 2; i++) {
      b.dispatchEvent(ptr('pointerdown', 1));
      b.dispatchEvent(ptr('pointerup', 1));
    }
    time += 5000;
    b.dispatchEvent(ptr('pointerdown', 1));
    b.dispatchEvent(ptr('pointerup', 1));
    expect(n).toBe(1);
  });

  it('works without teaching', () => {
    const tm = createTeachMoment({ answer: 'a', explain: 'b', onDone: () => {} });
    expect(tm.element.querySelector('.teach-lesson')).toBeNull();
  });
});
