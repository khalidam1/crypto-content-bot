// ============================================================
// pumpCheck.js — كشف التلاعب والضخ الوهمي
// ============================================================

import { CONFIG } from './config.js';
const P = CONFIG.PUMP_DETECTION;

export function isFakePump(coin) {
  if (!coin) return { fake: false, reason: null };

  const { change24h, volume24h, marketCap, high24h, low24h } = coin;
  const absChange = Math.abs(change24h);

  // ── مؤشر 1: ارتفاع كبير مع حجم ضعيف جداً ──
  if (absChange > P.MAX_CHANGE_WITH_LOW_VOLUME && volume24h < P.MIN_VOLUME_FOR_BIG_MOVE) {
    return {
      fake: true,
      reason: `Suspicious: ${absChange.toFixed(1)}% move with only $${(volume24h/1e6).toFixed(0)}M volume`
    };
  }

  // ── مؤشر 2: نسبة الحجم إلى الـ Market Cap ضعيفة جداً ──
  if (marketCap > 0) {
    const volumeToMcap = volume24h / marketCap;
    if (absChange > P.MIN_CHANGE_FOR_RATIO_CHECK && volumeToMcap < P.MIN_VOLUME_MCAP_RATIO) {
      return {
        fake: true,
        reason: `Low volume/mcap ratio (${(volumeToMcap * 100).toFixed(1)}%) despite ${absChange.toFixed(1)}% move`
      };
    }
  }

  // ── مؤشر 3: حركة سعرية متطرفة في يوم واحد ──
  if (high24h && low24h && low24h > 0) {
    const range = ((high24h - low24h) / low24h) * 100;
    if (range > 40 && volume24h < P.MIN_VOLUME_FOR_BIG_MOVE) {
      return {
        fake: true,
        reason: `Extreme price range (${range.toFixed(1)}%) with insufficient volume`
      };
    }
  }

  return { fake: false, reason: null };
}
