// ============================================================
// sentiment.js — تحليل مشاعر السوق
// المصدر: Alternative.me Fear & Greed Index (مجاني)
// ============================================================

import { logger } from './logger.js';

const FALLBACK = {
  value: 50, signal: 'Neutral', emoji: '😐',
  trend: 'stable', contentHint: 'Balanced market — analysis content works best',
  label: 'Neutral'
};

export async function getSentiment() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://api.alternative.me/fng/?limit=2', {
      headers: { 'User-Agent': 'CryptoBot/1.0' },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) throw new Error(`FNG HTTP ${res.status}`);

    const data = await res.json();

    // FIX: تحقق من وجود البيانات قبل الاستخدام
    if (!data?.data?.[0]) return FALLBACK;

    const today     = data.data[0];
    const yesterday = data.data[1];

    const value     = parseInt(today.value);
    const prevValue = yesterday ? parseInt(yesterday.value) : value;
    const trend     = value > prevValue ? 'improving' : value < prevValue ? 'declining' : 'stable';

    let emoji, signal, contentHint;

    if (value >= 75) {
      emoji = '🚨'; signal = 'Extreme Greed';
      contentHint = 'Market overheated — contrarian content performs well';
    } else if (value >= 55) {
      emoji = '🔥'; signal = 'Greed';
      contentHint = 'Bullish sentiment — momentum content works best';
    } else if (value >= 45) {
      emoji = '😐'; signal = 'Neutral';
      contentHint = 'Balanced market — analysis content works best';
    } else if (value >= 25) {
      emoji = '😨'; signal = 'Fear';
      contentHint = 'Fear in market — opportunity-framing content works well';
    } else {
      emoji = '💀'; signal = 'Extreme Fear';
      contentHint = 'Panic selling — strong contrarian content opportunity';
    }

    return { value, signal, emoji, trend, contentHint, label: today.value_classification };

  } catch (err) {
    logger.warn('Sentiment API unavailable — using fallback', { error: err.message });
    return FALLBACK;
  }
}
