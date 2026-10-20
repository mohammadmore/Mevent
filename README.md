# Mevent

کشف رویدادها، پاتوق‌ها و برنامه‌ریزی سفر — Express + React (Vite) + PostgreSQL (Drizzle) + ورود پیامکی (کاوه‌نگار / sms.ir) و در صورت نیاز Firebase Auth.

## راه‌اندازی

```bash
npm ci
cp .env.example .env   # مقادیر را تکمیل کنید
npx drizzle-kit push --config src/db/drizzle.config.ts   # ساخت جدول‌ها (اولین بار)
npm run dev            # http://localhost:3000
```

ستون‌ها و جدول‌های جدید هنگام بالا آمدن سرور هم به‌صورت خودکار ساخته می‌شوند
(`src/db/index.ts`)، و سرور تا پایان این مرحله درخواستی نمی‌پذیرد.

تولید: `npm run build && npm start`.

## ساختار سرور

| مسیر | محتوا |
| --- | --- |
| `server.ts` | راه‌اندازی، middlewareها، SPA و متاتگ‌های اشتراک‌گذاری |
| `src/server/routes/*` | APIها: کاربران، کشف و جستجو، محتوا و بررسی، خرید و بلیت، جوامع/اعلان/سفر، مدیریت، هوش مصنوعی |
| `src/server/routes/auth.ts` | ورود با کد پیامکی، اتصال شماره به حساب، خروج از همه دستگاه‌ها |
| `src/server/session.ts` | نشست‌های سمت سرور (کوکی httpOnly، تمدید خودکار) |
| `src/lib/sms.ts` | ارسال کد با کاوه‌نگار یا sms.ir |
| `src/middleware/auth.ts` | احراز هویت (نشست یا توکن Firebase) و سطح دسترسی |
| `src/lib/payments.ts` | درگاه زرین‌پال |
| `src/lib/sharedStore.ts` | کش و rate limit مشترک بین چند instance (Postgres) |
| `src/lib/notifications.ts` | اعلان‌های درون‌برنامه، Web Push و یادآوری رویدادها |
| `src/lib/storage.ts` | ذخیره عکس‌ها در Cloud Storage یا دیسک |

## پیکربندی مهم

همه متغیرها در `.env.example` توضیح داده شده‌اند. برای محیط واقعی حتماً:

- `SMS_PROVIDER` و کلید/الگوی همان سرویس، و `OTP_SECRET` — بدون آن‌ها ورود پیامکی در production غیرفعال است.
  متن الگو باید فقط یک توکن (کد) داشته باشد. اگر خط آخر آن `@دامنه-شما #کد` باشد، کروم اندروید کد را خودش پر می‌کند.
- `AUTH_GOOGLE_ENABLED=false` — اگر سرور به گوگل دسترسی ندارد (میزبانی داخل ایران)، ورود با گوگل را خاموش کنید.
- `ZARINPAL_MERCHANT_ID` — بدون آن، فروش بلیت پولی در production غیرفعال است.
- `UPLOAD_BUCKET` — روی Cloud Run دیسک با هر restart پاک می‌شود.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — برای اعلان روی گوشی (یادآوری رویدادها).
- `APP_URL` — آدرس عمومی سایت (برای لینک بازگشت درگاه و متاتگ‌ها).

اولین مدیر را دستی تعیین کنید:

```sql
UPDATE users SET role = 'ADMIN', organizer_status = 'APPROVED' WHERE phone = '+989123456789';
-- یا برای حساب گوگل: WHERE email = 'you@example.com'
```

شماره‌ها همیشه به شکل `+989XXXXXXXXX` ذخیره می‌شوند.

## تست محلی ورود پیامکی

بیرون از production، `SMS_PROVIDER` به‌طور پیش‌فرض `console` است: کد در لاگ سرور چاپ می‌شود و
صفحه ورود هم آن را نشان می‌دهد.

## تست محلی با Firebase Auth Emulator

```bash
firebase emulators:start --only auth --project useful-scanner-9j4jh
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 VITE_FIREBASE_AUTH_EMULATOR=http://127.0.0.1:9099 npm run dev
```

با `VITE_FIREBASE_AUTH_EMULATOR` تابع `window.__meventTestSignIn(email, password)` برای تست‌های خودکار در
دسترس است؛ build عادی آن را ندارد.
