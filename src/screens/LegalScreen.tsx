import React from 'react';
import { ArrowRight, Mail, Phone, MapPin, Clock, LifeBuoy } from 'lucide-react';
import { useSiteInfo, SiteInfo } from '../lib/siteInfo';
import { navigate, goBack } from '../lib/router';
import { pNum } from '../lib/format';
import { LEGAL_LINKS, EnamadSeal } from '../components/SiteFooter';
import { useAuth } from '../lib/AuthContext';

// Terms, privacy, refund policy, about and contact. Numbers (deadlines, discounts) come from the
// server so the text always matches what the system actually does.

export const LEGAL_PATHS = ['/terms', '/privacy', '/refund-policy', '/about', '/contact'];

const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-6 mb-2">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">{children}</p>;
const L = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc pr-5 space-y-1.5 text-sm leading-7 text-gray-700 dark:text-gray-300">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);
const A = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <a href={to} onClick={(e) => { e.preventDefault(); navigate(to); }} className="text-teal-600 dark:text-[#d9ff00] font-bold">{children}</a>
);

function owner(info: SiteInfo) {
  return info.legalName ? `${info.brandName} (${info.legalName})` : info.brandName;
}

function Terms({ info }: { info: SiteInfo }) {
  const r = info.rules;
  return (
    <>
      <P>این قوانین رابطه شما با {owner(info)} را هنگام استفاده از وب‌سایت و اپلیکیشن میونت مشخص می‌کند. استفاده از خدمات به معنای پذیرش این قوانین است.</P>
      <H>حساب کاربری</H>
      <L items={[
        'ورود با شماره موبایل و کد یک‌بارمصرف پیامکی انجام می‌شود. مسئولیت نگهداری از گوشی و کدهای دریافتی با شماست.',
        'هر شماره موبایل فقط به یک حساب تعلق دارد. اطلاعات حساب (نام و ...) باید واقعی باشد.',
        'حساب‌هایی که برای کلاهبرداری، هرزنامه یا آزار دیگران استفاده شوند مسدود می‌شوند.',
      ]} />
      <H>خرید بلیت</H>
      <L items={[
        'قیمت نهایی هر بلیت را سامانه محاسبه می‌کند و پیش از پرداخت به شما نشان داده می‌شود.',
        <>صندلی‌های سفارش تا {pNum(r.paymentHoldMinutes)} دقیقه برای پرداخت نگه داشته می‌شوند؛ پس از آن سفارش پرداخت‌نشده خودکار لغو می‌شود.</>,
        'پرداخت از طریق درگاه بانکی رسمی انجام می‌شود و میونت به اطلاعات کارت بانکی شما دسترسی ندارد.',
        'بلیت فقط پس از تأیید پرداخت از سوی بانک صادر می‌شود. کد ورود هر بلیت یکتاست و فقط یک بار در ورودی پذیرفته می‌شود.',
        <>امتیاز باشگاه مشتریان تا {pNum(r.maxPointsSharePercent)}٪ مبلغ سفارش قابل استفاده است (هر امتیاز {pNum(r.pointValueToman)} تومان). بلیت دوم برای همراه {pNum(r.friendDiscountPercent)}٪ تخفیف دارد.</>,
        <>شرایط لغو بلیت و بازگشت وجه در صفحه <A to="/refund-policy">لغو و بازپرداخت</A> آمده است.</>,
      ]} />
      <H>برگزارکنندگان</H>
      <L items={[
        'برای فروش بلیت پولی، احراز هویت برگزارکننده (مشخصات هویتی یا ثبتی و مدارک) لازم است.',
        'برگزارکننده مسئول درستی اطلاعات رویداد (زمان، مکان، قیمت، ظرفیت) و برگزاری آن مطابق اعلام است.',
        'در صورت لغو رویداد از سوی برگزارکننده، وجه همه بلیت‌های پرداختی به خریداران بازگردانده می‌شود.',
        'انتشار محتوای خلاف قوانین جمهوری اسلامی ایران، محتوای گمراه‌کننده یا نقض حقوق دیگران ممنوع است و حذف می‌شود.',
      ]} />
      <H>محتوای کاربران</H>
      <P>کاربران می‌توانند رویداد، پاتوق یا محتوای نامناسب را گزارش دهند. محتوای گزارش‌شده بررسی و در صورت تخلف پنهان یا حذف می‌شود.</P>
      <H>تغییر قوانین</H>
      <P>این قوانین ممکن است به‌روز شود. نسخه جدید از زمان انتشار در همین صفحه معتبر است.</P>
    </>
  );
}

