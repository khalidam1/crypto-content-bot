// ============================================================
// memory.js — ذاكرة البوت باستخدام Cloudflare KV
// ============================================================

import { logger } from './logger.js';
import { CONFIG }  from './config.js';

const MEMORY_KEY = 'recent_coins';

export async function getRecentCoins(kv) {
  // FIX 7: إذا لم يُمرر kv (مثلاً في بيئة اختبار) — نُرجع مصفوفة فارغة بأمان
  if (!kv) return [];
  try {
    const data = await kv.get(MEMORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveRecentCoin(kv, symbol) {
  if (!kv) return;
  try {
    const recent  = await getRecentCoins(kv);
    const updated = [symbol, ...recent.filter(s => s !== symbol)]
      .slice(0, CONFIG.MEMORY_SIZE);
    await kv.put(MEMORY_KEY, JSON.stringify(updated));
    logger.info(`Memory updated: ${updated.join(', ')}`);
  } catch (err) {
    logger.error('Memory save failed', { error: err.message });
  }
}
