// ============================================================
// news.js — جلب أخبار العملة من CryptoPanic
// ============================================================

import { logger } from './logger.js';

export async function getCoinNews(symbol, apiKey) {
  if (!apiKey) return [];

  try {
    // FIX: أضفنا timeout + معالجة HTTP errors
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const url =
      `https://cryptopanic.com/api/v1/posts/` +
      `?auth_token=${apiKey}&currencies=${symbol}&kind=news&filter=hot&public=true`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'CryptoBot/1.0' },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) throw new Error(`CryptoPanic HTTP ${res.status}`);

    const data = await res.json();
    if (!data.results?.length) return [];

    return data.results.slice(0, 2).map(post => ({
      title:     post.title,
      // FIX: إذا لم يكن هناك votes — نُصنفه كـ neutral بدل crash
      sentiment: (post.votes?.positive ?? 0) > (post.votes?.negative ?? 0)
        ? 'bullish'
        : 'bearish',
      source: post.source?.title || 'Unknown'
    }));

  } catch (err) {
    logger.warn('CryptoPanic unavailable', { error: err.message });
    return [];
  }
}
