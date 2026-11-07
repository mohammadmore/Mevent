import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// A horizontally scrolling row. The edges fade where more content continues, and on devices with
// a mouse, arrow buttons appear (a mouse wheel cannot scroll sideways). Written for RTL pages:
// the row starts on the right and continues to the left.
export default function ScrollRow({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft); // 0 at the start; negative in RTL as it scrolls
    setEdges(prev => {
      const next = { start: pos > 4, end: pos < max - 4 };
      return prev.start === next.start && prev.end === next.end ? prev : next;
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });
    return () => { el.removeEventListener('scroll', update); ro?.disconnect(); mo.disconnect(); };
  }, [update]);

  const go = (forward: boolean) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const dist = el.clientWidth * 0.8;
    el.scrollBy({ left: (forward ? 1 : -1) * (rtl ? -dist : dist), behavior: 'smooth' });
  };

  const fade = edges.start && edges.end ? 'scroll-fade-both' : edges.start ? 'scroll-fade-start' : edges.end ? 'scroll-fade-end' : '';
  const arrow = 'scroll-row-arrow absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass-strong border shadow-md items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-105 transition-transform';
  return (
    <div className="relative">
      <div ref={ref} className={`${className} ${fade}`}>{children}</div>
      {edges.start && (
        <button type="button" aria-label="قبلی" onClick={() => go(false)} className={`${arrow} right-1`}><ChevronRight className="w-5 h-5" /></button>
      )}
      {edges.end && (
        <button type="button" aria-label="بعدی" onClick={() => go(true)} className={`${arrow} left-1`}><ChevronLeft className="w-5 h-5" /></button>
      )}
    </div>
  );
}
