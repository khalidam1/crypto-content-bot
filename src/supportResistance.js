// ============================================================
// supportResistance.js — تحليل نقاط الدعم والمقاومة
// ============================================================

import { logger } from './logger.js';

/**
 * Calculates simple support and resistance levels from 14-day OHLC data.
 * @param {number[][] | null} ohlcData - Array of [timestamp, open, high, low, close].
 * @returns {{support: number, resistance: number} | null} The support and resistance levels.
 */
export function calculateSupportResistance(ohlcData) {
  if (!ohlcData || ohlcData.length === 0) {
    logger.warn('No OHLC data provided to calculate support/resistance.');
    return null;
  }

  let highestHigh = 0;
  let lowestLow = Infinity;

  // OHLC data format: [timestamp, open, high, low, close]
  for (const day of ohlcData) {
    const high = day[2]; // Index 2 is 'high'
    const low = day[3];  // Index 3 is 'low'

    if (high > highestHigh) {
      highestHigh = high;
    }
    if (low < lowestLow) {
      lowestLow = low;
    }
  }

  if (highestHigh === 0 || lowestLow === Infinity) {
    return null;
  }

  logger.info(`Calculated S/R: Support=${lowestLow}, Resistance=${highestHigh}`);

  return {
    support: lowestLow,
    resistance: highestHigh,
  };
}
