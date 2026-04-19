// ============================================================
// score.js — Advanced Viral Scoring
// ============================================================

export function calcViralScore({ coin, sentiment, timeScore, social }) {
  let score = 0;

  // 📊 Market
  if (Math.abs(coin.change24h) > 5) score += 20;
  if (Math.abs(coin.change24h) > 10) score += 10;
  if (coin.volume24h > 1_000_000) score += 10;

  // 😨 Sentiment
  if (sentiment.signal === "FEAR") score += 20;
  else if (sentiment.signal === "GREED") score += 10;
  else score += 5;

  // 🕒 Time
  score += Math.floor(timeScore / 10);

  // 📱 Social
  if (social?.galaxyScore > 70) score += 10;
  if (social?.socialVolume > 50_000) score += 5;

  score = Math.min(score, 100);

  return {
    score,
    label:
      score >= 80 ? "🔥 High" :
      score >= 60 ? "🟡 Medium" :
      "🔴 Low"
  };
}