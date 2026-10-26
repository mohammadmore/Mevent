import React from 'react';
import { navigate } from '../lib/router';
import { useSiteInfo } from '../lib/siteInfo';

export const LEGAL_LINKS: [string, string][] = [
  ['/about', 'درباره ما'],
  ['/contact', 'تماس با ما'],
  ['/terms', 'قوانین و مقررات'],
  ['/privacy', 'حریم خصوصی'],
  ['/refund-policy', 'لغو و بازپرداخت'],
];

/** Enamad trust seal, built from the numeric id/code the admin entered (never from pasted HTML). */
export function EnamadSeal({ id, code }: { id: string; code: string }) {
  if (!id || !code) return null;
  const q = `id=${encodeURIComponent(id)}&Code=${encodeURIComponent(code)}`;
  return (
    <a href={`https://trustseal.enamad.ir/?${q}`} target="_blank" rel="noopener" referrerPolicy="origin" aria-label="نماد اعتماد الکترونیکی">
      <img src={`https://trustseal.enamad.ir/logo.aspx?${q}`} alt="نماد اعتماد الکترونیکی" referrerPolicy="origin" className="h-20 w-auto" loading="lazy" {...{ code }} />
    </a>
  );
}

export function SiteFooter() {
  const info = useSiteInfo();
  return (
    <footer className="mt-10 pt-6 pb-4 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 space-y-3">
      <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="صفحات قانونی">
        {LEGAL_LINKS.map(([path, label]) => (
          <a key={path} href={path} onClick={(e) => { e.preventDefault(); navigate(path); }} className="inline-block py-2 hover:text-teal-600 dark:hover:text-[#d9ff00]">{label}</a>
        ))}
      </nav>
      <div className="flex items-end justify-between gap-4">
        <p className="leading-relaxed">
          © {info?.legalName || info?.brandName || 'میونت'}
          {info?.phone && <> · تلفن پشتیبانی: <span dir="ltr">{info.phone}</span></>}
        </p>
        {info && <EnamadSeal id={info.enamadId} code={info.enamadCode} />}
      </div>
    </footer>
  );
}
