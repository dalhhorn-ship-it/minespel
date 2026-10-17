// Dinowinkel STUB (T44). T47 builds the real shop.
import type { AppEnv } from './app-env';
import type { Screens } from './screens';
import { openComingSoon } from '../ui/pause-menu';

export function openShop(screens: Screens, _env: AppEnv): () => void {
  void _env;
  return openComingSoon(screens, 'Dinowinkel');
}
