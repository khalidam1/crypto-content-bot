// ============================================================
// rank.js — تقييم واختيار أفضل عملة
// ============================================================

import { logger } from './logger.js';

export function rankCoins(coins) {
  // FIX 1: إذا كانت القائمة فارغة — أرجع فارغة بدل crash
  if (!coins?.length) {
    logger.warn('rankCoins: empty coins array');
    return [];
  }

  const scored = coins.map(coin => {
    let score = 0;

    // FIX 2: change24h قد يكون NaN من Binance — نتعامل معه
    const change24h = isNaN(coin.change24h) ? 0 : coin.change24h;
    const change7d  = isNaN(coin.change7d)  ? 0 : (coin.change7d || 0);
    const absChange = Math.abs(change24h);
    const abs7d     = Math.abs(change7d);

    // ── نقاط قوة الحركة (0-35) ──
    // تراكمية: عملة +15% تأخذ 10+10+10+5 = 35 نقطة
    if (absChange > 3)  score += 10;
    if (absChange > 5)  score += 10;
    if (absChange > 10) score += 10;
    if (absChange > 15) score += 5;

    // ── نقاط حجم التداول (0-20) ──
    if      (coin.volume24h > 1_000_000_000) score += 20;
    else if (coin.volume24h > 500_000_000)   score += 15;
    else if (coin.volume24h > 100_000_000)   score += 10;
    else if (coin.volume24h > 50_000_000)    score += 5;

    // ── نقاط الـ Trending (0-15) ──
    if (coin.isTrending) score += 15;

    // ── نقاط الزخم الأسبوعي (0-10) ──
    if      (abs7d > 20) score += 10;
    else if (abs7d > 10) score += 7;
    else if (abs7d > 5)  score += 4;

    // ── نقاط العملة (0-10) ──
    if      (['BTC', 'ETH'].includes(coin.symbol))           score += 10;
    else if (['SOL', 'BNB', 'XRP'].includes(coin.symbol))    score += 7;
    else if (['ADA', 'AVAX', 'DOGE'].includes(coin.symbol))  score += 5;
    else                                                      score += 3;

    // ── نقاط الاتجاه (0-10) ──
    if (change24h > 0) score += 10; // صعود
    else               score += 5;  // هبوط — أيضاً محتوى قوي

    return { ...coin, change24h, change7d, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}
