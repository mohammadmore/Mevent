import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

// Pulls event listings out of a web page without any AI service:
//   1. schema.org Event data (JSON-LD and microdata), which most ticketing/calendar sites publish;
//   2. iCalendar feeds (.ics);
//   3. otherwise, page blocks (rows, list items, cards) that contain a Persian or ISO date, taking
//      the heading/link inside as the title.

export interface ExtractedEvent {
  title: string;
  description?: string;
  startTime?: string;
  address?: string;
  lat?: number;
  lng?: number;
  cost?: number;
}

const MAX_EVENTS = 100;

// ---------- dates ----------

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const latinDigits = (s: string) => s.replace(/[۰-۹٠-٩]/g, d => String(FA_DIGITS.indexOf(d) >= 0 ? FA_DIGITS.indexOf(d) : AR_DIGITS.indexOf(d)));

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

/** Jalali (Persian) date to Gregorian, after jalaali-js (MIT). */
const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;
const JALALI_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function g2d(gy: number, gm: number, gd: number) {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const gy = jy + 621;
  let leapJ = -14, jp = JALALI_BREAKS[0], jump = 0;
  for (let i = 1; i < JALALI_BREAKS.length; i++) {
    const next = JALALI_BREAKS[i];
    jump = next - jp;
    if (jy < next) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = next;
  }
  const n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  const jdn = g2d(gy, 3, march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  return [div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd];
}

/** Current Jalali year (approximate is enough: used only when a page omits the year). */
function currentJalaliYear(now = new Date()) {
  const y = now.getUTCFullYear() - 621;
  const [gy, gm, gd] = jalaliToGregorian(y, 1, 1);
  return now < new Date(Date.UTC(gy, gm - 1, gd)) ? y - 1 : y;
}

/** Tehran wall-clock time to an instant (Iran has used a fixed UTC+03:30 since 2022). */
function tehranInstant(y: number, m: number, d: number, hh = 10, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - 3.5 * 3600_000);
}

const monthAlternation = JALALI_MONTHS.join('|');
const RE_NUMERIC_JALALI = /\b(1[34]\d{2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\b/;
const RE_NAMED_JALALI = new RegExp(`(\\d{1,2})\\s*(?:ام|م)?\\s*(${monthAlternation})(?:\\s*(?:ماه)?\\s*(1[34]\\d{2}))?`);
const RE_ISO = /\b(20\d{2})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;
const RE_TIME = /(?:ساعت\s*)?\b([01]?\d|2[0-3]):([0-5]\d)\b/;

/** Finds the first date in a piece of text. Returns an ISO instant and the matched text. */
export function findDate(text: string, now = new Date()): { iso: string; match: string } | null {
  const t = latinDigits(text);
  const time = t.match(RE_TIME);
  const hh = time ? Number(time[1]) : 10, mm = time ? Number(time[2]) : 0;
  let m = t.match(RE_NUMERIC_JALALI);
  if (m) {
    const [jy, jm, jd] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
      return { iso: tehranInstant(gy, gm, gd, hh, mm).toISOString(), match: m[0] };
    }
  }
  m = t.match(RE_NAMED_JALALI);
  if (m) {
    const jd = Number(m[1]), jm = JALALI_MONTHS.indexOf(m[2]) + 1;
    if (jd >= 1 && jd <= 31) {
      let jy = m[3] ? Number(m[3]) : currentJalaliYear(now);
      let [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
      // No year on the page: a date already well in the past means next year.
      if (!m[3] && tehranInstant(gy, gm, gd).getTime() < now.getTime() - 30 * 86400_000) {
        jy += 1;
        [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
      }
      return { iso: tehranInstant(gy, gm, gd, hh, mm).toISOString(), match: m[0] };
    }
  }
  m = t.match(RE_ISO);
  if (m) {
    const d = m[4] ? tehranInstant(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) : tehranInstant(Number(m[1]), Number(m[2]), Number(m[3]), hh, mm);
    if (!isNaN(d.getTime())) return { iso: d.toISOString(), match: m[0] };
  }
  return null;
}

// ---------- helpers ----------

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();
const num = (v: unknown) => { const n = typeof v === 'number' ? v : parseFloat(latinDigits(String(v ?? '')).replace(/,/g, '')); return isFinite(n) ? n : undefined; };

function isoOrUndefined(v: unknown) {
  if (!v) return undefined;
  const s = String(v);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return findDate(s)?.iso;
}

// ---------- 1. schema.org ----------

function fromSchemaOrg(item: any): ExtractedEvent | null {
  const title = clean(item.name);
  if (!title) return null;
  const loc = Array.isArray(item.location) ? item.location[0] : item.location;
  const addr = loc?.address;
  const address = clean(typeof addr === 'string' ? addr : [addr?.streetAddress, addr?.addressLocality].filter(Boolean).join('، ')) || clean(loc?.name) || undefined;
  const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
  return {
    title,
    description: clean(item.description) || undefined,
    startTime: isoOrUndefined(item.startDate),
    address,
    lat: num(loc?.geo?.latitude),
    lng: num(loc?.geo?.longitude),
    cost: num(offer?.price ?? offer?.lowPrice),
  };
}

function collectJsonLd(node: any, out: any[]) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectJsonLd(n, out)); return; }
  const types = ([] as string[]).concat(node['@type'] || []);
  if (types.some(t => /Event$/.test(String(t)))) out.push(node);
  for (const key of ['@graph', 'itemListElement', 'item', 'subEvent', 'event', 'events']) collectJsonLd(node[key], out);
}

