// ============================================================
// config.js — الإعدادات المركزية للمشروع
// عدّل هنا لتخصيص سلوك البوت
// ============================================================

export const CONFIG = {

  // ── العملات المستهدفة ──
  // أضف أو احذف حسب رغبتك
  FOCUS_COINS: [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP',
    'ADA', 'AVAX', 'DOGE', 'DOT', 'LINK',
    'MATIC', 'UNI', 'ATOM', 'LTC', 'NEAR'
  ],

  // ── الذاكرة ──
  // كم عملة يتذكر البوت لتجنب التكرار
  MEMORY_SIZE: 5,

  // ── حد أدنى للـ Viral Score ──
  // إذا كان أقل من هذا، البوت لا يرسل
  MIN_VIRAL_SCORE: 35,

  // ── حد أدنى لحجم التداول ──
  // عملات بحجم أقل من هذا يتم تجاهلها. تم تخفيضه لضمان وجود بيانات.
  MIN_VOLUME_USD: 1_000_000,

  // ── إعدادات Gemini ──
  GEMINI: {
    MODEL: 'gemini-1.5-flash',
    TEMPERATURE: 0.8,
    MAX_TOKENS: 500,
  },

  // ── إعدادات المحتوى ──
  CONTENT: {
    MIN_WORDS: 100,
    MAX_WORDS: 250,
    LANGUAGE: 'English',
    PLATFORM: 'Binance Square',
  },

  // ── أوقات ذروة النشر (UTC) ──
  PEAK_HOURS: {
    US_SESSION:     { start: 13, end: 21, score: 95 },
    EU_SESSION:     { start: 7,  end: 11, score: 85 },
    ASIA_SESSION:   { start: 0,  end: 4,  score: 70 },
    LATE_US:        { start: 22, end: 23, score: 60 },
    OFF_HOURS:      { score: 35 },
  },

  // ── حدود كشف التلاعب ──
  PUMP_DETECTION: {
    MAX_CHANGE_WITH_LOW_VOLUME: 20,   // % تغير
    MIN_VOLUME_FOR_BIG_MOVE: 30_000_000,
    MIN_VOLUME_MCAP_RATIO: 0.03,
    MIN_CHANGE_FOR_RATIO_CHECK: 15,
  }
};
