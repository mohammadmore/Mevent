import logo160 from '../assets/brand/logotype-160.webp';
import logo320 from '../assets/brand/logotype-320.webp';
import logo480 from '../assets/brand/logotype-480.webp';
import logo720 from '../assets/brand/logotype-720.webp';

// The logotype (Latin "MEVENT" artwork) with the Persian name beside it. The browser picks the
// smallest file that is sharp on the screen: about 6 KB in the header on a normal screen,
// 15 KB on a phone, never the large one unless it is shown large.
const SRCSET = `${logo160} 160w, ${logo320} 320w, ${logo480} 480w, ${logo720} 720w`;

export default function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  if (size === 'lg') {
    return (
      <span className="flex flex-col items-center gap-2 leading-none">
        <img src={logo480} srcSet={SRCSET} sizes="(max-width: 400px) 250px, 280px" width={280} height={76}
          alt="Mevent" className="w-[250px] sm:w-[280px] h-auto select-none" draggable={false} />
        <span className="text-2xl font-bold text-[#4C1D95] dark:text-violet-200">می‌ونت</span>
      </span>
    );
  }
  // Both the logotype and the name are wide, so the Persian name sits under the logo, centred.
  return (
    <span className="inline-flex flex-col items-center gap-1 leading-none">
      <img src={logo320} srcSet={SRCSET} sizes="124px" width={124} height={34}
        alt="Mevent" className="w-[124px] h-auto select-none" draggable={false} />
      <span className="text-[15px] font-bold text-[#4C1D95] dark:text-violet-200">می‌ونت</span>
    </span>
  );
}
