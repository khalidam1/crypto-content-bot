// ============================================================
// discord.js — إرسال النتائج إلى Discord Webhook

// ============================================================

import { logger } from './logger.js';

// Discord يقبل حتى 2000 حرف في content و 6000 في embeds
const DISCORD_MAX = 4000;

// ── إرسال embed واحد إلى Discord ──
async function sendEmbed(webhookUrl, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload)
    });

    clearTimeout(timer);

    // Discord يُرجع 204 عند النجاح (بدون body)
    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      throw new Error(`Discord HTTP ${res.status}: ${err}`);
    }

    // تجنب Rate Limit: Discord يسمح بـ 5 رسائل كل 2 ثانية
    await new Promise(r => setTimeout(r, 500));

  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── الدالة الرئيسية ──
export async function sendToDiscord({
  webhookUrl,
  coin, sentiment, timeScore, viralScore,
  content, news, social, pumpCheck
}) {
  if (!webhookUrl) {
    logger.error('Missing Discord Webhook URL — skipping send');
    return false;
  }

  const direction   = coin.change24h >= 0 ? '📈' : '📉';
  const volume      = (coin.volume24h / 1_000_000).toFixed(0);
  const mcap        = coin.marketCap > 0
    ? `$${(coin.marketCap / 1_000_000_000).toFixed(2)}B`
    : 'N/A';
  const change24Str = `${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%`;
  const change7Str  = `${(coin.change7d || 0) >= 0 ? '+' : ''}${(coin.change7d || 0).toFixed(2)}%`;

  // لون الـ embed حسب الاتجاه
  const color = coin.change24h >= 0 ? 0x00ff88 : 0xff4444;

  // ── رسالة 1: بيانات السوق والتقييم ──
  try {
    const marketEmbed = {
      embeds: [{
        title: `🤖 Crypto Content Bot — ${coin.symbol}`,
        color,
        fields: [
          // بيانات العملة
          {
            name: '🪙 Coin Info',
            value: [
              `**Symbol:** ${coin.symbol} | Rank #${coin.rank}`,
              `**Price:** $${coin.price.toLocaleString()}`,
              `**24h:** ${direction} ${change24Str}`,
              `**7d:** ${change7Str}`,
              `**Volume:** $${volume}M`,
              `**MCap:** ${mcap}`,
              coin.isTrending ? `🔥 **TRENDING NOW**` : '',
              pumpCheck?.fake ? `⚠️ **PUMP ALERT:** ${pumpCheck.reason}` : '',
            ].filter(Boolean).join('\n'),
            inline: false
          },
          // حالة السوق
          {
            name: '📊 Market Mood',
            value: [
              `${sentiment.emoji} **${sentiment.signal}** — ${sentiment.value}/100`,
              `Trend: ${sentiment.trend}`,
              social ? `🌐 Social: ${social.socialSignal} | Galaxy: ${social.galaxyScore}/100` : '',
            ].filter(Boolean).join('\n'),
            inline: true
          },
          // التوقيت والتقييم
          {
            name: '🎯 Score',
            value: [
              `🕐 ${timeScore.label} (${timeScore.score}/100)`,
              `💡 ${timeScore.marketSession}`,
              `🎯 Viral: **${viralScore.score}/100**`,
              `${viralScore.label}`,
            ].join('\n'),
            inline: true
          },
        ],
        footer: { text: `Crypto Content Bot • ${new Date().toUTCString()}` }
      }]
    };

    await sendEmbed(webhookUrl, marketEmbed);
    logger.info('Discord: market embed sent');
  } catch (err) {
    logger.error('Discord: market embed failed', { error: err.message });
  }

  // ── رسالة 2: الأخبار (إن وجدت) ──
  if (news?.length > 0) {
    try {
      const newsEmbed = {
        embeds: [{
          title: `📰 Latest News — ${coin.symbol}`,
          color: 0x5865f2,
          description: news
            .map(n => `• **${n.title}**\n  _${n.sentiment} — ${n.source}_`)
            .join('\n\n'),
          footer: { text: 'Source: CryptoPanic' }
        }]
      };

      await sendEmbed(webhookUrl, newsEmbed);
      logger.info('Discord: news embed sent');
    } catch (err) {
      logger.warn('Discord: news embed failed', { error: err.message });
    }
  }

  // ── رسالة 3: المحتوى الجاهز ──
  try {
    // قطّع المحتوى إذا كان طويلاً
    const contentChunks = chunkText(content, DISCORD_MAX);

    for (let i = 0; i < contentChunks.length; i++) {
      const isFirst = i === 0;
      const isLast  = i === contentChunks.length - 1;

      const contentEmbed = {
        embeds: [{
          title: isFirst ? `✍️ Content Ready — Post on Binance Square` : `✍️ Content (continued)`,
          color: 0xf0b90b, // لون Binance الذهبي
          description: contentChunks[i],
          footer: isLast
            ? { text: 'Copy → Edit if needed → Post on Binance Square 👆' }
            : { text: `Part ${i + 1} of ${contentChunks.length}` }
        }]
      };

      await sendEmbed(webhookUrl, contentEmbed);
    }

    logger.success('Discord: all messages sent successfully');
    return true;

  } catch (err) {
    logger.error('Discord: content embed failed', { error: err.message });
    return false;
  }
}

// ── تقسيم النص الطويل ──
function chunkText(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let current  = '';

  for (const line of text.split('\n')) {
    const candidate = current ? current + '\n' + line : line;
    if (candidate.length > maxLength) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
