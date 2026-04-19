# 🤖 Crypto Content Intelligence Bot v3.0

نظام ذكي لتوليد محتوى احترافي في العملات الرقمية ونشره على Binance Square.
المحتوى يصلك على **Discord** جاهزاً للنشر.

---

## 📁 هيكل المشروع

```
crypto-bot/
├── src/
│   ├── worker.js      ← العقل الرئيسي
│   ├── scan.js        ← Binance + CoinGecko + CoinMarketCap
│   ├── rank.js        ← اختيار أفضل عملة
│   ├── sentiment.js   ← Fear & Greed Index
│   ├── pumpCheck.js   ← كشف التلاعب
│   ├── news.js        ← CryptoPanic
│   ├── social.js      ← LunarCrush
│   ├── time.js        ← توقيت النشر
│   ├── ai.js          ← Gemini (توليد المحتوى)
│   ├── score.js       ← Viral Score
│   ├── memory.js      ← Cloudflare KV
│   ├── discord.js     ← إرسال النتائج
│   ├── config.js      ← كل الإعدادات
│   └── logger.js      ← نظام السجلات
├── wrangler.toml
├── package.json
├── .dev.vars          ← مفاتيحك (لا ترفعه!)
└── .gitignore
```

---

## 🔑 المفاتيح المطلوبة

| المتغير | المصدر | التكلفة |
|---------|--------|---------|
| `GEMINI_API_KEY` | aistudio.google.com | مجاني |
| `CMC_API_KEY` | coinmarketcap.com/api | مجاني |
| `CRYPTOPANIC_API_KEY` | cryptopanic.com/developers/api | مجاني |
| `LUNARCRUSH_API_KEY` | lunarcrush.com/developers | مجاني |
| `DISCORD_WEBHOOK_URL` | Discord Server Settings | مجاني |

---

## ⚙️ خطوات الإعداد

### 1. تثبيت الأدوات
```bash
npm install -g wrangler
wrangler login
```

### 2. إنشاء KV
```bash
npm run kv:create
```
انسخ الـ id وpreview_id وضعهما في `wrangler.toml`

### 3. تثبيت المكتبات
```bash
npm install
```

### 4. Discord Webhook URL
```
discord.com
← افتح أي Server
← كليك يمين على أي Channel
← Edit Channel → Integrations → Webhooks
← New Webhook → Copy Webhook URL
```

### 5. ضع مفاتيحك في .dev.vars للاختبار المحلي
```
GEMINI_API_KEY=...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 6. اختبار محلي
```bash
npm run dev
```
ثم افتح: `http://localhost:8787/run`

### 7. رفع المفاتيح السرية
```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put CMC_API_KEY
wrangler secret put CRYPTOPANIC_API_KEY
wrangler secret put LUNARCRUSH_API_KEY
wrangler secret put DISCORD_WEBHOOK_URL
```

### 8. النشر
```bash
npm run deploy
```

### 9. اختبار نهائي
```
https://crypto-content-bot.YOUR-NAME.workers.dev/run
```

---

## ⏰ جدول التشغيل التلقائي (UTC)

| الوقت UTC | السعودية | مصر | الجلسة |
|-----------|---------|-----|--------|
| 09:00 | 12:00 | 11:00 | أوروبا |
| 15:00 | 18:00 | 17:00 | أمريكا 🔥 |
| 20:00 | 23:00 | 22:00 | نهاية أمريكا |

---

## 🎯 كيف يعمل

```
Cloudflare (كل X ساعات)
        ↓
جلب البيانات من 5 مصادر
        ↓
اختيار أفضل عملة
        ↓
توليد المحتوى بـ Gemini
        ↓
Discord — 3 رسائل:
  1. بيانات السوق والتقييم
  2. أحدث الأخبار
  3. المحتوى الجاهز للنشر
        ↓
أنت تنسخ وتنشر على Binance Square
```

---

## 🛠️ أوامر مفيدة

```bash
npm run dev      # اختبار محلي
npm run deploy   # نشر على Cloudflare
npm run tail     # مشاهدة الـ Logs مباشرة
```

---

## ⚠️ تنبيهات

- البوت لا ينشر تلقائياً — أنت من يقرر
- المحتوى ليس نصيحة مالية
- راجع المحتوى دائماً قبل النشر
- لا ترفع `.dev.vars` إلى GitHub
