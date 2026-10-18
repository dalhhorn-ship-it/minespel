// Punctuate view: tap the gaps between words to place or remove the mark, then tap Klaar (AC55).
// Gap i is the space right after words[i]. It only collects the marked gaps (sorted).
// Only the first Klaar counts (AC117).
import '../../styles/mc-menu.css';
import '../../styles/questions.css';
import type { PunctuateItem } from '../../content/format';
import { el } from '../dom';
import { onTap } from '../tap';
import type { QuestionView, QuestionViewOptions } from './choice-view';

export function createPunctuateView(options: QuestionViewOptions<PunctuateItem>): QuestionView {
  const { item, onAnswer, doc } = options;
  const cleanups: Array<() => void> = [];
  const marked = new Set<number>();
  let answered = false;
  const gapButtons: HTMLElement[] = [];

  const line: Node[] = [];
  item.words.forEach((word, i) => {
    line.push(el('span', { class: 'q-text-word', text: word }, [], doc));
    if (i === item.words.length - 1) return;
    const gap = el(
      'button',
      { class: 'q-gap', attrs: { type: 'button', 'aria-pressed': 'false', 'aria-label': `Na ${word}` } },
      [],
      doc,
    );
    gapButtons.push(gap);
    cleanups.push(
      onTap(gap, () => {
        if (answered) return;
        if (marked.has(i)) marked.delete(i);
        else marked.add(i);
        const on = marked.has(i);
        gap.setAttribute('aria-pressed', String(on));
        gap.textContent = on ? item.mark : '';
      }),
    );
    line.push(gap);
  });

  const done = el('button', { class: 'q-done', text: 'Klaar', attrs: { type: 'button' } }, [], doc);
  cleanups.push(
    onTap(done, () => {
      if (answered) return;
      answered = true;
      done.classList.add('q-picked');
      for (const g of gapButtons) g.setAttribute('aria-disabled', 'true');
      done.setAttribute('aria-disabled', 'true');
      onAnswer({ type: 'punctuate', gaps: [...marked].sort((a, b) => a - b) });
    }),
  );

  const element = el(
    'div',
    { class: 'q-view q-punctuate' },
    [el('p', { class: 'q-prompt', text: item.prompt }, [], doc), el('div', { class: 'q-line' }, line, doc), done],
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
