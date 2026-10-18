// Find-error view: tap the wrong word, or "Geen fout" when there is no mistake (AC54).
// It only collects the answer (word index, or -1). Only the first tap counts (AC117).
import '../../styles/mc-menu.css';
import '../../styles/questions.css';
import type { FindErrorItem } from '../../content/format';
import { el } from '../dom';
import { onTap } from '../tap';
import type { QuestionView, QuestionViewOptions } from './choice-view';

export function createFindErrorView(options: QuestionViewOptions<FindErrorItem>): QuestionView {
  const { item, onAnswer, doc } = options;
  const cleanups: Array<() => void> = [];
  let answered = false;
  const all: HTMLElement[] = [];

  const pick = (button: HTMLElement, index: number) => {
    cleanups.push(
      onTap(button, () => {
        if (answered) return;
        answered = true;
        button.classList.add('q-picked');
        for (const b of all) b.setAttribute('aria-disabled', 'true');
        onAnswer({ type: 'find-error', index });
      }),
    );
  };

  const words = item.words.map((text, i) => {
    const b = el('button', { class: 'q-word', text, attrs: { type: 'button' } }, [], doc);
    all.push(b);
    pick(b, i);
    return b;
  });
  const none = el('button', { class: 'q-none', text: 'Geen fout', attrs: { type: 'button' } }, [], doc);
  all.push(none);
  pick(none, -1);

  const element = el(
    'div',
    { class: 'q-view q-find-error' },
    [
      el('p', { class: 'q-prompt', text: item.prompt }, [], doc),
      el('div', { class: 'q-words' }, words, doc),
      none,
    ],
    doc,
  );

  return {
    element,
    destroy() {
      for (const c of cleanups) c();
      element.remove();
    },
  };
}
