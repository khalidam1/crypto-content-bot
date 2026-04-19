import { getMarketData } from './scan.js';
import { rankCoins } from './rank.js';
import { getSentiment } from './sentiment.js';
import { isFakePump } from './pumpCheck.js';
import { getCoinNews } from './news.js';
import { getSocialData } from './social.js';
import { getTimeScore } from './time.js';
import { generateContent } from './ai.js';
import { calcViralScore } from './score.js';
import { sendToDiscord } from './discord.js';
import { getRecentCoins, saveRecentCoin } from './memory.js';
import { savePost } from './tracker.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';

async function runBot(env) {

  logger.info("🚀 Bot started");

  try {

    const coins = await getMarketData(env.CMC_API_KEY);

    const recent = await getRecentCoins(env.BOT_MEMORY);

    const filtered = coins.filter(c =>
      c.volume24h >= CONFIG.MIN_VOLUME_USD &&
      !recent.includes(c.symbol)
    );

    const ranked = rankCoins(filtered.length ? filtered : coins);

    let selected = ranked[0];

    if (isFakePump(selected).fake) {
      selected = ranked[1];
    }

    const sentiment = await getSentiment();
    const news = await getCoinNews(selected.symbol, env.CRYPTOPANIC_API_KEY);
    const social = await getSocialData(selected.symbol, env.LUNARCRUSH_API_KEY);
    const timeScore = getTimeScore();

    const content = await generateContent({
      coin: selected,
      sentiment,
      news,
      social,
      apiKey: env.GEMINI_API_KEY
    });

    const viral = calcViralScore({
      coin: selected,
      sentiment,
      timeScore,
      social
    });

    // 📊 TRACKING
    await savePost(env, {
      coin: selected.symbol,
      score: viral.score,
      sentiment: sentiment.signal,
      timeScore,
      content,
      type: "controversial"
    });

    if (viral.score < CONFIG.MIN_VIRAL_SCORE) {
      logger.warn("Skipped low score");
      return;
    }

    await saveRecentCoin(env.BOT_MEMORY, selected.symbol);

    await sendToDiscord({
      webhookUrl: env.DISCORD_WEBHOOK_URL,
      coin: selected,
      sentiment,
      viralScore: viral,
      content
    });

    logger.success(`Done ${selected.symbol} | ${viral.score}`);

  } catch (err) {
    logger.error(err.message);
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBot(env));
  }
};