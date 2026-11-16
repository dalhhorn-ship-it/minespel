// The picture of a gear item for cards and lists (v19): a tile with the emoji of its slot. Decoration only.
import { SLOT_ICON, type GearItem } from '../knights/gear';
import { el } from './dom';

/** The emoji of the item's slot. */
export const gearEmoji = (item: Pick<GearItem, 'slot'>): string => SLOT_ICON[item.slot];

/** A tile (`span.gear-icon.gear-icon-<slot>`) with the slot emoji, hidden from screen readers. */
export function gearIcon(item: Pick<GearItem, 'slot'>): HTMLElement {
  return el('span', { class: `gear-icon gear-icon-${item.slot}`, text: gearEmoji(item), attrs: { 'aria-hidden': 'true' } });
}
