// ============================================================
// time.js — تقييم توقيت النشر
// مبني على أوقات ذروة Binance Square (UTC)
// ============================================================

import { CONFIG } from './config.js';

export function getTimeScore() {
  const now  = new Date();
  const hour = now.getUTCHours();

  // FIX: time.js كانت تتجاهل CONFIG.PEAK_HOURS تماماً
  // الآن تقرأ منه مباشرة
  const P = CONFIG.PEAK_HOURS;

  let score, label, advice, marketSession;

  if (hour >= P.US_SESSION.start && hour <= P.US_SESSION.end) {
    score = P.US_SESSION.score;
    label = 'Peak 🔥🔥';
    advice = 'Best time — US market session';
    marketSession = 'US Market';
  } else if (hour >= P.EU_SESSION.start && hour <= P.EU_SESSION.end) {
    score = P.EU_SESSION.score;
    label = 'Excellent 🔥';
    advice = 'Great time — European market session';
    marketSession = 'EU Market';
  } else if (hour >= P.ASIA_SESSION.start && hour <= P.ASIA_SESSION.end) {
    score = P.ASIA_SESSION.score;
    label = 'Good ✅';
    advice = 'Asian session — active crypto traders';
    marketSession = 'Asia Market';
  } else if (hour >= P.LATE_US.start && hour <= P.LATE_US.end) {
    score = P.LATE_US.score;
    label = 'Decent 🟡';
    advice = 'Late US — decent engagement';
    marketSession = 'Late US';
  } else {
    score = P.OFF_HOURS.score;
    label = 'Weak 😴';
    advice = 'Low activity — consider waiting';
    marketSession = 'Off Hours';
  }

  return { score, label, advice, marketSession, utcHour: hour, timestamp: now.toISOString() };
}
