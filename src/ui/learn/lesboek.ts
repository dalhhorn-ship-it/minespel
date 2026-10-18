// Lesboek view (T46, AC51): lets the kid browse and read lessons of all switched-on topics,
// and optionally jump straight into practicing a topic to earn coins.

import '../../styles/lesboek.css';
import type { Catalog } from '../../content/catalog';
import { subjectLabel } from '../../content/catalog';
import type { Lesson } from '../../content/format';
import { isModuleOn, isTopicOn } from '../../content/switches';
import type { SwitchesRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';
import { createLessonView } from './lesson-view';

export interface LesboekOptions {
  catalog?: Catalog;
  switches?: SwitchesRecord;
  onClose: () => void;
  /** Optional handler to immediately practice a topic from its lesson view and earn coins. */
  onPracticeTopic?: (moduleId: string, topicId: string) => void;
  now?: () => number;
}

export interface LesboekView {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createLesboek(options: LesboekOptions): LesboekView {
  const cleanups: Array<() => void> = [];
  const card = el('div', {
    class: 'lesboek-card pause-card',
    attrs: { role: 'dialog', 'aria-label': 'Lesboek' },
  });
  const root = el('div', { class: 'lesboek-backdrop pause-backdrop' }, [card]);
  let activeLessonCleanup: (() => void) | null = null;

  function clearListCleanups() {
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  }

  function clearActiveLesson() {
    if (activeLessonCleanup) {
      activeLessonCleanup();
      activeLessonCleanup = null;
    }
  }

  function showTopicLesson(moduleId: string, topicId: string, title: string, lesson: Lesson) {
    clearActiveLesson();
    clearListCleanups();
    card.replaceChildren();

    const backBtn = el('button', {
      class: 'pause-btn',
      text: 'Terug naar Lesboek',
      attrs: { type: 'button' },
    });
    const offBack = onTap(backBtn, () => renderList(), { now: options.now });

    const headerChildren: HTMLElement[] = [
      el('h2', { class: 'lesboek-title pause-title', text: title }),
      backBtn,
    ];
    if (options.onPracticeTopic) {
      const practiceBtn = el('button', {
        class: 'lesboek-override-btn',
        text: 'Oefen dit onderwerp \u{1FA99}',
        attrs: { type: 'button', 'data-testid': 'lesboek-practice-topic' },
      });
      cleanups.push(
        onTap(
          practiceBtn,
          () => {
            options.onPracticeTopic?.(moduleId, topicId);
          },
          { now: options.now },
        ),
      );
      headerChildren.push(practiceBtn);
    }

    const header = el('div', { class: 'lesboek-header pause-header' }, headerChildren);
    const lessonView = createLessonView({
      lesson,
      onDone: () => renderList(),
      now: options.now,
    });

    activeLessonCleanup = () => {
      offBack();
      lessonView.destroy();
    };
    card.append(header, lessonView.element);
  }

  function renderList() {
    clearActiveLesson();
    clearListCleanups();
    card.replaceChildren();

    const closeBtn = el('button', {
      class: 'pause-btn pause-btn-primary',
      text: 'Sluiten',
      attrs: { type: 'button' },
    });
    cleanups.push(onTap(closeBtn, () => options.onClose(), { now: options.now }));

    const header = el('div', { class: 'lesboek-header pause-header' }, [
      el('h2', { class: 'lesboek-title pause-title', text: 'Lesboek' }),
      closeBtn,
    ]);

    const subtitle = el('p', {
      text: 'Kies een onderwerp om de uitleg en voorbeelden rustig door te lezen.',
    });

    const listWrap = el('div', { class: 'lesboek-topics-grid pause-actions' });
    let count = 0;

    if (options.catalog && options.switches) {
      for (const bundle of options.catalog.modules()) {
        if (!isModuleOn(options.switches, options.catalog, bundle.module.id)) continue;
        for (const topic of bundle.topics) {
          if (!isTopicOn(options.switches, options.catalog, bundle.module.id, topic.id)) continue;
          if (!topic.lesson || topic.lesson.pages.length === 0) continue;
          count++;
          const btn = el(
            'button',
            {
              class: 'lesboek-topic-btn pause-btn',
              attrs: {
                type: 'button',
                'data-topic-id': `${bundle.module.id}:${topic.id}`,
              },
            },
            [
              el('span', {
                class: 'lesboek-topic-subject',
                text: subjectLabel(bundle.module.subject),
              }),
              el('span', {
                class: 'lesboek-topic-name',
                text: topic.title,
              }),
            ],
          );
          cleanups.push(
            onTap(
              btn,
              () => showTopicLesson(bundle.module.id, topic.id, topic.title, topic.lesson),
              { now: options.now },
            ),
          );
          listWrap.append(btn);
        }
      }
    }

    if (count === 0) {
      listWrap.append(
        el('p', {
          class: 'lesboek-empty',
          text: 'Er staan momenteel geen lessen aan.',
        }),
      );
    }

    card.append(header, subtitle, listWrap);
  }

  renderList();

  return {
    element: root,
    destroy() {
      clearActiveLesson();
      clearListCleanups();
      root.remove();
    },
  };
}
