// Choice view: a prompt, an optional sentence and 2 to 4 big answer buttons (AC53).
// It only collects the answer. The caller scores it. Only the first tap counts (AC117).
import '../../styles/questions.css';
import type { ChoiceItem } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { el } from '../dom';
import { onTap } from '../tap';

export interface QuestionViewOptions<I> {
  item: I;
  onAnswer: (response: Response) => void;
  doc?: Document;
}

export interface QuestionView {
  element: HTMLElement;
  destroy(): void;
}

export function createChoiceView(options: QuestionViewOptions<ChoiceItem>): QuestionView {
  const { item, onAnswer, doc } = options;
  const cleanups: Array<() => void> = [];
  let answered = false;

  const buttons = item.options.map((text, index) => {
    const b = el('button', { class: 'q-option', text, attrs: { type: 'button' } }, [], doc);
    cleanups.push(
      onTap(b, () => {
        if (answered) return;
        answered = true;
        b.classList.add('q-picked');
        for (const other of buttons) other.setAttribute('aria-disabled', 'true');
        onAnswer({ type: 'choice', index });
      }),
    );
    return b;
  });

  const children: Node[] = [el('p', { class: 'q-prompt', text: item.prompt }, [], doc)];
  if (item.sentence) children.push(el('p', { class: 'q-sentence', text: item.sentence }, [], doc));
  children.push(el('div', { class: 'q-options' }, buttons, doc));
  const element = el('div', { class: 'q-view q-choice' }, children, doc);

  return {
    element,
    destroy() {
      for (const c of cleanups) c();
      element.remove();
    },
  };
}
