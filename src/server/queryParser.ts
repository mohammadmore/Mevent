import { addDays, startOfTehranDay, tehranDayRange, tehranParts, tehranWeekendRange } from '../lib/time.ts';
import { findDate, latinDigits } from './eventExtractor.ts';

// Reads a short Persian request such as «کنسرت آخر هفته در شیراز» or «رویدادهای رایگان فردا تهران»
// and turns it into event filters (city, date range, price, keywords) without any AI service.

export interface ParsedQuery {
  city?: string;
  from?: Date;
  to?: Date;
  /** Human label of the date range, e.g. «آخر هفته». */
  when?: string;
  price?: 'free' | 'paid';
  /** Words left over after city/time/price were recognised; matched against title, tags, address. */
  keywords: string[];
}

export const MAJOR_CITIES = [
  'تهران', 'مشهد', 'اصفهان', 'کرج', 'شیراز', 'تبریز', 'قم', 'اهواز', 'کرمانشاه', 'ارومیه', 'رشت', 'زاهدان',
  'همدان', 'کرمان', 'یزد', 'اردبیل', 'بندرعباس', 'اراک', 'زنجان', 'قزوین', 'سنندج', 'خرم‌آباد', 'گرگان',
  'ساری', 'بوشهر', 'بیرجند', 'بجنورد', 'شهرکرد', 'سمنان', 'یاسوج', 'ایلام', 'کاشان', 'کیش', 'آمل',
  'بابل', 'نیشابور', 'دزفول', 'لاهیجان', 'رامسر', 'چالوس', 'انزلی', 'ماسال', 'قشم',
];

const WEEKDAY_NAMES: [string, number][] = [
  ['پنجشنبه', 4], ['پنج‌شنبه', 4], ['سه‌شنبه', 2], ['سه شنبه', 2], ['سهشنبه', 2], ['چهارشنبه', 3],
  ['دوشنبه', 1], ['یکشنبه', 0], ['یک‌شنبه', 0], ['جمعه', 5], ['شنبه', 6],
];

const STOP_WORDS = new Set([
  'در', 'برای', 'تو', 'توی', 'به', 'از', 'تا', 'چه', 'چی', 'چیه', 'کجا', 'کی', 'رویداد', 'رویدادها', 'رویدادهای', 'رویدادای',
  'ایونت', 'ایونتها', 'ایونت‌ها', 'برنامه', 'برنامه‌ها', 'هست', 'هستش', 'داره', 'دارم', 'دارید', 'میخوام', 'می‌خوام', 'میخواهم',
  'یه', 'یک', 'را', 'رو', 'و', 'با', 'شهر', 'شهرِ', 'اطراف', 'نزدیک', 'لطفا', 'لطفاً', 'سلام', 'پیشنهاد', 'بده', 'بدید', 'بگو',
  'چند', 'چندتا', 'کدوم', 'کدام', 'هم', 'های', 'ها', 'خوب', 'جالب', 'باحال', 'است', 'هستند', 'بریم', 'برم', 'بیرون', 'ای', 'ی',
]);

