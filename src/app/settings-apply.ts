// Applies kid-screen settings such as Groter lettertype (T49, AC154).
// Sets `--font-scale` on the document root so kid screens scale by 25% while `.parent` stays at 16px.

import type { Sound } from '../audio/sound';
import type { SettingsRecord } from '../storage/schema';
import type { TimerDriver } from './timer-driver';

export function applyKidFontScale(largeFont: boolean, doc: Document = document): void {
  const root = doc.documentElement;
  if (largeFont) {
    root.style.setProperty('--font-scale', '1.25');
    root.setAttribute('data-large-font', 'true');
  } else {
    root.style.setProperty('--font-scale', '1');
    root.removeAttribute('data-large-font');
  }
}

export function applySettingsToRuntime(
  settings: SettingsRecord,
  deps: {
    sound?: Pick<Sound, 'setEnabled' | 'setVolume'>;
    timerDriver?: Pick<TimerDriver, 'setBreakEveryMinutes' | 'setBreakWarningEnabled'>;
    doc?: Document;
  },
): void {
  applyKidFontScale(Boolean(settings.largeFont), deps.doc);
  deps.sound?.setEnabled(settings.soundEffectsEnabled !== false);
  deps.sound?.setVolume(typeof settings.volume === 'number' ? settings.volume : 0.7);
  deps.timerDriver?.setBreakEveryMinutes(settings.breakEveryMinutes || 5);
  deps.timerDriver?.setBreakWarningEnabled(settings.breakWarningEnabled !== false);
}
