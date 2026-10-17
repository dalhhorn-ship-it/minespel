// Lesboek STUB (T44). T46 builds the real one.
import type { Screens } from '../../app/screens';
import { openComingSoon } from '../pause-menu';

export function openLesboek(screens: Screens): () => void {
  return openComingSoon(screens, 'Lesboek');
}
