// Extra oefenen STUB (T44). T46 builds the real flow. Practice is a learn screen (PRD 4.4).
import type { Screens } from './screens';
import { openComingSoon } from '../ui/pause-menu';

export function openPractice(screens: Screens): () => void {
  return openComingSoon(screens, 'Extra oefenen', 'learn');
}
