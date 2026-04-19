// ============================================================
// scan.js — جلب بيانات السوق
// المصادر: Binance + CoinGecko + CoinMarketCap
// ============================================================

import { CONFIG } from './config.js';
import { logger } from './logger.js';

const FOCUS_COINS = CONFIG.FOCUS_COINS;

// FIX 1: Timeout helper — بدونه قد يتجمد Cloudflare Worker
async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────
// Binance: سعر + حجم + تغير 24 ساعة
// ─────────────────────────────────────────
async function fetchBinance() {
  try {
    // FIX 5: Use data.binance.com endpoint to avoid geo-blocking (HTTP 451 error)
    const res = await fetchWithTimeout(
      'https://data.binance.com/api/v3/ticker/24hr',
      { headers: { 'User-Agent': 'CryptoBot/1.0' } }
    );

    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();

    // FIX 2: MATIC أصبح POL على Binance في 2024 — نعالج الاثنين
    const SYMBOL_MAP = { 'POL': 'MATIC' };

    return data
      .filter(c => {
        if (!c.symbol.endsWith('USDT')) return false;
        const raw = c.symbol.replace('USDT', '');
        const sym = SYMBOL_MAP[raw] || raw;
        return FOCUS_COINS.includes(sym);
      })
      .map(c => {
        const raw    = c.symbol.replace('USDT', '');
        const symbol = SYMBOL_MAP[raw] || raw;
        return {
          symbol,
          price:     parseFloat(c.lastPrice),
          change24h: parseFloat(c.priceChangePercent),
          volume24h: parseFloat(c.quoteVolume),
          high24h:   parseFloat(c.highPrice),
          low24h:    parseFloat(c.lowPrice),
        };
      })
      .filter(c => c.price > 0 && c.volume24h > 0);

  } catch (err) {
    logger.error('Binance fetch failed', { error: err.message });
    return [];
  }
}

// ─────────────────────────────────────────
// CoinGecko: market cap + تغير 7 أيام + rank
// ─────────────────────────────────────────
async function fetchCoinGecko() {
  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets' +
      '?vs_currency=usd&order=market_cap_desc&per_page=50&page=1' +
      '&price_change_percentage=7d';

    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'CryptoBot/1.0' }
    });

    // FIX 3: CoinGecko يُرجع 429 عند تجاوز Rate Limit — نتعامل معه
    if (res.status === 429) {
      logger.warn('CoinGecko rate limit hit — skipping gecko data');
      return {};
    }
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) return {};

    const geckoMap = {};
    data.forEach(coin => {
      const sym = coin.symbol.toUpperCase();
      if (FOCUS_COINS.includes(sym)) {
        geckoMap[sym] = {
          marketCap: coin.market_cap || 0,
          change7d:  coin.price_change_percentage_7d_in_currency || 0,
          rank:      coin.market_cap_rank || 99,
        };
      }
    });

    return geckoMap;
  } catch (err) {
    logger.error('CoinGecko fetch failed', { error: err.message });
    return {};
  }
}

// ─────────────────────────────────────────
// CoinMarketCap: trending coins
// ─────────────────────────────────────────
async function fetchTrending(cmcApiKey) {
  if (!cmcApiKey) return [];

  try {
    const res = await fetchWithTimeout(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/gainers-losers?limit=10',
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'User-Agent': 'CryptoBot/1.0'
        }
      }
    );

    if (!res.ok) {
      // Enhanced logging for CMC
      const errorBody = await res.text();
      logger.error('CMC fetch failed', { status: res.status, body: errorBody });
      return [];
    } 

    const data = await res.json();
    const trending = data?.data?.gainers || [];

    return trending.map(c => c.symbol).filter(s => FOCUS_COINS.includes(s));
  } catch (err) {
    logger.error('CMC fetch failed', { error: err.message });
    return [];
  }
}

// ─────────────────────────────────────────
// الدالة الرئيسية: دمج كل البيانات
// ─────────────────────────────────────────
export async function getMarketData(cmcApiKey) {
  const [binanceCoins, geckoMap, trendingList] = await Promise.all([
    fetchBinance(),
    fetchCoinGecko(),
    fetchTrending(cmcApiKey)
  ]);

  // FIX 4: إذا فشل Binance الكل يفشل — نتأكد من وجود بيانات
  if (!binanceCoins.length) {
    logger.error('No Binance data — cannot continue');
    return [];
  }

  return binanceCoins.map(coin => ({
    ...coin,
    marketCap:  geckoMap[coin.symbol]?.marketCap || 0,
    change7d:   geckoMap[coin.symbol]?.change7d  || 0,
    rank:       geckoMap[coin.symbol]?.rank       || 99,
    isTrending: trendingList.includes(coin.symbol)
  }));
}
