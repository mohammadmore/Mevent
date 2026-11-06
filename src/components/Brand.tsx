// The logotype: the Persian name with the Latin one beside it. One place to swap in a logo file later.
export default function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const fa = size === 'lg' ? 'text-3xl' : 'text-2xl';
  const en = size === 'lg' ? 'text-base' : 'text-xs';
  return (
    <span className="inline-flex items-baseline gap-2 leading-none">
      <span className={`${fa} font-bold text-[#4C1D95] dark:text-gray-100`}>می‌ونت</span>
      <span dir="ltr" lang="en" className={`${en} font-semibold tracking-[0.18em] uppercase text-gray-500 dark:text-gray-400`}>Mevent</span>
    </span>
  );
}
