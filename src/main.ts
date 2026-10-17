import './styles/tokens.css';
import './styles/base.css';
import { registerHook } from './dev/e2e-hooks';
import { createAudioUnlock } from './platform/audio-unlock';
import { installLockdown } from './platform/lockdown';
import { startScreenGuard } from './platform/screen-guard';
import { el } from './ui/dom';

installLockdown();
const guard = startScreenGuard();
const audio = createAudioUnlock();

const app = document.getElementById('app');
if (app) {
  app.append(el('h1', { text: 'Dino Blokwereld' }));
}

if (__E2E__) {
  registerHook('ready', () => true);
  registerHook('screenGuard', () => guard.state());
  registerHook('audioUnlocked', () => audio.isUnlocked());
}
