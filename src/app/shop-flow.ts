// Dinowinkel STUB (T44). T47 builds the real shop.
import type { Screens } from './screens';
import { openComingSoon } from '../ui/pause-menu';

export function openShop(screens: Screens): () => void {
  return openComingSoon(screens, 'Dinowinkel');
}