function Privacy({ info }: { info: SiteInfo }) {
  return (
    <>
      <P>{owner(info)} فقط اطلاعاتی را نگه می‌دارد که برای ارائه خدمات لازم است و آن را به هیچ شخص ثالثی نمی‌فروشد.</P>
      <H>چه اطلاعاتی نگه می‌داریم</H>
      <L items={[
        'شماره موبایل (برای ورود، ارسال بلیت و پیامک‌های مربوط به خرید شما).',
        'نام و اطلاعاتی که خودتان در پروفایل وارد می‌کنید.',
        'سفارش‌ها، بلیت‌ها و رویدادهایی که ذخیره یا در آن‌ها ثبت‌نام کرده‌اید.',
        'موقعیت مکانی فقط وقتی خودتان «رویدادهای نزدیک من» را بزنید، و فقط برای همان جستجو.',
        'برای برگزارکنندگان: مدارک احراز هویت، که فقط مدیران سامانه برای بررسی به آن دسترسی دارند.',
      ]} />
      <H>کوکی‌ها</H>
      <P>پس از ورود، یک کوکی امن نشست (غیرقابل خواندن برای اسکریپت‌ها) در مرورگر شما ذخیره می‌شود تا وارد حساب بمانید. از کوکی تبلیغاتی یا ردیابی استفاده نمی‌کنیم.</P>
      <H>با چه کسانی به اشتراک گذاشته می‌شود</H>
      <L items={[
        'درگاه پرداخت بانکی: فقط مبلغ و شناسه سفارش برای انجام پرداخت.',
        'سرویس ارسال پیامک: شماره موبایل و متن پیامک (کد ورود، بلیت، یادآوری).',
        'برگزارکننده رویدادی که بلیت آن را خریده‌اید: نام شما در فهرست شرکت‌کنندگان (بدون شماره موبایل).',
        'در صورت درخواست قانونی مراجع قضایی.',
      ]} />
      <H>پیامک‌ها</H>
      <P>پیامک کد ورود و بلیت همیشه ارسال می‌شود. پیامک یادآوری رویداد را می‌توانید از صفحه پروفایل خاموش کنید.</P>
      <H>حذف اطلاعات</H>
      <P>برای حذف حساب و اطلاعاتتان از طریق <A to="/contact">تماس با ما</A> درخواست دهید. سوابق مالی (سفارش و پرداخت) طبق قانون نگهداری می‌شوند.</P>
    </>
  );
}

function RefundPolicy({ info }: { info: SiteInfo }) {
  const r = info.rules;
  return (
    <>
      <H>لغو از سوی خریدار</H>
      <L items={[
        <>هر بلیت را تا {pNum(r.cancelDeadlineHours)} ساعت پیش از شروع رویداد می‌توانید از بخش «بلیت‌های من» لغو کنید.</>,
        'مبلغ پرداختی بلیت لغوشده به‌طور کامل بازگردانده می‌شود و امتیازهای استفاده‌شده در سفارش به حساب امتیاز شما برمی‌گردد.',
        'بلیتی که به شخص دیگری منتقل شده یا در ورودی استفاده شده، قابل لغو نیست.',
        'لغو بلیت رایگان فقط جای شما را آزاد می‌کند.',
      ]} />
      <H>لغو یا تعویق از سوی برگزارکننده</H>
      <L items={[
        'اگر رویداد لغو شود، همه بلیت‌ها باطل و وجه آن‌ها بدون نیاز به درخواست بازگردانده می‌شود.',
        'اگر زمان رویداد تغییر کند، می‌توانید تا پیش از زمان جدید بلیت خود را بدون محدودیت مهلت لغو کنید و وجه کامل را پس بگیرید.',
        'در هر دو حالت از طریق پیامک و اعلان باخبر می‌شوید.',
      ]} />
      <H>زمان بازگشت وجه</H>
      <P>وجه بلیت‌های پرداختی حداکثر ظرف {pNum(info.refundBusinessDays)} روز کاری به همان کارتی که با آن پرداخت کرده‌اید بازگردانده می‌شود. پس از واریز، پیام تأیید دریافت می‌کنید.</P>
      <H>پیگیری</H>
      <P>اگر بازپرداختی در موعد انجام نشد، از طریق <A to="/contact">تماس با ما</A> پیگیری کنید.</P>
    </>
  );
}

