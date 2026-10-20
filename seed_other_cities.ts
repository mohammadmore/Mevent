import 'dotenv/config';
import { db } from './src/db/index.ts';
import { places, events } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

const cityPlaces = [
  // Shiraz
  { name: "باغ ارم شیراز", type: "جاذبه تاریخی", address: "شیراز، خیابان ارم", lat: 29.6358, lng: 52.5255, workingHours: "۸ صبح تا ۸ شب", description: "یکی از زیباترین باغ‌های ایرانی ثبت جهانی یونسکو" },
  { name: "حافظیه (آرامگاه حافظ)", type: "جاذبه فرهنگی", address: "شیراز، حدفاصل چهارراه ادبیات و چهارراه حافظیه", lat: 29.6262, lng: 52.5574, workingHours: "۸ صبح تا ۱۱ شب", description: "آرامگاه لسان‌الغیب حافظ شیرازی با فضای شاعرانه و کافه" },
  { name: "کافه باغ هدایت شیراز", type: "کافه", address: "شیراز، خیابان بیست متری سینما سعدی، هدایت غربی", lat: 29.6231, lng: 52.5280, workingHours: "۸:۳۰ صبح تا ۱۱:۳۰ شب", description: "کافه‌ای سرسبز با روح اصیل شیرازی و شربت‌های بهارنارنج" },
  { name: "مجموعه وکیل (بازار، حمام و مسجد)", type: "بازار و تاریخی", address: "شیراز، خیابان طالقانی", lat: 29.6148, lng: 52.5441, workingHours: "۹ صبح تا ۹ شب", description: "مجموعه تاریخی زندیان با معماری بی‌نظیر و بازار صنایع دستی" },
  { name: "مسجد نصیرالملک (مسجد صورتی)", type: "جاذبه تاریخی", address: "شیراز، خیابان لطف‌علی خان زند", lat: 29.6085, lng: 52.5484, workingHours: "۷:۳۰ صبح تا ۶ عصر", description: "مسجدی باشکوه با شیشه‌های رنگی فوق‌العاده در نور صبحگاهی" },

  // Isfahan
  { name: "میدان نقش جهان", type: "تاریخی", address: "اصفهان، میدان امام (نقش جهان)", lat: 32.6572, lng: 51.6776, workingHours: "۲۴ ساعته", description: "دومین میدان بزرگ جهان همراه با عالی‌قاپو و مسجد شیخ لطف‌الله" },
  { name: "کافه روزگار اصفهان", type: "کافه", address: "اصفهان، میدان نقش جهان، پشت مسجد شیخ لطف‌الله", lat: 32.6570, lng: 51.6780, workingHours: "۹ صبح تا ۱۱ شب", description: "کافه‌ای دنج و اصیل در قلب میدان نقش جهان" },
  { name: "سی و سه پل و جلفا", type: "پیاده‌راه و تاریخی", address: "اصفهان، خیابان چهارباغ عباسی", lat: 32.6447, lng: 51.6675, workingHours: "۲۴ ساعته", description: "پل تاریخی روی زاینده‌رود و محله جلفا با کافه‌های سنگی" },

  // Mashhad
  { name: "پارک کوه‌سنگی مشهد", type: "بوستان", address: "مشهد، خیابان کوه‌سنگی", lat: 36.2750, lng: 59.5690, workingHours: "۲۴ ساعته", description: "پارک مرتفع و زیبای مشهد با چشم‌انداز شهر" },
  { name: "کافه کتاب آفتاب مشهد", type: "کافه کتاب", address: "مشهد، راهنمایی", lat: 36.3100, lng: 59.5500, workingHours: "۹ صبح تا ۱۰:۳۰ شب", description: "پاتوق اهالی هنر و ادبیات در مشهد" },

  // Rasht
  { name: "میدان شهرداری رشت", type: "پیاده‌راه", address: "رشت، مرکز شهر، میدان شهرداری", lat: 37.2808, lng: 49.5832, workingHours: "۲۴ ساعته", description: "پیاده‌راه سنگفرش با کافه‌ها و کباب‌فروشی‌های شبانه" },
  { name: "کافه اردیبهشت رشت", type: "کافه", address: "رشت، گلسار، بلوار دیلمانی", lat: 37.3050, lng: 49.5950, workingHours: "۸:۳۰ صبح تا ۱۱:۳۰ شب", description: "فضایی مدرن و سرسبز با نوشیدنی‌ها و غذاهای گیلانی" },

  // Kish
  { name: "ساحل مرجان کیش", type: "تفریحی", address: "جزیره کیش، شرق جزیره", lat: 26.5312, lng: 54.0210, workingHours: "۲۴ ساعته", description: "ساحل زلال و تفریحات آبی و قایق‌سواری" },
  { name: "کافه ساحلی درخشان کیش", type: "کافه ساحلی", address: "جزیره کیش، ساحل سیمرغ", lat: 26.5200, lng: 54.0150, workingHours: "۱۰ صبح تا ۱ شب", description: "استراحت ساحلی با موزیک زنده و طلوع و غروب بی‌نظیر" }
];

const cityEvents = [
  {
    title: "جشنواره بهارنارنج و شب شعر شیراز",
    description: "شب شعر غزل‌خوانی و موسیقی اصیل اصیل ایرانی در جوار حافظیه شیراز",
    startTime: new Date('2026-08-20T18:00:00'),
    address: "شیراز، حافظیه، سالن همایش‌های حافظ",
    cost: 120000,
    tags: ["شیراز", "شعر", "موسیقی", "فرهنگی"],
    status: "PUBLISHED",
    organizerId: 1
  },
  {
    title: "تور شبانه عکاسی در مجموعه وکیل شیراز",
    description: "کارگاه عمل عکاسی معماری زندیان و نورپردازی شبانه بازار وکیل",
    startTime: new Date('2026-08-22T20:00:00'),
    address: "شیراز، خیابان طالقانی، مجموعه وکیل",
    cost: 150000,
    tags: ["شیراز", "عکاسی", "گردشگری"],
    status: "PUBLISHED",
    organizerId: 1
  },
  {
    title: "نمایشگاه صنایع دستی و قلم‌زنی اصفهان",
    description: "نمایش زنده استادکاران قلم‌زنی و میناکاری در میدان نقش جهان",
    startTime: new Date('2026-08-25T17:00:00'),
    address: "اصفهان، میدان نقش جهان، حجره‌های تاریخی",
    cost: 0,
    tags: ["اصفهان", "صنایع دستی", "هنر"],
    status: "PUBLISHED",
    organizerId: 1
  },
  {
    title: "جشنواره خوراک گیلانی و موسیقی فولکلور رشت",
    description: "چشیدن طعم اصیل غذاهای میرزاقاسمی و کباب با اجرای موسیقی محلی گیلان",
    startTime: new Date('2026-08-28T19:00:00'),
    address: "رشت، پیاده‌راه میدان شهرداری",
    cost: 80000,
    tags: ["رشت", "غذا", "موسیقی"],
    status: "PUBLISHED",
    organizerId: 1
  }
];

async function run() {
  console.log("Seeding city places and events...");
  for (const p of cityPlaces) {
    const existing = await db.select().from(places).where(eq(places.name, p.name));
    if (existing.length === 0) {
      await db.insert(places).values(p as any);
      console.log(`Inserted place: ${p.name}`);
    }
  }

  for (const e of cityEvents) {
    const existing = await db.select().from(events).where(eq(events.title, e.title));
    if (existing.length === 0) {
      await db.insert(events).values(e as any);
      console.log(`Inserted event: ${e.title}`);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
