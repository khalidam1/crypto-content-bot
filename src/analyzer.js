
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { getMarketData, getHistoricalData } from './scan.js';
import { calculateSupportResistance } from './supportResistance.js';
import { getSentiment } from './sentiment.js';
import { loadMemory, saveMemory } from './memory.js';


// ============================================================
// analyzer.js — العقل التحليلي للبوت
// ============================================================

/**
 * Calculates a "Viral Score" for a coin based on market data.
 * @param {object} coin - The coin data object.
 * @param {object} context - Additional context like sentiment and memory.
 * @returns {number} The calculated viral score.
 */
function calculateViralScore(coin, context) {
  const { sentiment, memory, peakHours } = context;
  let score = 0;

  // 1. Market Momentum (max 50 points)
  const priceChangeFactor = Math.abs(coin.change24h) * 5; // e.g., 5% change = 25 points
  const volumeFactor = Math.log(coin.volume24h) / Math.log(1.1); // Log scale for volume
  score += Math.min(50, priceChangeFactor + volumeFactor * 0.1);

  // 2. Time Score (max 15 points)
  if (peakHours.isPeak) {
    score += 15;
  }

  // 3. Sentiment Score (max 10 points)
  if (sentiment.value <= 30) { // Extreme Fear
    score += (coin.change24h < -5) ? 10 : 0; // Reward big drops in fear
  } else if (sentiment.value >= 75) { // Extreme Greed
    score += (coin.change24h > 5) ? 10 : 0; // Reward big pumps in greed
  }

  // 4. Trending Boost (10 points)
  if (coin.isTrending) {
    score += 10;
  }

  // 5. Novelty Penalty (avoid repetition)
  if (memory.includes(coin.symbol)) {
    logger.info(`Applying novelty penalty for ${coin.symbol}`);
    score *= 0.3; // Reduce score by 70% if recently posted
  }

  return Math.round(score);
}

/**
 * Checks if a coin's movement looks like a low-quality pump-and-dump.
 * @param {object} coin - The coin data object.
 * @returns {boolean} True if it looks like a fake pump.
 */
function isFakePump(coin) {
  const { change24h, volume24h, marketCap } = coin;
  const { MIN_VOLUME_USD, PUMP_DETECTION } = CONFIG;

  if (volume24h < MIN_VOLUME_USD) return false; // Already filtered, but good to have

  const volumeToMarketCapRatio = volume24h / marketCap;

  // Condition 1: High price change with low relative volume?
  if (change24h > PUMP_DETECTION.PRICE_CHANGE_THRESHOLD && volumeToMarketCapRatio < PUMP_DETECTION.MIN_VOLUME_RATIO) {
    logger.warn(`Potential fake pump detected for ${coin.symbol}: High change, low volume ratio.`);
    return true;
  }

  return false;
}


/**
 * Analyzes market data to find the most interesting coin to post about.
 * @returns {Promise<object|null>} A promise that resolves to the analysis object or null.
 */
export async function analyzeMarket() {
  logger.info('Starting market analysis...');

  // 1. Gather all necessary data
  const [marketData, sentiment, memory, peakHours] = await Promise.all([
    getMarketData(process.env.CMC_PRO_API_KEY),
    getSentiment(),
    loadMemory(),
    getPeakHours(),
  ]);

  if (!marketData || marketData.length === 0) {
    logger.error('Analysis failed: No market data available.');
    return null;
  }

  // 2. Filter and score all coins
  const scoredCoins = marketData
    .filter(coin => coin.volume24h >= CONFIG.MIN_VOLUME_USD)
    .filter(coin => !isFakePump(coin))
    .map(coin => ({
      ...coin,
      score: calculateViralScore(coin, { sentiment, memory, peakHours }),
    }))
    .sort((a, b) => b.score - a.score); // Sort descending by score

  if (scoredCoins.length === 0) {
    logger.info('No coins met the initial filtering criteria.');
    return null;
  }

  // 3. Select the best candidate
  const bestCoin = scoredCoins[0];
  logger.info(`Best candidate: ${bestCoin.symbol} with score ${bestCoin.score}`);

  if (bestCoin.score < CONFIG.MIN_VIRAL_SCORE) {
    logger.info(`Best coin score (${bestCoin.score}) is below threshold (${CONFIG.MIN_VIRAL_SCORE}). No post will be generated.`);
    return null;
  }

  // 4. Enrich with historical data and S/R levels
  logger.info(`Enriching ${bestCoin.symbol} with historical data...`);
  const historicalData = await getHistoricalData(bestCoin.id);
  const supportResistance = calculateSupportResistance(historicalData);

  // 5. Save memory and return the final package
  await saveMemory(bestCoin.symbol);
  
  return {
    coin: bestCoin,
    sentiment,
    supportResistance, // This is the new data package!
  };
}

/**
 * Determines if the current time is a peak trading time.
 * @returns {{isPeak: boolean, reason: string}}
 */
async function getPeakHours() {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();
  const { PEAK_HOURS } = CONFIG;

  for (const [name, hours] of Object.entries(PEAK_HOURS)) {
    if (currentUTCHour >= hours.start && currentUTCHour < hours.end) {
      logger.info(`Current time is within ${name} peak hours.`);
      return { isPeak: true, reason: name };
    }
  }

  return { isPeak: false, reason: 'Off-peak' };
}
