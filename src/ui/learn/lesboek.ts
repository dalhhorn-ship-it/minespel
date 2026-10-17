// Lesboek view (T44 stub / M3 T46): lets the kid browse lessons of switched-on topics.

import type { Catalog } from '../../content/catalog';
import { subjectLabel } from '../../content/catalog';
import type { Lesson } from '../../content/format';
import { isTopicOn } from '../../content/switches';
import type { SwitchesRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';
import { createLessonView } from './lesson-view';

export interface LesboekOptions {
  catalog?: Catalog;
  switches?: SwitchesRecord;
  onClose: () => void;
  now?: () => number;
}

export interface LesboekView {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createLesboek(options: LesboekOptions): LesboekView {
  const cleanups: Array<() => void> = [];
  const card = el('div', { class: 'pause-card', attrs: { 'aria-label': 'Lesboek' } });
  const root = el('div', { class: 'pause-backdrop' }, [card]);
  let activeLessonCleanup: (() => void) | null = null;

  function clearActiveLesson() {
    if (activeLessonCleanup) {
      activeLessonCleanup();
      activeLessonCleanup = null;
    }
  }

  function showTopicLesson(title: string, lesson: Lesson) {
    clearActiveLesson();
    card.replaceChildren();
    const header = el('div', { class: 'pause-header' }, [
      el('h2', { class: 'pause-title', text: title }),
    ]);
    const lessonView = createLessonView({
      lesson,
      onDone: () => renderList(),
      now: options.now,
    });
    const backBtn = el('button', {
      class: 'pause-btn',
      text: 'Terug naar Lesboek',
      attrs: { type: 'button' },
    });
    const offBack = onTap(backBtn, () => renderList(), { now: options.now });
    activeLessonCleanup = () => {
      offBack();
      lessonView.destroy();
    };
    card.append(header, lessonView.element, backBtn);
  }

  function renderList() {
    clearActiveLesson();
    card.replaceChildren();

    const header = el('div', { class: 'pause-header' }, [
      el('h2', { class: 'pause-title', text: 'Lesboek' }),
    ]);
    const listWrap = el('div', { class: 'pause-actions' });

    if (options.catalog && options.switches) {
      for (const bundle of options.catalog.modules()) {
        for (const topic of bundle.topics) {
          if (!isTopicOn(options.switches, options.catalog, bundle.module.id, topic.id)) continue;
          const btn = el('button', {
            class: 'pause-btn',
            text: `${subjectLabel(bundle.module.subject)}: ${topic.title}`,
            attrs: { type: 'button' },
          });
          cleanups.push(
            onTap(btn, () => showTopicLesson(topic.title, topic.lesson), { now: options.now }),
          );
          listWrap.append(btn);
        }
      }
    }

    const closeBtn = el('button', {
      class: 'pause-btn pause-btn-primary',
      text: 'Sluiten',
      attrs: { type: 'button' },
    });
    cleanups.push(onTap(closeBtn, () => options.onClose(), { now: options.now }));

    card.append(header, listWrap, closeBtn);
  }

  renderList();

  return {
    element: root,
    destroy() {
      clearActiveLesson();
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