const norm = (s: string) => latinDigits(s)
  .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[أإ]/g, 'ا')
  .replace(/[؟?!،,.:;«»"()]/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** Removes the first occurrence of `phrase` (as whole words) from `text`. */
function cut(text: string, phrase: string) {
  const re = new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`);
  return text.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

function has(text: string, phrase: string) {
  return new RegExp(`(^|\\s)${phrase}(?=\\s|$)`).test(text);
}

function nextWeekday(now: Date, weekday: number) {
  const today = tehranParts(now).weekday;
  return startOfTehranDay(addDays(startOfTehranDay(now), ((weekday - today + 7) % 7) + 0.5));
}

export function parseQuery(input: string, knownCities: string[] = [], now = new Date()): ParsedQuery {
  let text = norm(input);
  const out: ParsedQuery = { keywords: [] };

  // City: the longest known name that appears in the text.
  const cities = [...new Set([...knownCities, ...MAJOR_CITIES].map(c => norm(c)).filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const c of cities) {
    const variants = [c, c.replace(/‌/g, ' '), c.replace(/‌/g, '')];
    const hit = variants.find(v => has(text, v));
    if (hit) { out.city = c; text = cut(text, hit); break; }
  }

  // Price.
  for (const w of ['رایگان', 'مجانی', 'بدون هزینه', 'بلیت رایگان']) if (has(text, w)) { out.price = 'free'; text = cut(text, w); }
  for (const w of ['پولی', 'غیررایگان']) if (has(text, w)) { out.price = 'paid'; text = cut(text, w); }

  // Time. span(a, b) = from the start of day a to the start of day b (days counted from today).
  const day = (d: Date): [Date, Date] => tehranDayRange(d);
  const today = startOfTehranDay(now);
  const span = (a: number, b: number): [Date, Date] => [startOfTehranDay(addDays(today, a + 0.5)), startOfTehranDay(addDays(today, b + 0.5))];
  const setRange = (range: [Date, Date], label: string, phrase: string) => {
    if (out.from) return;
    [out.from, out.to] = range;
    out.when = label;
    text = cut(text, phrase);
  };
  const phrases: [string, () => [Date, Date], string][] = [
    ['پس فردا', () => day(addDays(now, 2)), 'پس‌فردا'],
    ['پس‌فردا', () => day(addDays(now, 2)), 'پس‌فردا'],
    ['پسفردا', () => day(addDays(now, 2)), 'پس‌فردا'],
    ['فردا شب', () => day(addDays(now, 1)), 'فردا'],
    ['فردا', () => day(addDays(now, 1)), 'فردا'],
    ['امروز', () => day(now), 'امروز'],
    ['امشب', () => day(now), 'امشب'],
    ['تعطیلات آخر هفته', () => tehranWeekendRange(now), 'آخر هفته'],
    ['آخر هفته', () => tehranWeekendRange(now), 'آخر هفته'],
    ['اخر هفته', () => tehranWeekendRange(now), 'آخر هفته'],
    ['آخرهفته', () => tehranWeekendRange(now), 'آخر هفته'],
    ['هفته بعد', () => span(7, 14), 'هفته بعد'],
    ['هفته آینده', () => span(7, 14), 'هفته آینده'],
    ['این هفته', () => span(0, 7), 'این هفته'],
    ['ماه بعد', () => span(30, 60), 'ماه بعد'],
    ['ماه آینده', () => span(0, 30), 'یک ماه آینده'],
    ['این ماه', () => span(0, 30), 'این ماه'],
  ];
  for (const [phrase, range, label] of phrases) if (has(text, phrase)) setRange(range(), label, phrase);

  const nDays = text.match(/(?:^|\s)(\d{1,2})\s*روز\s*(?:آینده|بعد|آتی)/);
  if (nDays && !out.from) {
    const n = Math.min(60, Number(nDays[1]));
    setRange(span(0, n), `${n} روز آینده`, nDays[0].trim());
  }

  if (!out.from) {
    const date = findDate(text, now);
    if (date) setRange(day(new Date(date.iso)), date.match, date.match);
  }

  if (!out.from) {
    for (const [name, wd] of WEEKDAY_NAMES) {
      const phrase = [`${name} شب`, `${name} این هفته`, name].find(p => has(text, p));
      if (phrase) { setRange(day(addDays(nextWeekday(now, wd), 0.5)), name, phrase); break; }
    }
  }

  // Whatever is left are keywords («کنسرت», «تئاتر کودک»), minus filler words and plural endings.
  out.keywords = text.split(' ')
    .map(w => w.replace(/^#/, '').replace(/(‌?های|‌?ها)$/, ''))
    .filter(w => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 5);
  return out;
}
