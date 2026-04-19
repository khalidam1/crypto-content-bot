// ============================================================
// score.js — حساب قابلية الانتشار (Viral Score)
// مبني على بيانات حقيقية — مجموع النقاط = 100
// ============================================================

export function calcViralScore({ coin, sentiment, timeScore, social }) {
  let score = 0;
  const breakdown = {};

  // FIX 5: change24h قد يكون NaN — نؤمّنه
  const absChange = Math.abs(isNaN(coin.change24h) ? 0 : coin.change24h);

  // ── 1. قوة حركة السعر (0-30) ──
  if      (absChange > 15) { score += 30; breakdown.priceMove = 30; }
  else if (absChange > 10) { score += 22; breakdown.priceMove = 22; }
  else if (absChange > 5)  { score += 15; breakdown.priceMove = 15; }
  else if (absChange > 3)  { score += 8;  breakdown.priceMove = 8;  }
  else                     { score += 3;  breakdown.priceMove = 3;  }

  // ── 2. حالة السوق (0-20) ──
  // السوق المتطرف = محتوى أكثر تفاعلاً
  const fng = sentiment?.value ?? 50;
  if      (fng >= 80 || fng <= 20) { score += 20; breakdown.sentiment = 20; }
  else if (fng >= 65 || fng <= 35) { score += 15; breakdown.sentiment = 15; }
  else if (fng >= 55 || fng <= 45) { score += 10; breakdown.sentiment = 10; }
  else                             { score += 5;  breakdown.sentiment = 5;  }

  // ── 3. توقيت النشر (0-20) ──
  const timePoints = Math.round((timeScore?.score ?? 50) * 0.2);
  score += timePoints;
  breakdown.timing = timePoints;

  // ── 4. الضجة الاجتماعية (0-15) ──
  if (social) {
    const gs = social.galaxyScore ?? 0;
    if      (gs >= 70) { score += 15; breakdown.social = 15; }
    else if (gs >= 50) { score += 10; breakdown.social = 10; }
    else if (gs >= 30) { score += 5;  breakdown.social = 5;  }
    else               { score += 2;  breakdown.social = 2;  }
  } else {
    breakdown.social = 0;
  }

  // ── 5. عامل العملة (0-10) ──
  if      (['BTC', 'ETH'].includes(coin.symbol))           { score += 10; breakdown.coin = 10; }
  else if (['SOL', 'BNB', 'XRP'].includes(coin.symbol))    { score += 7;  breakdown.coin = 7;  }
  else if (['ADA', 'AVAX', 'DOGE'].includes(coin.symbol))  { score += 5;  breakdown.coin = 5;  }
  else                                                      { score += 3;  breakdown.coin = 3;  }

  // ── 6. Trending Bonus (0-5) ──
  if (coin.isTrending) { score += 5; breakdown.trending = 5; }
  else                 { breakdown.trending = 0; }

  const finalScore = Math.min(Math.round(score), 100);

  let label, advice;
  if      (finalScore >= 75) { label = '🔥 Viral Potential HIGH'; advice = 'Post immediately!'; }
  else if (finalScore >= 55) { label = '✅ Good Potential';       advice = 'Good to post'; }
  else if (finalScore >= 40) { label = '🟡 Average';             advice = 'Wait for better conditions'; }
  else                       { label = '⚠️ Low Potential';        advice = 'Wait for stronger signal'; }

  return { score: finalScore, label, advice, breakdown };
}
