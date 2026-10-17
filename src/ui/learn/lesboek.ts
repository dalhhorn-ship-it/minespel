// Lesboek (T46, PRD 4.7, AC51): every switched on topic of every module is listed, and each lesson opens page
// by page. Reading never changes the timers, the points or any saved record: this screen only reads.
// It is a 'kid-overlay' screen on top of the pause menu, so the play timer stays stopped (AC23).
import '../../styles/lesboek.css';
import type { AppEnv } from '../../app/app-env';
import { loadBreakCatalog, loadSwitches } from '../../app/content-loader';
import type { Screens } from '../../app/screens';
import type { Catalog } from '../../content/catalog';
import type { Lesson } from '../../content/format';
import { isModuleOn, isTopicOn, type Switches } from '../../content/switches';
import { el } from '../dom';
import { onTap } from '../tap';
import { createLessonView } from './lesson-view';

export const MSG_LESBOEK_EMPTY = 'Er staan nu geen lessen aan. Vraag een grote om iets aan te zetten.';
export const MSG_LESBOEK_ERROR = 'Het Lesboek kan nu niet open. Probeer het straks nog eens.';

/** What the Lesboek needs. The defaults read the real catalog and switches; tests pass their own. */
export interface LesboekDeps {
  catalog?: () => Promise<Catalog>;
  switches?: () => Promise<Switches>;
}

/** One lesson that can be opened. */
export interface LesboekEntry {
  moduleId: string;
  moduleTitle: string;
  topicId: string;
  title: string;
  lesson: Lesson;
}

/** Every switched on topic that has a lesson, grouped by module in catalog order (AC51). */
export function lesboekEntries(catalog: Catalog, switches: Switches): LesboekEntry[] {
  const out: LesboekEntry[] = [];
  for (const m of catalog.modules()) {
    if (!isModuleOn(switches, m.id)) continue;
    for (const t of catalog.topics(m.id)) {
      if (!isTopicOn(switches, m.id, t.id) || t.lesson.pages.length === 0) continue;
      out.push({ moduleId: m.id, moduleTitle: m.title, topicId: t.id, title: t.title, lesson: t.lesson });
    }
  }
  return out;
}

export function openLesboek(screens: Screens, env: AppEnv, deps: LesboekDeps = {}): () => void {
  let closed = false;
  let lessonCleanup: Array<() => void> = [];
  const cleanups: Array<() => void> = [];

  const title = el('h2', { class: 'lesboek-title', text: 'Lesboek' });
  const back = el('button', { class: 'lesboek-back', text: 'Terug', attrs: { type: 'button', 'data-lesboek': 'back' } });
  const body = el('div', { class: 'lesboek-body' });
  const root = el('div', { class: 'lesboek', attrs: { role: 'dialog', 'aria-label': 'Lesboek', 'data-screen-id': 'lesboek' } }, [
    el('header', { class: 'lesboek-header' }, [back, title]),
    body,
  ]);
  const closeScreen = screens.open('kid-overlay', root);
  let onBack: () => void = close;
  cleanups.push(onTap(back, () => onBack()));

  function close(): void {
    if (closed) return;
    closed = true;
    for (const c of [...lessonCleanup, ...cleanups]) c();
    lessonCleanup = [];
    closeScreen();
  }

  function clearLesson(): void {
    for (const c of lessonCleanup) c();
    lessonCleanup = [];
  }

  function message(text: string): void {
    clearLesson();
    body.replaceChildren(el('p', { class: 'lesboek-note', text, attrs: { role: 'status' } }));
  }

  function showList(entries: LesboekEntry[]): void {
    clearLesson();
    title.textContent = 'Lesboek';
    back.textContent = 'Terug';
    onBack = close;
    if (entries.length === 0) return message(MSG_LESBOEK_EMPTY);
    const list = el('div', { class: 'lesboek-list' });
    let lastModule = '';
    let grid: HTMLElement | null = null;
    for (const e of entries) {
      if (e.moduleId !== lastModule) {
        lastModule = e.moduleId;
        list.append(el('h3', { class: 'lesboek-module', text: e.moduleTitle }));
        grid = el('div', { class: 'lesboek-grid' });
        list.append(grid);
      }
      const b = el('button', {
        class: 'lesboek-topic',
        text: e.title,
        attrs: { type: 'button', 'data-lesboek-topic': `${e.moduleId}/${e.topicId}` },
      });
      lessonCleanup.push(onTap(b, () => showLesson(entries, e)));
      grid?.append(b);
    }
    body.replaceChildren(list);
  }

  function showLesson(entries: LesboekEntry[], e: LesboekEntry): void {
    clearLesson();
    title.textContent = e.title;
    back.textContent = 'Alle lessen';
    onBack = () => showList(entries);
    // "Ik snap het!" on the last page goes back to the list. Nothing is saved.
    const view = createLessonView({ lesson: e.lesson, onDone: () => showList(entries) });
    lessonCleanup.push(() => view.destroy());
    body.replaceChildren(view.element);
  }

  const loadCatalog = deps.catalog ?? loadBreakCatalog;
  const loadSw = deps.switches ?? (() => loadSwitches(env.records));
  message('Even laden...');
  Promise.all([loadCatalog(), loadSw()]).then(
    ([catalog, switches]) => {
      if (!closed) showList(lesboekEntries(catalog, switches));
    },
    () => {
      if (!closed) message(MSG_LESBOEK_ERROR);
    },
  );

  return close;
}
