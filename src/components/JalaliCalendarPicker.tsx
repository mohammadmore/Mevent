import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, Check } from 'lucide-react';


export function toPersianDigits(num: number | string): string {
  return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return [gy, gm, gd];
}

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function formatIso(gy: number, gm: number, gd: number): string {
  const m = gm < 10 ? `0${gm}` : `${gm}`;
  const d = gd < 10 ? `0${gd}` : `${gd}`;
  return `${gy}-${m}-${d}`;
}

function parseIso(isoStr: string): [number, number, number] | null {
  if (!isoStr) return null;
  const parts = isoStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0])) {
    return [parts[0], parts[1], parts[2]];
  }
  return null;
}

export function formatPersianDateString(isoStr: string): string {
  const parsed = parseIso(isoStr);
  if (!parsed) return '';
  const [jy, jm, jd] = gregorianToJalali(parsed[0], parsed[1], parsed[2]);
  return `${toPersianDigits(jd)} ${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

interface JalaliCalendarPickerProps {
  startDateIso: string;
  endDateIso: string;
  onChangeRange: (startIso: string, endIso: string) => void;
}

export default function JalaliCalendarPicker({
  startDateIso,
  endDateIso,
  onChangeRange
}: JalaliCalendarPickerProps) {
  const today = new Date();
  const [todayJy, todayJm, todayJd] = gregorianToJalali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const [viewJy, setViewJy] = useState<number>(todayJy);
  const [viewJm, setViewJm] = useState<number>(todayJm);

  // Determine active selection step: 'start' or 'end'
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  const daysInMonth = (jy: number, jm: number): number => {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    // Check leap year for Jalali
    const isLeap = ((jy - (jy > 0 ? 474 : 473)) % 2820 + 474 + 38) * 682 % 2810 < 682;
    return isLeap ? 30 : 29;
  };

  const handlePrevMonth = () => {
    if (viewJm === 1) {
      setViewJm(12);
      setViewJy(v => v - 1);
    } else {
      setViewJm(v => v - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewJm === 12) {
      setViewJm(1);
      setViewJy(v => v + 1);
    } else {
      setViewJm(v => v + 1);
    }
  };

  // Get first day of current Jalali month day-of-week index (0 = Saturday)
  const getFirstDayOfWeek = (jy: number, jm: number): number => {
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
    const date = new Date(gy, gm - 1, gd);
    const jsDay = date.getDay(); // 0 = Sunday
    return (jsDay + 1) % 7; // Convert to Saturday = 0
  };

  const totalDays = daysInMonth(viewJy, viewJm);
  const firstDayIndex = getFirstDayOfWeek(viewJy, viewJm);

  const handleDayClick = (jd: number) => {
    const [gy, gm, gd] = jalaliToGregorian(viewJy, viewJm, jd);
    const selectedIso = formatIso(gy, gm, gd);

    if (selectionStep === 'start' || !startDateIso) {
      // Pick start date, reset end date to same day or 3 days later by default
      const endDateLater = new Date(gy, gm - 1, gd + 3);
      const endIso = formatIso(
        endDateLater.getFullYear(),
        endDateLater.getMonth() + 1,
        endDateLater.getDate()
      );
      onChangeRange(selectedIso, endIso);
      setSelectionStep('end');
    } else {
      // Pick end date
      if (selectedIso < startDateIso) {
        // If clicked date is before start date, set as new start date
        onChangeRange(selectedIso, startDateIso);
      } else {
        onChangeRange(startDateIso, selectedIso);
      }
      setSelectionStep('start');
    }
  };

  const isSelected = (jd: number): boolean => {
    const [gy, gm, gd] = jalaliToGregorian(viewJy, viewJm, jd);
    const iso = formatIso(gy, gm, gd);
    return iso === startDateIso || iso === endDateIso;
  };

  const isInRange = (jd: number): boolean => {
    if (!startDateIso || !endDateIso) return false;
    const [gy, gm, gd] = jalaliToGregorian(viewJy, viewJm, jd);
    const iso = formatIso(gy, gm, gd);
    return iso > startDateIso && iso < endDateIso;
  };

  const isToday = (jd: number): boolean => {
    return viewJy === todayJy && viewJm === todayJm && jd === todayJd;
  };

  // Quick preset buttons
  const applyPreset = (daysCount: number) => {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + daysCount);

    const startIso = formatIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const endIso = formatIso(future.getFullYear(), future.getMonth() + 1, future.getDate());

    onChangeRange(startIso, endIso);
    setSelectionStep('start');
  };

  // Calculate total nights/days
  let tripDurationDays = 0;
  if (startDateIso && endDateIso) {
    const d1 = new Date(startDateIso);
    const d2 = new Date(endDateIso);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    tripDurationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="bg-white dark:bg-[#222226] border border-gray-200 dark:border-white/10 rounded-2xl p-4 space-y-4 shadow-sm">
      {/* Header with selected summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/10">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">جدول انتخاب تاریخ رفت و برگشت</span>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mt-0.5">
            <span className="text-teal-600 dark:text-[#d9ff00]">
              {startDateIso ? formatPersianDateString(startDateIso) : 'انتخاب نشده'}
            </span>
            <span className="text-gray-400 font-normal">تا</span>
            <span className="text-teal-600 dark:text-[#d9ff00]">
              {endDateIso ? formatPersianDateString(endDateIso) : 'انتخاب نشده'}
            </span>
            {tripDurationDays > 0 && (
              <span className="text-xs bg-teal-50 dark:bg-[#d9ff00]/10 text-teal-700 dark:text-[#d9ff00] px-2 py-0.5 rounded-full font-semibold border border-teal-200 dark:border-[#d9ff00]/20">
                {toPersianDigits(tripDurationDays)} روز سفر
              </span>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset(2)}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            آخر هفته (۲ روز)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3)}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            ۳ روز آینده
          </button>
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            یک هفته
          </button>
        </div>
      </div>

      {/* Month & Navigation */}
      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
          title="ماه بعدی"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <span className="font-bold text-base text-gray-900 dark:text-gray-100">
          {PERSIAN_MONTHS[viewJm - 1]} {toPersianDigits(viewJy)}
        </span>

        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
          title="ماه قبلی"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Days Table Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Weekday Labels */}
        {WEEKDAYS.map((wd, i) => (
          <div key={i} className="py-1 text-xs font-bold text-gray-600 dark:text-gray-400">
            {wd}
          </div>
        ))}

        {/* Empty padding cells before first day */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9" />
        ))}

        {/* Day Number Cells */}
        {Array.from({ length: totalDays }).map((_, idx) => {
          const dayNum = idx + 1;
          const selected = isSelected(dayNum);
          const range = isInRange(dayNum);
          const todayCell = isToday(dayNum);

          return (
            <button
              key={toPersianDigits(dayNum)}
              type="button"
              onClick={() => handleDayClick(dayNum)}
              className={`h-9 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center ${
                selected
                  ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black shadow-md scale-105 z-10'
                  : range
                  ? 'bg-teal-50 dark:bg-[#d9ff00]/15 text-teal-800 dark:text-[#d9ff00]'
                  : todayCell
                  ? 'border-2 border-teal-600 dark:border-[#d9ff00] text-teal-700 dark:text-[#d9ff00] font-black'
                  : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200'
              }`}
            >
              {toPersianDigits(dayNum)}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center pt-1">
        💡 روی روز شروع و روز پایان سفر کلیک کنید تا محدوده تاریخ تنظیم شود.
      </p>
    </div>
  );
}
