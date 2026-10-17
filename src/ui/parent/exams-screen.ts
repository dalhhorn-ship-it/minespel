// Examens section of the parent area. Stub until its task fills it in.
import { el } from '../dom';
import { onTap } from '../tap';
import type { ParentSection, ParentSectionContext } from './parent-shell';

export function createExamsScreen(ctx: ParentSectionContext): ParentSection {
  const back = el('button', { class: 'parent-btn', text: 'Terug', attrs: { type: 'button', 'data-parent': 'section-back' } });
  const stopTap = onTap(back, () => ctx.back());
  const node = el('section', { class: 'parent-section', attrs: { 'data-parent-section': 'exams', 'aria-label': 'Examens' } }, [
    el('h2', { class: 'parent-section-title', text: 'Examens' }),
    el('p', { class: 'parent-soon', text: 'Komt nog' }),
    back,
  ]);
  return { node, destroy: stopTap };
}
