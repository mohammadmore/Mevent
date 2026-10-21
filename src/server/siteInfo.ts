import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { getFromCache, setToCache, invalidateCachePattern } from '../lib/sharedStore.ts';

// Business details shown on the legal pages, the contact page and the footer (Enamad requires
// them to be visible on the site). Edited by an admin; stored in settings under "site_info".

export interface SiteInfo {
  brandName: string;
  /** Registered legal name of the business (person or company) behind the site. */
  legalName: string;
  nationalId: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  supportHours: string;
  /** Enamad trust seal: the numeric id and code from the Enamad panel. */
  enamadId: string;
  enamadCode: string;
  /** Business days within which approved refunds are paid. */
  refundBusinessDays: number;
}

export const SITE_INFO_DEFAULTS: SiteInfo = {
  brandName: 'میونت',
  legalName: '',
  nationalId: '',
  address: '',
  postalCode: '',
  phone: '',
  email: '',
  supportHours: 'شنبه تا چهارشنبه، ۹ تا ۱۷',
  enamadId: '',
  enamadCode: '',
  refundBusinessDays: 7,
};

const LIMITS: Record<keyof SiteInfo, number> = {
  brandName: 60, legalName: 120, nationalId: 11, address: 300, postalCode: 10, phone: 30, email: 120,
  supportHours: 120, enamadId: 20, enamadCode: 40, refundBusinessDays: 0,
};

/** Validates an admin edit; returns the cleaned value or an error message. */
export function cleanSiteInfo(input: any): { value: SiteInfo } | { error: string } {
  const out: any = { ...SITE_INFO_DEFAULTS };
  for (const key of Object.keys(SITE_INFO_DEFAULTS) as (keyof SiteInfo)[]) {
    const v = input?.[key];
    if (v === undefined || v === null) continue;
    if (key === 'refundBusinessDays') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 30) return { error: 'مهلت بازپرداخت باید بین ۱ تا ۳۰ روز کاری باشد.' };
      out[key] = n;
      continue;
    }
    const s = String(v).trim();
    if (s.length > LIMITS[key]) return { error: `مقدار «${key}» بیش از حد طولانی است.` };
    out[key] = s;
  }
  // The seal is built from these two values, never from pasted HTML.
  if (out.enamadId && !/^\d{1,20}$/.test(out.enamadId)) return { error: 'شناسه اینماد فقط عدد است.' };
  if (out.enamadCode && !/^[A-Za-z0-9]{1,40}$/.test(out.enamadCode)) return { error: 'کد اینماد فقط حروف لاتین و عدد است.' };
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) return { error: 'ایمیل معتبر نیست.' };
  if (out.postalCode && !/^\d{10}$/.test(out.postalCode.replace(/[۰-۹]/g, (d: string) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))) return { error: 'کد پستی باید ۱۰ رقم باشد.' };
  return { value: out };
}

export async function getSiteInfo(): Promise<SiteInfo> {
  const cached = await getFromCache<SiteInfo>('site_info');
  if (cached) return cached;
  const [row] = await db.select().from(settings).where(eq(settings.key, 'site_info'));
  const info = { ...SITE_INFO_DEFAULTS, ...((row?.value as any) || {}) };
  await setToCache('site_info', info, 60_000);
  return info;
}

export async function saveSiteInfo(info: SiteInfo) {
  await db.insert(settings).values({ key: 'site_info', value: info })
    .onConflictDoUpdate({ target: settings.key, set: { value: info, updatedAt: new Date() } });
  await invalidateCachePattern('site_info');
}
