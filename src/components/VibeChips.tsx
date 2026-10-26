import React from 'react';
import { COMPANY, MOODS, isCompany, isMood } from '../lib/moods';

/** Mood and company tags ("مناسب قرار دونفره", "آروم و دنج"); company first, it decides plans. */
export function VibeChips({ vibes, max = 2, className = '' }: { vibes?: string[]; max?: number; className?: string }) {
  if (!vibes?.length) return null;
  const ordered = [...vibes.filter(isCompany), ...vibes.filter(isMood)].slice(0, max);
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      {ordered.map(k => {
        const v = isCompany(k) ? COMPANY[k] : MOODS[k as keyof typeof MOODS];
        return (
          <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/70 dark:bg-[#d9ff00]/10 dark:text-[#e8ff7a] dark:border-[#d9ff00]/20">
            <span aria-hidden>{v.emoji}</span> {v.label}
          </span>
        );
      })}
    </div>
  );
}

/** Organizer-side picker: which moods and company the event (or place) suits. Optional. */
export function VibePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k]);
  const chip = (k: string, emoji: string, label: string) => (
    <button key={k} type="button" aria-pressed={value.includes(k)} onClick={() => toggle(k)}
      className={`px-3 py-2.5 rounded-full text-xs border ${value.includes(k) ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black border-transparent font-bold' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}>
      <span aria-hidden>{emoji}</span> {label}
    </button>
  );
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">حال و هوا (اختیاری)</span>
      <div className="flex flex-wrap gap-2">{Object.entries(MOODS).map(([k, m]) => chip(k, m.emoji, m.label))}</div>
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">مناسب برای</span>
      <div className="flex flex-wrap gap-2">{Object.entries(COMPANY).map(([k, c]) => chip(k, c.emoji, c.label))}</div>
      <p className="text-[11px] text-gray-500">اگر انتخاب نکنید، از روی دسته‌بندی و زمان حدس می‌زنیم. این‌ها کمک می‌کنند آدم‌های مناسب پیدایتان کنند.</p>
    </div>
  );
}
