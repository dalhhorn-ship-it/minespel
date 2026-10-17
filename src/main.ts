import { registerHook } from './dev/e2e-hooks';

const app = document.getElementById('app');
if (app) {
  const title = document.createElement('h1');
  title.textContent = 'Dino Blokwereld';
  app.appendChild(title);
}

if (__E2E__) {
  registerHook('ready', () => true);
}
