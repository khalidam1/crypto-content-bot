// ============================================================
// scan.js — جلب بيانات السوق
// المصادر: Binance + CoinGecko + CoinMarketCap
// ============================================================

import { CONFIG } from './config.js';
import { logger } from './logger.js';

const FOCUS_COINS = CONFIG.FOCUS_COINS;

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
  // FINAL FIX: Use a resilient, non-geoblocked public endpoint (api3)
  const url = 'https://api3.binance.com/api/v3/ticker/24hr';
  logger.info(`Attempting to fetch from Binance: ${url}`);
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { 'User-Agent': 'CryptoBot/1.0' } }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      // FINAL FIX: Corrected the logging to be compatible with Node.js environment
      const headers = Object.fromEntries(res.headers.entries());
      logger.error('Binance response was not OK', {
        status: res.status,
        headers: headers,
        body: errorBody,
      });
      throw new Error(`Binance HTTP ${res.status}`);
    }

    const data = await res.json();
    const SYMBOL_MAP = { 'POL': 'MATIC' };

    return data
      .filter(c => {
        if (!c.symbol.endsWith('USDT')) return false;
        const raw = c.symbol.replace('USDT', '');
        const sym = SYMBOL_MAP[raw] || raw;
        return FOCUS_COINS.includes(sym);
      })
      .map(c => {
        const raw = c.symbol.replace('USDT', '');
        const symbol = SYMBOL_MAP[raw] || raw;
        return {
          symbol,
          price: parseFloat(c.lastPrice),
          change24h: parseFloat(c.priceChangePercent),
          volume24h: parseFloat(c.quoteVolume),
          high24h: parseFloat(c.highPrice),
          low24h: parseFloat(c.lowPrice),
        };
      })
      .filter(c => c.price > 0 && c.volume24h > 0);

  } catch (err) {
    logger.error('Binance fetch failed in catch block', { error: err.message, stack: err.stack });
    return [];
  }
}

// Other functions remain the same...

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

  if (!binanceCoins || binanceCoins.length === 0) {
    logger.error('No Binance data was processed. Cannot continue.');
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