function extractSchemaOrg($: cheerio.CheerioAPI): ExtractedEvent[] {
  const items: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { collectJsonLd(JSON.parse($(el).text()), items); } catch { /* malformed block */ }
  });
  $('[itemtype*="schema.org/"][itemtype$="Event"]').each((_, el) => {
    const scope = $(el);
    const prop = (name: string) => {
      const p = scope.find(`[itemprop="${name}"]`).first();
      return p.attr('content') || p.attr('datetime') || p.text();
    };
    items.push({ name: prop('name'), description: prop('description'), startDate: prop('startDate'), location: { name: prop('location'), address: prop('address') }, offers: { price: prop('price') } });
  });
  return items.map(fromSchemaOrg).filter((e): e is ExtractedEvent => !!e);
}

// ---------- 2. iCalendar ----------

export function extractIcs(text: string): ExtractedEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const out: ExtractedEvent[] = [];
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const field = (name: string) => block.match(new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, 'm'))?.[1]?.trim();
    const unescape = (s?: string) => s?.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
    const title = clean(unescape(field('SUMMARY')));
    if (!title) continue;
    const dt = field('DTSTART');
    let startTime: string | undefined;
    const m = dt?.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
    if (m) {
      const [y, mo, d, hh = '10', mi = '00'] = [m[1], m[2], m[3], m[4], m[5]];
      startTime = (m[7] ? new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi)) : tehranInstant(+y, +mo, +d, +hh, +mi)).toISOString();
    }
    const geo = field('GEO')?.split(';');
    out.push({ title, description: clean(unescape(field('DESCRIPTION'))) || undefined, startTime, address: clean(unescape(field('LOCATION'))) || undefined, lat: num(geo?.[0]), lng: num(geo?.[1]) });
  }
  return out;
}

// ---------- 3. date-bearing page blocks ----------

const BLOCK_TAGS = new Set(['tr', 'li', 'article', 'section', 'div', 'dd', 'p']);
const ADDRESS_RE = /(?:محل(?:\s*برگزاری)?|مکان|آدرس|نشانی)\s*[:：]\s*([^|\n]{3,150}?)(?=\s{2,}|\s*(?:تاریخ|زمان|ساعت|قیمت|هزینه)\s*[:：]|$)/;
const PRICE_RE = /(?:قیمت|هزینه|بلیت|ورودی)\s*[:：]?\s*([\d٬,\.]+)\s*(?:هزار\s*)?(تومان|ریال)?/;

function blockFor($: cheerio.CheerioAPI, el: AnyNode) {
  let node = $(el);
  for (let depth = 0; depth < 6 && node.length; depth++) {
    const tag = (node.get(0) as any)?.tagName?.toLowerCase();
    const len = clean(node.text()).length;
    if (tag && BLOCK_TAGS.has(tag) && len >= 15) return len <= 1200 ? node : null;
    node = node.parent();
  }
  return null;
}

function titleOf($: cheerio.CheerioAPI, block: cheerio.Cheerio<AnyNode>, dateText: string) {
  for (const c of block.find('h1,h2,h3,h4,h5,h6,a,strong,b,[class*="title"],td').toArray()) {
    const text = clean($(c).text());
    if (text.length >= 3 && text.length <= 200 && !findDate(text)) return text;
  }
  const rest = clean(latinDigits(block.text()).replace(dateText, ''));
  return rest.length >= 3 ? rest.slice(0, 120) : null;
}

function extractDatedBlocks($: cheerio.CheerioAPI): ExtractedEvent[] {
  $('script,style,noscript,nav,header,footer,form').remove();
  const seen = new Set<any>();
  const out: ExtractedEvent[] = [];
  $('body *').each((_, el) => {
    if (out.length >= MAX_EVENTS) return false;
    // Elements whose own text carries a date.
    const own = clean($(el).contents().filter((__, n) => n.type === 'text').text() || ($(el).children().length === 0 ? $(el).text() : ''));
    if (!own) return;
    const date = findDate(own);
    if (!date) return;
    const block = blockFor($, el);
    if (!block || seen.has(block.get(0))) return;
    seen.add(block.get(0));
    const title = titleOf($, block, date.match);
    if (!title) return;
    const text = latinDigits(clean(block.text()));
    const price = text.match(PRICE_RE);
    const cost = price ? (num(price[1]) || 0) * (/هزار/.test(price[0]) ? 1000 : 1) / (price[2] === 'ریال' ? 10 : 1) : undefined;
    const link = block.find('a[href]').first().attr('href');
    const description = [clean(block.text()).slice(0, 560), link && /^https?:\/\//.test(link) ? link : ''].filter(Boolean).join('\n');
    out.push({ title, description: description || undefined, startTime: date.iso, address: text.match(ADDRESS_RE)?.[1]?.trim(), cost });
  });
  return out;
}

// ---------- entry point ----------

export function extractEvents(body: string, contentType = ''): ExtractedEvent[] {
  if (/text\/calendar/i.test(contentType) || /^\s*BEGIN:VCALENDAR/.test(body)) return dedupe(extractIcs(body));
  const $ = cheerio.load(body);
  const structured = extractSchemaOrg($);
  if (structured.length) return dedupe(structured);
  return dedupe(extractDatedBlocks($));
}

function dedupe(list: ExtractedEvent[]) {
  const seen = new Set<string>();
  return list.filter(e => {
    const key = `${e.title}|${e.startTime?.slice(0, 10) || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_EVENTS);
}
