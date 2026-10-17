// Lesboek STUB (T44). T46 builds the real one.
import type { AppEnv } from '../../app/app-env';
import type { Screens } from '../../app/screens';
import { openComingSoon } from '../pause-menu';

export function openLesboek(screens: Screens, _env: AppEnv): () => void {
  void _env;
  return openComingSoon(screens, 'Lesboek');
}
