// ============================================================
// ai.js — توليد المحتوى باستخدام Gemini
// ============================================================

import { logger } from './logger.js';
import { CONFIG }  from './config.js';

// FIX 5: gemini-1.5-flash هو الأحدث والأسرع والمجاني
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI.MODEL}:generateContent`;

export async function generateContent({ coin, sentiment, news, social, apiKey }) {
  if (!apiKey) {
    logger.warn('No Gemini API key — using fallback content');
    return buildFallback(coin, sentiment);
  }

  const direction = coin.change24h >= 0 ? 'up' : 'down';
  const absChange = Math.abs(coin.change24h).toFixed(2);
  const arrow     = coin.change24h >= 0 ? '📈' : '📉';
  const volume    = (coin.volume24h / 1_000_000).toFixed(0);

  // بناء سياق الأخبار
  const newsContext = news?.length
    ? `\nRecent news provided:\n${news.map(n => `- ${n.title} (${n.sentiment})`).join('\n')}`
    : '\nINTERNAL_ACTION: Search for recent news about this coin to inform your analysis.';

  // بناء سياق السوشيال
  // FIX 6: كان يفترض socialVolume موجود دائماً — أضفنا optional chaining
  const socialContext = social
    ? `\nSocial: Galaxy Score ${social.galaxyScore}/100, ` +
      `Volume ${(social.socialVolume ?? 0).toLocaleString()} mentions (${social.socialSignal})`
    : '';

  const prompt = `You are an expert crypto content writer for Binance Square.

COIN DATA:
- Symbol: ${coin.symbol}
- Price: $${coin.price.toLocaleString()}
- 24h Change: ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}% ${arrow}
- 7d Change: ${coin.change7d >= 0 ? '+' : ''}${(coin.change7d || 0).toFixed(2)}%
- Volume 24h: $${volume}M
- Market Cap Rank: #${coin.rank}
- Trending: ${coin.isTrending ? 'YES 🔥' : 'No'}
${newsContext}
${socialContext}

MARKET SENTIMENT:
- Fear & Greed: ${sentiment.value}/100 (${sentiment.signal} ${sentiment.emoji})
- Trend: ${sentiment.trend}
- Hint: ${sentiment.contentHint}

WRITE a Binance Square post following these STRICT rules:
1. Start with a powerful hook — bold statement or question (1 line)
2. Short analysis: what is happening and why it matters (3-4 lines)
3. Two clear scenarios:
   → Bullish: what happens if momentum continues
   → Bearish: what to watch out for
4. One engaging question at the end to boost comments
5. One short risk disclaimer at the bottom
6. Natural emojis (not excessive)
7. Sound like a real trader, NOT a robot
8. Do NOT mention other coins
9. Do NOT give financial advice
10. Length: 150-250 words exactly
11. No hashtags

Write ONLY the post. Nothing else. No intro, no explanation.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:    CONFIG.GEMINI.TEMPERATURE,
          maxOutputTokens: CONFIG.GEMINI.MAX_TOKENS,
          topP: 0.9
        }
      })
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Gemini HTTP ${res.status}: ${errData?.error?.message || 'unknown'}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('Empty response from Gemini');

    logger.success('Content generated successfully');
    return text.trim();

  } catch (err) {
    logger.error('Gemini failed — using fallback', { error: err.message });
    return buildFallback(coin, sentiment);
  }
}

// Fallback content احتياطي إذا فشل Gemini
function buildFallback(coin, sentiment) {
  const arrow  = coin.change24h >= 0 ? '📈' : '📉';
  const move   = coin.change24h >= 0 ? 'surging' : 'dropping';
  const abs    = Math.abs(coin.change24h).toFixed(2);
  const volume = (coin.volume24h / 1_000_000).toFixed(0);

  return `Is this ${coin.symbol} move the real deal or a trap? ${arrow}\n\n${coin.symbol} is ${move} ${abs}% in the last 24 hours with $${volume}M in volume. ` +
`Market sentiment sits at ${sentiment.value}/100 — ${sentiment.signal}.\n\nBullish case: if volume sustains and buyers hold key levels, we could see continuation toward new highs.\n\nBearish case: moves without strong fundamentals often retrace. Watch the volume closely — if it dries up, a pullback is likely.\n\nThe market is sending mixed signals right now. What's your read — is ${coin.symbol} ready to run or is this a fakeout?\n\n⚠️ Not financial advice. Always DYOR.`;
}
