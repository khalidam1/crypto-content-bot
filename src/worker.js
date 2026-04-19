// ============================================================
// worker.js — العقل الرئيسي للبوت
// Cloudflare Worker Entry Point
// ============================================================

import { getMarketData }             from './scan.js';
import { rankCoins }                 from './rank.js';
import { getSentiment }              from './sentiment.js';
import { isFakePump }                from './pumpCheck.js';
import { getCoinNews }               from './news.js';
import { getSocialData }             from './social.js';
import { getTimeScore }              from './time.js';
import { generateContent }           from './ai.js';
import { calcViralScore }            from './score.js';
import { sendToDiscord }             from './discord.js';
import { getRecentCoins, saveRecentCoin } from './memory.js';
import { logger }                    from './logger.js';
import { CONFIG }                    from './config.js';

// ============================================================
// الدالة الرئيسية
// ============================================================
async function runBot(env) {
  logger.info('🚀 Crypto Content Bot starting...');

  try {
    // ── 1. جلب بيانات السوق ──
    logger.info('Fetching market data...');
    const allCoins = await getMarketData(env.CMC_API_KEY);

    if (!allCoins.length) throw new Error('No market data available');

    // ── 2. تصفية العملات الضعيفة والمكررة ──
    const recentCoins   = await getRecentCoins(env.BOT_MEMORY);
    const eligibleCoins = allCoins.filter(c =>
      c.volume24h >= CONFIG.MIN_VOLUME_USD &&
      !recentCoins.includes(c.symbol)
    );
    const coinsToRank = eligibleCoins.length >= 3 ? eligibleCoins : allCoins;

    // ── 3. ترتيب العملات ──
    logger.info('Ranking coins...');
    const ranked = rankCoins(coinsToRank);
    if (!ranked.length) throw new Error('Ranking failed — no coins returned');

    // ── 4. اختيار العملة مع تجنب التلاعب ──
    let selectedCoin = null;
    let pumpCheck    = { fake: false, reason: null };

    for (const coin of ranked.slice(0, 5)) {
      const pump = isFakePump(coin);
      if (!pump.fake) {
        selectedCoin = coin;
        break;
      }
      logger.warn(`Skipping ${coin.symbol}: ${pump.reason}`);
      pumpCheck = pump;
    }

    // Fallback: اختر الأول حتى لو مشبوه
    if (!selectedCoin) {
      selectedCoin = ranked[0];
      pumpCheck    = isFakePump(selectedCoin);
    }

    logger.success(`Selected: ${selectedCoin.symbol} (score: ${selectedCoin.score})`);

    // ── 5. البيانات المساعدة بالتوازي ──
    logger.info('Fetching supporting data...');
    const [sentiment, news, social, timeScore] = await Promise.all([
      getSentiment(),
      getCoinNews(selectedCoin.symbol, env.CRYPTOPANIC_API_KEY),
      getSocialData(selectedCoin.symbol, env.LUNARCRUSH_API_KEY),
      Promise.resolve(getTimeScore())
    ]);

    // ── 6. توليد المحتوى ──
    logger.info('Generating content with Gemini...');
    const content = await generateContent({
      coin: selectedCoin, sentiment, news, social,
      apiKey: env.GEMINI_API_KEY
    });

    // ── 7. حساب Viral Score ──
    const viralScore = calcViralScore({ coin: selectedCoin, sentiment, timeScore, social });
    logger.info(`Viral Score: ${viralScore.score}/100 — ${viralScore.label}`);

    // ── 8. تحقق من الحد الأدنى ──
    if (viralScore.score < CONFIG.MIN_VIRAL_SCORE) {
      logger.warn(`Score too low (${viralScore.score}) — skipping`);
      return { success: false, reason: 'low_viral_score', score: viralScore.score };
    }

    // ── 9. حفظ في الذاكرة ──
    await saveRecentCoin(env.BOT_MEMORY, selectedCoin.symbol);

    // ── 10. إرسال إلى Discord ──
    logger.info('Sending to Discord...');
    await sendToDiscord({
      webhookUrl: env.DISCORD_WEBHOOK_URL,
      coin: selectedCoin, sentiment, timeScore,
      viralScore, content, news, social, pumpCheck
    });

    logger.success(`Done — ${selectedCoin.symbol} | Viral: ${viralScore.score}`);
    return { success: true, coin: selectedCoin.symbol, viralScore: viralScore.score };

  } catch (err) {
    logger.error('Bot error', { message: err.message });

    // إرسال رسالة خطأ إلى Discord
    try {
      await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '❌ Bot Error',
            color: 0xff0000,
            description: `\`\`\`${err.message}\`\`\``,
            footer: { text: 'Check Cloudflare Workers logs for details' }
          }]
        })
      });
    } catch {}

    return { success: false, error: err.message };
  }
}

// ============================================================
// Cloudflare Worker Handler (Ignored in Node.js environment)
// ============================================================
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBot(env));
  },
  async fetch(request, env, ctx) {
    // ... (fetch handler logic remains the same)
  }
};

// ============================================================
// Direct Invocation for Node.js / GitHub Actions
// ============================================================
// This block runs only if the script is executed directly with Node.js
if (process.env.NODE_ENV !== 'test' && typeof scheduled === 'undefined') {
  // In a Node.js environment (like GitHub Actions), `process.env` holds the secrets.
  // We pass it to runBot, which expects an object with keys like `GEMINI_API_KEY`.
  runBot(process.env).catch(err => {
    logger.error('Fatal error in direct invocation', { message: err.message });
    process.exit(1);
  });
}
