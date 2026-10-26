import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { events, places, trips } from '../db/schema.ts';

// Shared links (Telegram, WhatsApp, ...) read <meta> tags from the HTML, not from the SPA,
// so pages for events, places and trips get their own title, description and image.

const SITE_NAME = 'میونت';
const DEFAULT_DESCRIPTION = 'کشف هوشمند رویدادها، پاتوق‌ها و برنامه‌های سفر';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

interface PageMeta { title: string; description: string; image?: string | null }

const STATIC_PAGES: Record<string, PageMeta> = {
  '/terms': { title: 'قوانین و مقررات', description: 'شرایط استفاده از میونت، خرید بلیت و ثبت رویداد' },
  '/privacy': { title: 'حریم خصوصی', description: 'چه اطلاعاتی از شما نگه می‌داریم و چطور از آن استفاده می‌کنیم' },
  '/refund-policy': { title: 'لغو و بازپرداخت', description: 'شرایط لغو بلیت و بازگشت وجه' },
  '/about': { title: 'درباره ما', description: 'میونت؛ کشف رویدادها، پاتوق‌ها و برنامه سفر' },
  '/contact': { title: 'تماس با ما', description: 'راه‌های ارتباط با پشتیبانی میونت' },
};

async function metaFor(pathname: string): Promise<PageMeta | null> {
  const page = STATIC_PAGES[pathname.replace(/\/$/, '')];
  if (page) return page;
  const [, kind, rawId] = pathname.match(/^\/(events|places|trips)\/([^/]+)\/?$/) || [];
  if (!kind) return null;
  if (kind === 'events') {
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) return null;
    const [e] = await db.select().from(events).where(eq(events.id, id));
    if (!e || e.status !== 'PUBLISHED') return null;
    return { title: e.title, description: e.description || `${e.city} • ${e.address || ''}`, image: e.imageUrl };
  }
  if (kind === 'places') {
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) return null;
    const [p] = await db.select().from(places).where(eq(places.id, id));
    if (!p || p.status !== 'PUBLISHED') return null;
    return { title: p.name, description: p.description || p.address || p.city, image: p.imageUrl };
  }
  const [t] = await db.select().from(trips).where(eq(trips.id, rawId));
  if (!t || !t.isPublic) return null;
  return { title: t.title, description: (t.data as any)?.summary || `برنامه سفر به ${t.city}` };
}

export async function injectPageMeta(html: string, pathname: string, origin: string): Promise<string> {
  let meta: PageMeta | null = null;
  try {
    meta = await metaFor(pathname);
  } catch {
    meta = null;
  }
  const title = meta ? `${meta.title} | ${SITE_NAME}` : SITE_NAME;
  const description = (meta?.description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').slice(0, 200);
  const image = meta?.image ? (meta.image.startsWith('http') ? meta.image : origin + meta.image) : `${origin}/icons/icon-512.png`;
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:url" content="${escapeHtml(origin + pathname)}">`,
    `<meta property="og:type" content="website">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace('</head>', `    ${tags}\n  </head>`);
}
