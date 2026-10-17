// Dinowinkel flow (T47): connects the shop screen to the points in the save, the dino store and the purchase.
// Services come from AppEnv. When saving is off the shop opens grey and nothing can be bought or written.
import { shopDinoCount } from '../core/economy';
import { openShopScreen } from '../ui/shop';
import { pointsText } from '../ui/pause-menu';
import type { AppEnv } from './app-env';
import { buyEgg, MSG_BUY_FAILED } from './purchase';
import type { Screens } from './screens';

export function openShop(screens: Screens, env: AppEnv): () => void {
  return openShopScreen({
    screens,
    saving: env.saving && env.db !== null,
    getPoints: async () => (await env.records?.get('economy'))?.points ?? 0,
    shopCount: () => shopDinoCount(env.dinos.dinos.map((d) => d.state), env.dinos.eggs.map((e) => e.egg)),
    buy: async (kind) => {
      const { db, queue } = env;
      if (!env.saving || !db || !queue) return { ok: false, reason: 'storage', note: MSG_BUY_FAILED, points: null };
      return buyEgg({ db, queue, dinos: env.dinos, clock: env.clock }, kind);
    },
    // The pause menu below read its points when it opened. Read them again now (it is still there).
    onClose: () => {
      void (async () => {
        const points = (await env.records?.get('economy'))?.points ?? 0;
        const line = document.querySelector('[data-pause="points"]');
        if (line) line.textContent = pointsText(points);
      })().catch(() => undefined);
    },
  });
}
