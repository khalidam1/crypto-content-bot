import { logger } from './logger.js';
import { CONFIG } from './config.js';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI.MODEL}:generateContent`;

export async function generateContent({ coin, sentiment, news, social, apiKey }) {

  if (!apiKey) return fallback(coin);

  const prompt = `
You are a controversial crypto trader on Binance Square.

RULES:
- Strong opinion only (bullish OR bearish)
- No neutrality
- Create debate and disagreement
- Hook must be shocking
- 5–7 lines max
- End with question
- No generic analysis phrases

COIN:
${coin.symbol}
Change: ${coin.change24h}%
Volume: ${coin.volume24h}
Sentiment: ${sentiment.signal}

NEWS:
${news?.map(n => n.title).join('\n') || "No news"}

SOCIAL:
${social?.galaxyScore || 0}

Write ONLY the post.
`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.95,
        maxOutputTokens: 400
      }
    })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || fallback(coin);
}

function fallback(coin) {
  return `
Most traders are misreading ${coin.symbol} right now.

This move is either early accumulation or emotional overreaction.

The crowd is usually wrong at this stage.

Are you following the noise or reading the structure?
`;
}