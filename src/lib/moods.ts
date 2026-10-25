// Mood and company tags shared by the server (inference, suggestions) and the client (chips,
// pickers). Organizers pick some; whatever they leave out is inferred from the category, text
// and time, so every event and place can be matched to how someone feels right now.

export const MOODS = {
  chill: { label: 'آروم و دنج', emoji: '🍃' },
  energetic: { label: 'پرانرژی', emoji: '⚡' },
  artsy: { label: 'هنری و فرهنگی', emoji: '🎨' },
  social: { label: 'آدم‌های جدید', emoji: '👋' },
  outdoor: { label: 'هوای آزاد', emoji: '🌳' },
  learn: { label: 'یه چیز یاد بگیرم', emoji: '💡' },
  fun: { label: 'فقط خوش بگذره', emoji: '🎉' },
} as const;

export const COMPANY = {
  solo: { label: 'تنهایی خوش می‌گذره', short: 'تنهایی', emoji: '🙂' },
  date: { label: 'مناسب قرار دونفره', short: 'دونفره', emoji: '💞' },
  friends: { label: 'دورهمی دوستان', short: 'با دوستان', emoji: '🙌' },
  family: { label: 'با بچه‌ها', short: 'با خانواده', emoji: '👨‍👩‍👧' },
} as const;

export type MoodKey = keyof typeof MOODS;
export type CompanyKey = keyof typeof COMPANY;
export type VibeTag = MoodKey | CompanyKey;

export const MOOD_KEYS = Object.keys(MOODS) as MoodKey[];
export const COMPANY_KEYS = Object.keys(COMPANY) as CompanyKey[];
const ALL_KEYS = new Set<string>([...MOOD_KEYS, ...COMPANY_KEYS]);

export const isMood = (k: string): k is MoodKey => k in MOODS;
export const isCompany = (k: string): k is CompanyKey => k in COMPANY;

/** Keeps known keys only, without duplicates (organizer input, query strings). */
export function cleanVibeTags(value: unknown): VibeTag[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(list.map(v => String(v).trim()).filter(v => ALL_KEYS.has(v)))] as VibeTag[];
}

export function vibeTagLabel(k: string) {
  return isMood(k) ? MOODS[k].label : isCompany(k) ? COMPANY[k].label : k;
}

// ---------------------------------------------------------------- inference

const norm = (s: string) => s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌_#]/g, ' ').toLowerCase();

const KEYWORDS: Record<VibeTag, RegExp> = {
  chill: /کافه|کتاب|مطالعه|مدیتیشن|یوگا|آرام|دنج|چای|قهوه|شعرخوانی|شعر|آکوستیک|جاز|سنتی|موزه|گالری|نقاشی|خوشنویسی|cafe|book|jazz|yoga|acoustic/,
  energetic: /کنسرت|راک|پاپ|رقص|مهمانی|پارتی|ورزش|فوتبال|والیبال|دو |دوچرخه|کوهنوردی|صعود|جشنواره|فستیوال|هیجان|اتاق فرار|کارتینگ|پینت|concert|rock|dance|party|festival|sport|run/,
  artsy: /هنر|گالری|نمایشگاه|تئاتر|نمایش|سینما|فیلم|موسیقی|کنسرت|شعر|ادبی|کتاب|موزه|نقاشی|عکاسی|خوشنویسی|فرهنگی|art|gallery|theater|cinema|film|music|museum/,
  social: /دورهمی|میت.?آپ|meetup|شبکه.?سازی|نتورکینگ|networking|بازی|بردگیم|مافیا|زبان|کلاب|club|گروهی|تور|همایش|جشنواره|community/,
  outdoor: /طبیعت|پارک|کوه|کوهنوردی|پیاده.?روی|دوچرخه|کمپ|کویر|جنگل|دریا|ساحل|باغ|فضای باز|گردش|تور|outdoor|hike|park|camp/,
  learn: /کارگاه|ورکشاپ|workshop|آموزش|آموزشی|دوره|کلاس|سمینار|وبینار|همایش|کنفرانس|سخنرانی|تدریس|یادگیری|بوت.?کمپ|talk|class|course|seminar/,
  fun: /تفریح|خنده|استندآپ|کمدی|بازی|گیم|اتاق فرار|شهربازی|مافیا|جشن|پارتی|مهمانی|کارتینگ|بولینگ|سینما|کنسرت|fun|comedy|game|party/,
  solo: /کتاب|مطالعه|موزه|گالری|نمایشگاه|کارگاه|کلاس|آموزش|سینما|یوگا|مدیتیشن|پیاده.?روی|سخنرانی|workshop|museum/,
  date: /کافه|رستوران|سینما|تئاتر|کنسرت|جاز|آکوستیک|گالری|شام|غروب|پیاده.?روی|رومانتیک|cafe|dinner|jazz/,
  friends: /دورهمی|بازی|بردگیم|مافیا|اتاق فرار|کنسرت|پارتی|مهمانی|فوتبال|کارتینگ|بولینگ|کافه|تور|کمپ|game|party/,
  family: /کودک|کودکان|بچه|خانواده|خانوادگی|نوجوان|شهربازی|پارک|عروسک|انیمیشن|kids|family/,
};