function About({ info }: { info: SiteInfo }) {
  return (
    <>
      <P>میونت جایی است برای پیدا کردن رویدادهای شهرتان، پاتوق‌های تازه و برنامه‌ریزی سفر؛ از کنسرت و تئاتر تا کارگاه و دورهمی.</P>
      <L items={[
        'رویدادها را بر اساس شهر، زمان، قیمت و علاقه‌تان پیدا کنید.',
        'بلیت را آنلاین بخرید و کد ورود را همراه داشته باشید.',
        'برگزارکنندگان رویدادشان را ثبت می‌کنند، بلیت می‌فروشند و ورود را با کد بلیت کنترل می‌کنند.',
      ]} />
      {info.legalName && <P>میونت متعلق به {info.legalName} است.</P>}
    </>
  );
}

function Contact({ info }: { info: SiteInfo }) {
  const { dbUserId } = useAuth();
  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-white/5">
      <span className="text-teal-600 dark:text-[#d9ff00] mt-0.5">{icon}</span>
      <div><div className="text-xs text-gray-500">{label}</div><div className="text-sm text-gray-900 dark:text-gray-100">{value}</div></div>
    </div>
  );
  return (
    <>
      <button onClick={() => navigate(dbUserId ? '/support' : '/login')} className="w-full mb-4 py-3 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold flex items-center justify-center gap-2">
        <LifeBuoy className="w-5 h-5" /> ثبت درخواست پشتیبانی
      </button>
      {info.phone && row(<Phone className="w-4 h-4" />, 'تلفن', <a href={`tel:${info.phone}`} dir="ltr">{info.phone}</a>)}
      {info.email && row(<Mail className="w-4 h-4" />, 'ایمیل', <a href={`mailto:${info.email}`} dir="ltr">{info.email}</a>)}
      {info.supportHours && row(<Clock className="w-4 h-4" />, 'ساعات پاسخگویی', info.supportHours)}
      {info.address && row(<MapPin className="w-4 h-4" />, 'نشانی', <>{info.address}{info.postalCode && <> — کد پستی {pNum(info.postalCode)}</>}</>)}
      {info.legalName && row(<span className="text-xs font-bold">ح</span>, 'صاحب کسب‌وکار', <>{info.legalName}{info.nationalId && <> — شناسه {pNum(info.nationalId)}</>}</>)}
    </>
  );
}

const PAGES: Record<string, { title: string; body: (info: SiteInfo) => React.ReactNode }> = {
  '/terms': { title: 'قوانین و مقررات', body: info => <Terms info={info} /> },
  '/privacy': { title: 'حریم خصوصی', body: info => <Privacy info={info} /> },
  '/refund-policy': { title: 'لغو و بازپرداخت', body: info => <RefundPolicy info={info} /> },
  '/about': { title: 'درباره ما', body: info => <About info={info} /> },
  '/contact': { title: 'تماس با ما', body: info => <Contact info={info} /> },
};

export function LegalScreen({ path }: { path: string }) {
  const info = useSiteInfo();
  const page = PAGES[path];
  if (!page) return null;
  return (
    <article className="max-w-2xl mx-auto w-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
      <button onClick={() => goBack('/')} className="text-sm text-gray-500 flex items-center gap-1 mb-3"><ArrowRight className="w-4 h-4" /> بازگشت</button>
      <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-4">{page.title}</h1>
      {info ? page.body(info) : <div className="py-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-teal-600/20 border-t-teal-600 animate-spin" /></div>}
      <nav className="mt-8 pt-4 border-t border-gray-100 dark:border-white/10 flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="صفحات قانونی">
        {LEGAL_LINKS.filter(([p]) => p !== path).map(([p, label]) => <A key={p} to={p}>{label}</A>)}
      </nav>
      {info && <div className="mt-4 flex justify-center"><EnamadSeal id={info.enamadId} code={info.enamadCode} /></div>}
    </article>
  );
}
