// ============================================================
// social.js — تحليل الضجة الاجتماعية من LunarCrush
// ============================================================

import { logger } from './logger.js';

export async function getSocialData(symbol, apiKey) {
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    // FIX: LunarCrush v4 API endpoint الصحيح
    const res = await fetch(
      `https://lunarcrush.com/api4/public/coins/${symbol.toLowerCase()}/v1`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'CryptoBot/1.0'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timer);

    if (res.status === 401) {
      logger.warn('LunarCrush: invalid API key');
      return null;
    }
    if (res.status === 404) {
      logger.warn(`LunarCrush: ${symbol} not found`);
      return null;
    }
    if (!res.ok) throw new Error(`LunarCrush HTTP ${res.status}`);

    const data = await res.json();
    const coin = data?.data;
    if (!coin) return null;

    const galaxyScore  = coin.galaxy_score      || 0;
    const socialVolume = coin.social_volume_24h  || 0;
    const socialScore  = coin.social_score       || 0;

    const socialSignal =
      socialVolume > 10000 ? 'High 🔥' :
      socialVolume > 3000  ? 'Medium'  : 'Low';

    return { galaxyScore, socialVolume, socialScore, socialSignal };

  } catch (err) {
    logger.warn('LunarCrush unavailable', { error: err.message });
    return null;
  }
}
