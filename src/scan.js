// ============================================================
// scan.js — جلب بيانات السوق
// المصدر الأساسي: CoinGecko
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

// We need to map our Symbols (BTC) to CoinGecko IDs (bitcoin)
// This is a small, hardcoded map for our focus coins.
const SYMBOL_TO_ID_MAP = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin',
  'XRP': 'ripple', 'ADA': 'cardano', 'AVAX': 'avalanche-2', 'DOGE': 'dogecoin',
  'DOT': 'polkadot', 'LINK': 'chainlink', 'MATIC': 'matic-network', 'UNI': 'uniswap',
  'ATOM': 'cosmos', 'LTC': 'litecoin', 'NEAR': 'near'
};

// ─────────────────────────────────────────
// CoinGecko: مصدر البيانات الأساسي لكل شيء
// ─────────────────────────────────────────
async function fetchCoinGeckoData() {
  logger.info(`Attempting to fetch from CoinGecko for: ${FOCUS_COINS.join(',')}`);

  try {
    const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
    url.searchParams.append('vs_currency', 'usd');
    url.searchParams.append('order', 'market_cap_desc');
    url.searchParams.append('per_page', '50');
    url.searchParams.append('price_change_percentage', '24h,7d');
    
    const idList = FOCUS_COINS.map(s => SYMBOL_TO_ID_MAP[s]).filter(Boolean).join(',');
    url.searchParams.append('ids', idList);

    const res = await fetchWithTimeout(url.toString(), {
      headers: { 'User-Agent': 'CryptoBot/1.0' }
    });

    if (!res.ok) {
      logger.error('CoinGecko response was not OK', { status: res.status });
      throw new Error(`CoinGecko HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
        logger.error('CoinGecko returned non-array data', { data });
        return [];
    }

    return data.map(coin => ({
      id: coin.id, // ID is crucial for historical data
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price || 0,
      change24h: coin.price_change_percentage_24h_in_currency || 0,
      change7d: coin.price_change_percentage_7d_in_currency || 0,
      volume24h: coin.total_volume || 0,
      high24h: coin.high_24h || 0,
      low24h: coin.low_24h || 0,
      marketCap: coin.market_cap || 0,
      rank: coin.market_cap_rank || 99,
    })).filter(c => c.price > 0 && c.volume24h > 0);

  } catch (err) {
    logger.error('CoinGecko fetch failed', { error: err.message, stack: err.stack });
    return [];
  }
}

// ─────────────────────────────────────────
// CoinMarketCap: trending coins (لا يزال مفيدًا)
// ─────────────────────────────────────────
async function fetchTrending(cmcApiKey) {
    if (!cmcApiKey) return [];
  
    try {
      const res = await fetchWithTimeout(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/gainers-losers?limit=10',
        { headers: { 'X-CMC_PRO_API_KEY': cmcApiKey, 'User-Agent': 'CryptoBot/1.0' } }
      );
  
      if (!res.ok) {
        logger.warn('CMC fetch failed, proceeding without trending data.', { status: res.status });
        return [];
      } 
  
      const data = await res.json();
      const trending = data?.data?.gainers || [];
  
      return trending.map(c => c.symbol).filter(s => FOCUS_COINS.includes(s));
    } catch (err) {
      logger.warn('CMC fetch failed', { error: err.message });
      return [];
    }
}

/**
 * Fetches 14 days of OHLC data for a given CoinGecko coin ID.
 * @param {string} coinId The coin ID (e.g., 'bitcoin').
 * @returns {Promise<number[][] | null>} A promise that resolves to an array of [timestamp, open, high, low, close] or null.
 */
export async function getHistoricalData(coinId) {
  if (!coinId) {
    logger.warn('No coinId provided to getHistoricalData');
    return null;
  }
  
  logger.info(`Fetching historical OHLC data for ${coinId}`);
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=14`;

  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'CryptoBot/1.0' } });
    if (!res.ok) {
      logger.error(`Failed to fetch historical data for ${coinId}`, { status: res.status });
      return null;
    }
    const ohlcData = await res.json();
    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      logger.warn(`No historical data returned for ${coinId}`);
      return null;
    }
    return ohlcData;
  } catch (err) {
    logger.error(`Error fetching historical data for ${coinId}`, { error: err.message });
    return null;
  }
}


// ─────────────────────────────────────────
// الدالة الرئيسية: دمج كل البيانات
// ─────────────────────────────────────────
export async function getMarketData(cmcApiKey) {
  logger.info('Fetching data from primary source: CoinGecko');
  const [coins, trendingList] = await Promise.all([
    fetchCoinGeckoData(),
    fetchTrending(cmcApiKey)
  ]);

  if (!coins || coins.length === 0) {
    logger.error('No data was processed from CoinGecko. Cannot continue.');
    return [];
  }

  return coins.map(coin => ({
    ...coin,
    isTrending: trendingList.includes(coin.symbol)
  }));
}