/** Place type → tags it is always good for. */
const PLACE_TYPE_TAGS: Record<string, VibeTag[]> = {
  CAFE: ['chill', 'date', 'friends', 'solo'],
  RESTAURANT: ['date', 'friends', 'family'],
  BOOKSTORE: ['chill', 'learn', 'solo'],
  CONCEPT_STORE: ['artsy', 'chill', 'friends'],
  CINEMA: ['artsy', 'fun', 'date', 'friends'],
  THEATER: ['artsy', 'date'],
  MUSEUM: ['artsy', 'learn', 'solo', 'family'],
  ESCAPE_ROOM: ['energetic', 'fun', 'friends'],
  BOARD_GAME_CAFE: ['fun', 'social', 'friends'],
  COWORKING: ['learn', 'solo', 'social'],
  PARK: ['outdoor', 'chill', 'family', 'solo'],
  ART_GALLERY: ['artsy', 'chill', 'solo', 'date'],
};

const AMENITY_TAGS: Record<string, VibeTag[]> = {
  quietZone: ['chill', 'solo'], books: ['chill', 'learn'], boardGames: ['fun', 'friends'], liveMusic: ['artsy', 'energetic'],
  outdoor: ['outdoor'], kidsFriendly: ['family'], openMic: ['social', 'artsy'], screening: ['artsy'], comfySeating: ['chill'],
};

function fromText(text: string) {
  const t = norm(text);
  return (Object.keys(KEYWORDS) as VibeTag[]).filter(k => KEYWORDS[k].test(t));
}

/** Inferred tags for an event (category, title, description, hour of day). */
export function inferEventVibes(e: { title?: string | null; description?: string | null; tags?: unknown; startHour?: number | null; cost?: number }) {
  const tags = Array.isArray(e.tags) ? e.tags.join(' ') : '';
  // Tags and the title say what the event is; the description only adds when nothing else did.
  const found = new Set<VibeTag>(fromText(`${tags} ${e.title || ''}`));
  if (found.size < 2) for (const k of fromText((e.description || '').slice(0, 600))) found.add(k);
  const h = e.startHour;
  if (h != null) {
    if (h >= 19) { found.add('date'); found.add('friends'); }
    if (h < 12) found.add('chill');
  }
  if (found.size === 0) found.add('fun');
  return [...found];
}

export function inferPlaceVibes(p: { type?: string | null; name?: string | null; description?: string | null; amenities?: unknown }) {
  const found = new Set<VibeTag>(PLACE_TYPE_TAGS[p.type || ''] || []);
  for (const a of Array.isArray(p.amenities) ? p.amenities : []) for (const k of AMENITY_TAGS[String(a)] || []) found.add(k);
  for (const k of fromText(`${p.name || ''} ${(p.description || '').slice(0, 400)}`)) found.add(k);
  if (found.size === 0) found.add('chill');
  return [...found];
}

/** The organizer's choice wins; inference fills in only the groups they left empty. */
export function effectiveVibes(explicit: unknown, inferred: VibeTag[]): VibeTag[] {
  const chosen = cleanVibeTags(explicit);
  const hasMood = chosen.some(isMood);
  const hasCompany = chosen.some(isCompany);
  return [...new Set([...chosen, ...inferred.filter(k => (isMood(k) ? !hasMood : !hasCompany))])];
}

// ---------------------------------------------------------------- picker options

export const WHEN_OPTIONS = {
  now: 'همین الان',
  tonight: 'امشب',
  tomorrow: 'فردا',
  weekend: 'آخر هفته',
} as const;
export type WhenKey = keyof typeof WHEN_OPTIONS;

export const BUDGET_OPTIONS = {
  free: 'هیچی، مجانی',
  cheap: 'یه کم',
  any: 'مهم نیست',
} as const;
export type BudgetKey = keyof typeof BUDGET_OPTIONS;

/** Upper price for the "cheap" budget, in toman. */
export const CHEAP_LIMIT = 300_000;

export const PLACE_TYPE_LABELS: Record<string, string> = {
  CAFE: 'کافه', RESTAURANT: 'رستوران', BOOKSTORE: 'کتاب‌فروشی', CONCEPT_STORE: 'کانسپت استور', CINEMA: 'سینما',
  THEATER: 'تئاتر', MUSEUM: 'موزه', ESCAPE_ROOM: 'اتاق فرار', BOARD_GAME_CAFE: 'کافه بازی', COWORKING: 'فضای کار اشتراکی',
  PARK: 'پارک و فضای سبز', ART_GALLERY: 'گالری هنری', OTHER: 'پاتوق',
};

/** Places you can walk into without paying anything. */
export const FREE_PLACE_TYPES = ['PARK', 'ART_GALLERY', 'BOOKSTORE', 'CONCEPT_STORE'];
