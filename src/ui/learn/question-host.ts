// Hosts the right question view for any Item type (`choice`, `find-error`, `punctuate`, `type`, or numeric Rekenen).
import type { Item } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { el } from '../dom';
import { createChoiceView } from './choice-view';
import { createFindErrorView } from './find-error-view';
import { createNumberView } from './number-view';
import { createPunctuateView } from './punctuate-view';
import { createTypeView } from './type-view';

export interface QuestionHostOptions {
  item: Item;
  /** True for Rekenen sums: uses the number pad instead of the letter keyboard. */
  numeric?: boolean;
  onAnswer: (response: Response) => void;
  doc?: Document;
}

/** An answer typed or marked but not yet sent with Klaar (exam time out, AC67). */
export type Draft = { type: 'type'; text: string } | { type: 'punctuate'; gaps: number[] };

export interface QuestionHost {
  readonly element: HTMLElement;
  /** Current typed text for `type` or numeric items (empty for others). */
  getTypedText(): string;
  /** Typed text, or marked gaps, or null when nothing was entered yet. */
  getDraft(): Draft | null;
  destroy(): void;
}

function draftOf(text: string): Draft | null {
  return text.trim() === '' ? null : { type: 'type', text };
}

export function createQuestionHost(options: QuestionHostOptions): QuestionHost {
  const { item, numeric, onAnswer, doc } = options;

  switch (item.type) {
    case 'choice': {
      const view = createChoiceView({ item, onAnswer, doc });
      return { element: view.element, getTypedText: () => '', getDraft: () => null, destroy: () => view.destroy() };
    }
    case 'find-error': {
      const view = createFindErrorView({ item, onAnswer, doc });
      return { element: view.element, getTypedText: () => '', getDraft: () => null, destroy: () => view.destroy() };
    }
    case 'punctuate': {
      const view = createPunctuateView({ item, onAnswer, doc });
      return {
        element: view.element,
        getTypedText: () => '',
        getDraft: () => {
          const gaps = view.getMarked();
          return gaps.length > 0 ? { type: 'punctuate', gaps } : null;
        },
        destroy: () => view.destroy(),
      };
    }
    case 'type': {
      const promptNode = el('p', { class: 'q-prompt', text: item.prompt }, [], doc);
      if (numeric) {
        const view = createNumberView({
          item,
          onAnswer: (text) => onAnswer({ type: 'type', text }),
        });
        const wrap = el('div', { class: 'q-view q-number-host' }, [promptNode, view.el], doc);
        return {
          element: wrap,
          getTypedText: () => view.getText(),
          getDraft: () => draftOf(view.getText()),
          destroy: () => {
            view.destroy();
            wrap.remove();
          },
        };
      }
      const view = createTypeView({
        item,
        onAnswer: (text) => onAnswer({ type: 'type', text }),
      });
      const wrap = el('div', { class: 'q-view q-type-host' }, [promptNode, view.el], doc);
      return {
        element: wrap,
        getTypedText: () => view.getText(),
        getDraft: () => draftOf(view.getText()),
        destroy: () => {
          view.destroy();
          wrap.remove();
        },
      };
    }
  }
}

/** Plain text representation of an item's right answer, for the teach moment and exam review. */
export function formatRightAnswer(item: Item): string {
  switch (item.type) {
    case 'choice':
      return item.options[item.answer] ?? '';
    case 'find-error': {
      if (item.answer < 0) return 'Geen fout';
      const wrong = item.words[item.answer] ?? '';
      return item.correction ? `${wrong} → ${item.correction}` : wrong;
    }
    case 'type':
      return item.answer[0] ?? '';
    case 'punctuate': {
      const gaps = new Set(item.answer);
      return item.words.map((w, i) => (gaps.has(i) ? `${w}${item.mark}` : w)).join(' ');
    }
  }
}
