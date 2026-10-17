// Parent notes (AC140), for example "no install on plain http". Stub until T53 fills it in: no notes yet.
import { el } from '../dom';

/** Returns the notes block for the top of the parent area. Empty for now. */
export function createParentNotes(): HTMLElement {
  return el('div', { class: 'parent-notes', attrs: { 'data-parent': 'notes' } });
}
