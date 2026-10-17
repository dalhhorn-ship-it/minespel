// Question host: picks the view for an item type and turns what the view reports into a
// session `Response`. Rekenen items (numeric) get the number pad, other typed items the letter keyboard.
// The host only shows a question and reports the first answer. Scoring is the session's job.
import type { Item } from '../../content/format';
import '../../styles/questions.css';
import { el } from '../dom';
import type { Response } from '../../learning/answer-check';
import { createChoiceView } from './choice-view';
import { createFindErrorView } from './find-error-view';
import { createNumberView } from './number-view';
import { createPunctuateView } from './punctuate-view';
import { createTypeView } from './type-view';

export interface QuestionHostOptions {
  item: Item;
  /** Rekenen: use the number pad. */
  numeric?: boolean;
  onAnswer: (response: Response) => void;
  doc?: Document;
}

export interface QuestionHost {
  element: HTMLElement;
  destroy(): void;
}

export function createQuestionHost(options: QuestionHostOptions): QuestionHost {
  const { item, onAnswer, doc } = options;
  switch (item.type) {
    case 'choice': {
      const v = createChoiceView({ item, onAnswer, doc });
      return { element: v.element, destroy: () => v.destroy() };
    }
    case 'find-error': {
      const v = createFindErrorView({ item, onAnswer, doc });
      return { element: v.element, destroy: () => v.destroy() };
    }
    case 'punctuate': {
      const v = createPunctuateView({ item, onAnswer, doc });
      return { element: v.element, destroy: () => v.destroy() };
    }
    case 'type': {
      const send = (text: string) => onAnswer({ type: 'type', text });
      const v = options.numeric ? createNumberView({ item, onAnswer: send }) : createTypeView({ item, onAnswer: send });
      // The typing views show the sentence but not the prompt, so the host puts it on top.
      const element = el('div', { class: 'q-view q-typed' }, [el('p', { class: 'q-prompt', text: item.prompt }, [], doc), v.el], doc);
      return {
        element,
        destroy() {
          v.destroy();
          element.remove();
        },
      };
    }
  }
}
