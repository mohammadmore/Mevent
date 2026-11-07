import { placeTypeLabel } from '../lib/format';
import { Choice, SlideGroup } from './Slide';
import ScrollRow from './ScrollRow';
import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Calendar, Activity, DollarSign, Edit, X, Settings, MapPin, Film, Wind,
  Cpu, Database, RefreshCw, Trash2, Play, CheckCircle, AlertTriangle, Zap, Server, Inbox
} from 'lucide-react';
import ModerationCenter from './ModerationCenter';
import { SiteInfoForm } from './admin/SiteInfoForm';
import { SmsOutboxCard } from './admin/SmsOutboxCard';
import { ErrorsCard, BackupsCard, SupportAdmin } from './admin/OpsCards';
import { showToast } from '../lib/apiClient';
import EventForm from './EventForm';
import PlaceForm from './PlaceForm';
import ChainForm from './ChainForm';
import VibeForm from './VibeForm';
import FlowForm from './FlowForm';
import { availableIcons, defaultBackgroundIcons } from '../lib/icons';

const pNum = (n: any) => {
  if (n === null || n === undefined) return '';
  return n.toString().replace(/\d/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};

const toPersianDigits = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

export default function AdminPanel() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'moderation' | 'users' | 'events' | 'settings' | 'metrics' | 'places' | 'chains' | 'vibes' | 'flows' | 'support'>('moderation');
  const [crawlerUrl, setCrawlerUrl] = useState('https://calendar.iranfair.com/fa');
  const [places, setPlaces] = useState<any[]>([]);
  const [chains, setChains] = useState<any[]>([]);
  const [vibes, setVibes] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [editingPlace, setEditingPlace] = useState<any>(null);
  const [editingChain, setEditingChain] = useState<any>(null);
  const [editingVibe, setEditingVibe] = useState<any>(null);
  const [editingFlow, setEditingFlow] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [catInput, setCatInput] = useState('');
  const [bgIconsConfig, setBgIconsConfig] = useState<any[]>(defaultBackgroundIcons);
  const [advancedFieldsConfig, setAdvancedFieldsConfig] = useState<any[]>([]);
  const [basicFieldsConfig, setBasicFieldsConfig] = useState<any[]>([{"name":"poster","label":"پوستر رویداد","enabled":true},{"name":"category","label":"دسته‌بندی","enabled":true},{"name":"address","label":"محل برگزاری / لینک","enabled":true},{"name":"cost","label":"هزینه ثبت‌نام","enabled":true},{"name":"capacity","label":"ظرفیت رویداد","enabled":true}]);
  const [newIconName, setNewIconName] = useState('');
  const [isBgIconsModalOpen, setIsBgIconsModalOpen] = useState(false);

  // Metrics state
  const [metricsData, setMetricsData] = useState<any>(null);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [asyncJob, setAsyncJob] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'metrics') {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, eventsRes, settingsRes, placesRes, chainsRes, vibesRes, flowsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/events'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/places'),
        fetch('/api/admin/chains'),
        fetch('/api/admin/vibes'),
        fetch('/api/admin/flows')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data);
      }
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data);
      }
      if (placesRes.ok) {
        const placesData = await placesRes.json();
        setPlaces(placesData);
      }
      if (chainsRes.ok) {
        const chainsData = await chainsRes.json();
        setChains(chainsData);
      }
      if (vibesRes.ok) {
        const vibesData = await vibesRes.json();
        setVibes(vibesData);
      }
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        setFlows(flowsData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data);
        if (settingsData.data && settingsData.data.event_categories) {
          setCatInput(Array.isArray(settingsData.data.event_categories) ? settingsData.data.event_categories.join(', ') : '');
        }
        if (settingsData.data && settingsData.data.event_bg_icons) {
          setBgIconsConfig(settingsData.data.event_bg_icons);
        }
        if (settingsData.data && settingsData.data.event_basic_fields) {
          setBasicFieldsConfig(settingsData.data.event_basic_fields);
        }
        if (settingsData.data && settingsData.data.event_advanced_fields) {
          setAdvancedFieldsConfig(settingsData.data.event_advanced_fields);
        } else {
          setAdvancedFieldsConfig([
            { name: 'dressCode', label: 'کد پوشش (Dress Code)', options: ["رسمی", "نیمه رسمی", "کژوال", "آزاد", "تم خاص"] },
            { name: 'parking', label: 'وضعیت پارکینگ', options: ["پارکینگ اختصاصی رایگان", "پارکینگ اختصاصی پولی", "پارکینگ عمومی نزدیک", "پارکینگ خیابانی", "بدون پارکینگ"] },
            { name: 'accessibility', label: 'امکانات برای توان‌یابان', options: ["ورودی رمپ دار", "آسانسور", "سرویس بهداشتی ویژه", "فضای مناسب ویلچر", "بدون امکانات ویژه"] },
            { name: 'ageRestriction', label: 'محدودیت سنی', options: ["بدون محدودیت", "بالای ۱۸ سال", "بالای ۱۵ سال", "مخصوص کودکان", "مخصوص خانواده"] },
            { name: 'foodAndDrink', label: 'پذیرایی و غذا', options: ["پذیرایی کامل", "میان وعده و نوشیدنی", "فقط نوشیدنی", "امکان خرید غذا در محل", "بدون پذیرایی"] },
            { name: 'weatherPolicy', label: 'شرایط آب و هوایی', options: ["برگزاری در فضای بسته", "برگزاری در فضای باز", "در صورت بارندگی لغو/تعویق", "دارای سقف متحرک", "برگزاری تحت هر شرایطی"] },
            { name: 'cancellationPolicy', label: 'قوانین لغو بلیت', options: ["غیرقابل لغو", "لغو تا ۴۸ ساعت قبل", "لغو تا ۲۴ ساعت قبل", "لغو با کسر جریمه", "لغو منعطف"] },
            { name: 'itemsToBring', label: 'لوازم مورد نیاز', options: ["کارت شناسایی معتبر", "بلیت چاپ شده", "لپ‌تاپ/دفترچه یادداشت", "لباس گرم/مناسب", "نیازی به چیزی نیست"] },
            { name: 'prohibitedItems', label: 'لوازم ممنوعه', options: ["همراه داشتن حیوانات خانگی", "دوربین عکاسی حرفه‌ای", "خوراکی و نوشیدنی از بیرون", "استعمال دخانیات", "سلاح سرد و گرم"] },
            { name: 'scheduleDetails', label: 'جزئیات زمان‌بندی', options: ["شروع دقیق و بدون تاخیر", "دارای زمان تنفس", "پایان متغیر", "برنامه‌های جانبی پس از رویداد", "ورود در حین برنامه مجاز"] },
            { name: 'speakersOrPerformers', label: 'سخنرانان / اجراکنندگان', options: ["یک سخنران/اجراکننده اصلی", "پنل گفتگوی چند نفره", "اجرای گروهی", "مهمانان ویژه", "بدون سخنران مشخص"] },
            { name: 'networkingOpportunities', label: 'فرصت‌های شبکه‌سازی', options: ["زمان اختصاصی شبکه‌سازی", "گروه مجازی قبل از رویداد", "کافه/فضای استراحت مشترک", "بازی‌ها و فعالیت‌های گروهی", "بدون برنامه شبکه‌سازی"] },
            { name: 'photographyPolicy', label: 'قوانین عکاسی', options: ["عکاسی آزاد است", "فقط با موبایل مجاز است", "عکاسی کاملا ممنوع است", "عکاس اختصاصی حضور دارد", "نیاز به مجوز قبلی"] },
            { name: 'merchandise', label: 'فروش محصولات/مرچندایز', options: ["فروشگاه رسمی در محل", "فروش آنلاین با تحویل در محل", "غرفه‌های محصولات مرتبط", "هدایای رایگان (Swag)", "بدون فروش محصولات"] },
            { name: 'wifiAvailability', label: 'وضعیت اینترنت (Wi-Fi)', options: ["اینترنت رایگان نامحدود", "اینترنت رایگان محدود", "اینترنت پولی", "مخصوص غرفه‌داران", "بدون دسترسی به اینترنت"] },
            { name: 'restrooms', label: 'سرویس‌های بهداشتی', options: ["سرویس ایرانی و فرنگی", "فقط سرویس ایرانی", "فقط سرویس فرنگی", "سرویس ویژه توان‌یابان", "خارج از سالن اصلی"] },
            { name: 'securityInfo', label: 'اطلاعات امنیتی', options: ["بازرسی در ورودی", "نیروهای حراست مستقر", "دوربین‌های مداربسته", "محیط کاملا امن و خانوادگی", "نیاز به ارائه کارت شناسایی"] },
            { name: 'firstAid', label: 'کمک‌های اولیه', options: ["تیم پزشکی مستقر", "جعبه کمک‌های اولیه", "نزدیک به درمانگاه/بیمارستان", "آمبولانس مستقر", "بدون امکانات خاص"] },
            { name: 'publicTransport', label: 'دسترسی با نقلیه عمومی', options: ["نزدیک ایستگاه مترو", "نزدیک ایستگاه اتوبوس/BRT", "دسترسی آسان با تاکسی", "خارج از محدوده طرح ترافیک", "دسترسی دشوار با نقلیه عمومی"] },
            { name: 'accommodationOptions', label: 'امکانات اقامتی', options: ["هتل در نزدیکی محل", "خوابگاه/اقامتگاه هماهنگ شده", "امکان چادر زدن", "تخفیف ویژه برای هتل‌های همکار", "بدون امکانات اقامتی"] }
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshDependencies = async () => {
    try {
      const res = await fetch('/api/admin/dependencies?refresh=1');
      if (res.ok) {
        const d = await res.json();
        setMetricsData((m: any) => ({ ...(m || {}), dependencies: d.data }));
      }
    } catch { /* ignore */ }
  };

  const fetchMetrics = async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/health/metrics'),
        fetch('/api/admin/cache')
      ]);
      if (mRes.ok) {
        const m = await mRes.json();
        setMetricsData(m);
      }
      if (cRes.ok) {
        const c = await cRes.json();
        setCacheInfo(c.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearCache = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/cache', { method: 'DELETE' });
      if (res.ok) {
        showToast('کش سیستم با موفقیت پاکسازی شد.', 'success');
        fetchMetrics();
      }
    } catch (e) {
      showToast('خطا در پاکسازی کش', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const triggerAsyncCrawler = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/jobs/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlerUrl })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAsyncJob({ id: data.jobId, progress: 10, status: 'RUNNING' });
        pollJobStatus(data.jobId);
      } else {
        showToast(data.error || 'خطا در شروع فرآیند پس‌زمینه', 'error');
      }
    } catch (e) {
      showToast('خطا در شروع فرآیند پس‌زمینه', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          const job = data.data;
          setAsyncJob(job);
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            clearInterval(pollInterval);
            showToast(job.status === 'COMPLETED' ? (job.result?.message || 'خزش انجام شد.') : `خزش ناموفق بود: ${job.error || ''}`, job.status === 'COMPLETED' ? 'success' : 'error');
            fetchData();
          }
        }
      } catch (e) {
        clearInterval(pollInterval);
      }
    }, 1500);
  };

  const changeRole = async (userId: number, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        showToast('نقش کاربر تغییر کرد.', 'success');
      } else {
        showToast('خطا در تغییر نقش کاربر', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در ارسال درخواست', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const updateSettings = async () => {
    try {
      setActionLoading(true);
      setSaveStatus('idle');
      const categories = catInput.split(',').map(c => c.trim()).filter(Boolean);
      
      const resCat = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'event_categories', value: categories })
      });
      
      const resIcons = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'event_bg_icons', value: bgIconsConfig }) });
      const resBasicFields = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'event_basic_fields', value: basicFieldsConfig })
      });
      
      const resAdvancedFields = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'event_advanced_fields', value: advancedFieldsConfig }) });

      if (resCat.ok && resIcons.ok && resAdvancedFields.ok && resBasicFields.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-[#4C1D95] dark:text-[#C4B5FD]">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-l from-[#3B4FD8] via-[#5B21B6] to-[#3B0764] dark:from-[#1f1f23] dark:via-[#1f1f23] dark:to-[#18181b] p-5 sm:p-6 rounded-2xl text-white shadow-md border border-white/10" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/15 dark:bg-[#8B5CF6]/20 rounded-xl text-white dark:text-[#C4B5FD] shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">مدیریت سیستم</h2>
            <p className="text-xs text-white/80">کاربران، رویدادها، کارهای در انتظار و وضعیت سرویس‌ها</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="self-start sm:self-auto min-h-[44px] px-4 bg-white/15 hover:bg-white/25 rounded-xl transition-all text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          به‌روزرسانی
        </button>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir="rtl">
        <div className="glass border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">کل کاربران</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{pNum(stats?.totalUsers || 0)}</div>
          </div>
        </div>

        <div className="glass border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-[#C4B5FD] rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">کل رویدادها</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{pNum(stats?.totalEvents || 0)}</div>
          </div>
        </div>

        <div className="glass border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">بلیت‌های فروخته شده</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{pNum(stats?.totalTickets || 0)}</div>
          </div>
        </div>

        <div className="glass border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">درآمد کل (تومان)</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{pNum((stats?.totalRevenue || 0).toLocaleString('fa-IR'))}</div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <SlideGroup><ScrollRow className="flex border-b border-gray-300 dark:border-white/10 gap-2 overflow-x-auto">
        <Choice
          selected={activeTab === 'moderation'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'moderation' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Inbox className="w-4 h-4" />
          کارهای در انتظار{stats?.pendingOrganizerRequests ? ` (${toPersianDigits(stats.pendingOrganizerRequests)})` : ''}
        </Choice>

        <Choice
          selected={activeTab === 'users'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'users' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          مدیریت کاربران ({toPersianDigits(users.length)})
        </Choice>

        <Choice
          selected={activeTab === 'events'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'events' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          مدیریت رویدادها ({toPersianDigits(events.length)})
        </Choice>

        <Choice
          selected={activeTab === 'support'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('support')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'support' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Inbox className="w-4 h-4" />
          پشتیبانی
        </Choice>

        <Choice
          selected={activeTab === 'metrics'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'metrics' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Server className="w-4 h-4" />
          سیستم و مانیتورینگ
        </Choice>

        <Choice
          selected={activeTab === 'places'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('places')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'places' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          پاتوق‌ها ({toPersianDigits(places.length)})
        </Choice>
        <Choice
          selected={activeTab === 'chains'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('chains')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'chains' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Film className="w-4 h-4" />
          فستیوال‌ها ({toPersianDigits(chains.length)})
        </Choice>
        <Choice
          selected={activeTab === 'vibes'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('vibes')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'vibes' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Wind className="w-4 h-4" />
          حال و هوا ({toPersianDigits(vibes.length)})
        </Choice>
        <Choice
          selected={activeTab === 'flows'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('flows')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'flows' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          جریان‌ها ({toPersianDigits(flows.length)})
        </Choice>
        <Choice
          selected={activeTab === 'settings'}
          pill="top-auto h-0.5 rounded-t-full bg-teal-600 dark:bg-[#A78BFA]"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'settings' ? 'text-teal-600 dark:text-[#C4B5FD]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          تنظیمات
        </Choice>
      </ScrollRow></SlideGroup>

      {/* Tab Contents: a new tab fades in */}
      <div key={activeTab} className="screen-fade">
        {activeTab === 'moderation' ? (
          <ModerationCenter />
        ) : activeTab === 'support' ? (
          <SupportAdmin />
        ) : activeTab === 'metrics' ? (
          <div className="space-y-6" dir="rtl">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass border p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-500 font-bold">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-500" />
                    حافظه و پردازش سرور
                  </span>
                  <span className="text-xs bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full">
                    Uptime: {pNum(metricsData?.uptimeSeconds || 0)}s
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">حافظه RSS:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{pNum(metricsData?.memoryUsage?.rssMb || 0)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">حافظه استفاده شده Heap:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{pNum(metricsData?.memoryUsage?.heapUsedMb || 0)} MB</span>
                  </div>
                </div>
              </div>

              <div className="glass border p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-500 font-bold">
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    عملکرد کش در حافظه (Cache)
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                    Hit Rate: {pNum(metricsData?.cache?.hitRateRatio || '0.00')}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">کلیدهای فعال:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{pNum(metricsData?.cache?.activeKeys || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">درخواست‌های موفق کش (Hits):</span>
                    <span className="font-mono font-bold text-emerald-500">{pNum(metricsData?.cache?.hits || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="glass border p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-500 font-bold">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    سرویس‌های بیرونی
                  </span>
                  <button onClick={refreshDependencies} aria-label="بررسی دوباره" className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {!(metricsData?.dependencies?.length) ? (
                  <p className="text-xs text-gray-400">سرویس بیرونی‌ای پیکربندی نشده است.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {metricsData.dependencies.map((d: any) => (
                      <li key={d.name} className="flex items-center justify-between gap-2" title={d.error || ''}>
                        <span className="text-gray-600 dark:text-gray-300 truncate">{d.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          d.state === 'up' ? 'bg-emerald-500/10 text-emerald-600' : d.state === 'down' ? 'bg-rose-500/10 text-rose-600' : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {d.state === 'up' ? `در دسترس${d.latencyMs != null ? ` · ${pNum(d.latencyMs)}ms` : ''}` : d.state === 'down' ? 'قطع (پلن B)' : 'نامشخص'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <SmsOutboxCard />
              <ErrorsCard />
              <BackupsCard />
            </div>

            {/* Cache Control & Background Job Trigger */}
            <div className="glass border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-600 dark:text-[#C4B5FD]" />
                عملیات کنترل زیرساخت و کارهای پس‌زمینه
              </h3>
              <p className="text-xs text-gray-500">پاکسازی مستقیم کش یا اجرای کارهای سنگین (مانند خزشگر) به صورت کاملا غیرهمزمان در پس‌زمینه.</p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={clearCache}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  پاکسازی فوری تمامی کش‌ها
                </button>

                <input
                  type="url"
                  dir="ltr"
                  value={crawlerUrl}
                  onChange={(e) => setCrawlerUrl(e.target.value)}
                  aria-label="آدرس صفحه برای خزش"
                  className="px-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-white/10 glass-soft min-w-[220px]"
                />
                <button
                  onClick={triggerAsyncCrawler}
                  disabled={actionLoading || (asyncJob && asyncJob.status === 'RUNNING')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  شروع خزشگر پس‌زمینه (Async Crawler Job)
                </button>
              </div>

              {/* Progress if job running */}
              {asyncJob && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-white/5 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>کد کار پس‌زمینه: {pNum(asyncJob.id)}</span>
                    <span className="text-teal-600 dark:text-[#C4B5FD]">{asyncJob.status === "RUNNING" ? "در حال اجرا" : asyncJob.status === "COMPLETED" ? "پایان یافته" : asyncJob.status === "FAILED" ? "خطا" : asyncJob.status} ({pNum(asyncJob.progress)}٪)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 dark:bg-[#7C3AED] h-full transition-all duration-300"
                      style={{ width: `${asyncJob.progress}%` }}
                    />
                  </div>
                  {asyncJob.result && (
                    <div className="text-emerald-500 font-bold mt-1">
                      {asyncJob.result.message}
                    </div>
                  )}
                  {asyncJob.error && (
                    <div className="text-rose-500 font-bold mt-1">
                      خطا: {asyncJob.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="glass border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm" dir="rtl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="glass-soft text-gray-700 dark:text-gray-300 font-medium border-b border-gray-300 dark:border-white/20">
                  <tr>
                    <th className="px-4 py-3">شناسه</th>
                    <th className="px-4 py-3">نام</th>
                    <th className="px-4 py-3">ایمیل/شماره</th>
                    <th className="px-4 py-3">نقش فعلی</th>
                    <th className="px-4 py-3">عملیات (تغییر نقش)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map(u => (
                    <tr key={pNum(u.id)} className="hover:bg-gray-100/50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-400 font-mono">{pNum(u.id)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{u.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">{u.email || u.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                          u.role === 'ORGANIZER' ? 'bg-teal-600/20 dark:bg-[#8B5CF6]/20 text-teal-600 dark:text-[#C4B5FD]' : 'bg-white/5 text-gray-700 dark:text-gray-300'
                        }`}>
                          {u.role === 'ADMIN' ? 'مدیر' : u.role === 'ORGANIZER' ? 'برگزارکننده' : 'کاربر'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={updating === u.id}
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="glass border border-gray-300 dark:border-white/20 text-gray-700 text-xs rounded-lg focus:ring-teal-600 dark:ring-[#A78BFA] focus:border-teal-600 dark:border-[#A78BFA] block p-1.5"
                        >
                          <option value="USER">کاربر عادی</option>
                          <option value="ORGANIZER">برگزارکننده</option>
                          <option value="ADMIN">مدیر سیستم</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="glass border border-gray-300 dark:border-white/20 rounded-xl p-6 shadow-sm space-y-6 text-right" dir="rtl">
            <div>
              <h3 className="font-bold text-[#4C1D95] dark:text-gray-100 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600 dark:text-[#C4B5FD]" />
                تنظیمات کلی
              </h3>

              <SiteInfoForm />


              
              
              <div className="pt-6 border-t border-gray-200 dark:border-white/10 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-[#4C1D95] dark:text-gray-100 mb-1">فیلدهای عمومی رویداد</h3>
                    <p className="text-xs text-gray-500">فیلدهای پایه فرم ثبت رویداد را تغییر نام داده یا غیرفعال کنید.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {basicFieldsConfig.map((field, index) => (
                    <div key={index} className={`p-3 border border-gray-200 dark:border-white/10 rounded-xl glass-soft flex flex-col gap-3 ${field.name === 'category' ? 'md:col-span-2' : ''}`}>
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 mb-1">{field.name}</label>
                          <input 
                            type="text" 
                            value={field.label}
                            onChange={e => {
                              const newConfig = [...basicFieldsConfig];
                              newConfig[index].label = e.target.value;
                              setBasicFieldsConfig(newConfig);
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm glass text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-600"
                          />
                        </div>
                        <div className="pt-5">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              onChange={e => {
                                const newConfig = [...basicFieldsConfig];
                                newConfig[index].enabled = e.target.checked;
                                setBasicFieldsConfig(newConfig);
                              }}
                              className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded"
                            />
                            فعال
                          </label>
                        </div>
                      </div>
                      
                      {field.name === 'category' && (
                        <div className="mt-2 pt-3 border-t border-gray-200 dark:border-white/10">
                          <label className="block text-xs font-bold text-gray-500 mb-2">گزینه‌های دسته‌بندی (با کاما جدا کنید)</label>
                          <input
                            type="text"
                            value={catInput}
                            onChange={(e) => setCatInput(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#A78BFA] focus:border-teal-600 dark:border-[#A78BFA] outline-none bg-transparent text-sm"
                            placeholder="مثلا: ورزشی، فرهنگی، آموزشی"
                          />
                        </div>
                      )}

                      {field.name === 'poster' && (
                        <div className="mt-2 pt-3 border-t border-gray-200 dark:border-white/10 flex justify-end">
                          <button
                            onClick={() => setIsBgIconsModalOpen(true)}
                            className="text-xs flex items-center gap-1.5 font-bold px-3 py-1.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-400 rounded-lg transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            مدیریت آیکون‌های پس‌زمینه
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-white/10 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-[#4C1D95] dark:text-gray-100 mb-1">فیلدهای تخصصی رویداد (ثبت‌نام تکمیلی)</h3>
                    <p className="text-xs text-gray-500">تمامی آیتم‌های فرم را از اینجا مدیریت کنید. می‌توانید نام فیلد، عنوان و گزینه‌ها را تغییر دهید.</p>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {advancedFieldsConfig.map((field, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-white/10 rounded-xl glass-soft">
                      <div className="flex justify-between items-start mb-3">
                        <div className="grid grid-cols-2 gap-3 flex-1">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">نام سیستمی (انگلیسی، بدون فاصله)</label>
                            <input 
                              type="text" 
                              value={field.name}
                              onChange={e => {
                                const newConfig = [...advancedFieldsConfig];
                                newConfig[index].name = e.target.value.replace(/\s+/g, '');
                                setAdvancedFieldsConfig(newConfig);
                              }}
                              className="w-full px-3 py-2 border rounded-lg text-sm glass text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">عنوان نمایشی (فارسی)</label>
                            <input 
                              type="text" 
                              value={field.label}
                              onChange={e => {
                                const newConfig = [...advancedFieldsConfig];
                                newConfig[index].label = e.target.value;
                                setAdvancedFieldsConfig(newConfig);
                              }}
                              className="w-full px-3 py-2 border rounded-lg text-sm glass text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-600"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newConfig = advancedFieldsConfig.filter((_, i) => i !== index);
                            setAdvancedFieldsConfig(newConfig);
                          }}
                          className="p-2 ml-2 mt-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">گزینه‌های پیش‌فرض (با کاما جدا کنید)</label>
                        <input 
                          type="text" 
                          value={field.options ? field.options.join(', ') : ''}
                          onChange={e => {
                            const newConfig = [...advancedFieldsConfig];
                            newConfig[index].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            setAdvancedFieldsConfig(newConfig);
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm glass text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-600"
                          placeholder="مثلا: رسمی, نیمه رسمی, آزاد"
                        />
                        <p className="text-xs text-gray-400 mt-1">در صورت خالی بودن، فقط چک‌باکس و توضیحات نمایش داده می‌شود. گزینه «سایر» به صورت خودکار به انتهای لیست اضافه می‌شود.</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    setAdvancedFieldsConfig([
                      ...advancedFieldsConfig, 
                      { name: 'newField' + Date.now(), label: 'فیلد جدید', options: ['گزینه ۱', 'گزینه ۲'] }
                    ]);
                  }}
                  className="mt-4 flex items-center justify-center w-full py-3 border-2 border-dashed border-teal-300 dark:border-teal-700/50 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-bold text-sm"
                >
                  + افزودن فیلد جدید به فرم
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  {saveStatus === 'success' && <span className="text-sm text-green-600 font-bold">✓ تنظیمات با موفقیت ذخیره شد</span>}
                  {saveStatus === 'error' && <span className="text-sm text-red-600 font-bold">خطا در ذخیره تنظیمات</span>}
                  <button
                    onClick={updateSettings}
                    disabled={actionLoading}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 dark:bg-[#7C3AED] dark:hover:bg-[#bce000] dark:disabled:bg-[#8B5CF6]/50 text-white dark:text-white font-bold py-2 px-8 rounded-xl transition-all flex items-center gap-2"
                  >
                    {actionLoading ? 'در حال ذخیره...' : 'ذخیره تمام تنظیمات'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'events' ? (
          <div className="space-y-4" dir="rtl">
            {editingEvent ? (
              <div className="glass rounded-2xl p-6 shadow-sm border w-full relative">
                <button
                  onClick={() => setEditingEvent(null)}
                  className="absolute top-4 left-4 p-2 glass-soft text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#4C1D95] dark:text-gray-100">ویرایش رویداد: {editingEvent.title}</h3>
                <EventForm
                  isAdmin={true}
                  initialData={editingEvent}
                  onSuccess={() => {
                    setEditingEvent(null);
                    fetchData();
                  }}
                />
              </div>
            ) : (
              <div className="glass border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="glass-soft text-gray-700 dark:text-gray-300 font-medium border-b border-gray-300 dark:border-white/20">
                      <tr>
                        <th className="px-4 py-3">شناسه</th>
                        <th className="px-4 py-3">عنوان</th>
                        <th className="px-4 py-3">برگزارکننده</th>
                        <th className="px-4 py-3">وضعیت</th>
                        <th className="px-4 py-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {events.map(e => (
                        <tr key={pNum(e.id)} className="hover:bg-gray-100/50 dark:hover:bg-white/5">
                          <td className="px-4 py-3 text-gray-400 font-mono">{pNum(e.id)}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{e.title}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.organizerName || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              e.status === 'PUBLISHED' ? 'bg-teal-600/20 dark:bg-[#8B5CF6]/20 text-teal-600 dark:text-[#C4B5FD]' : 'bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                            }`}>
                              {e.status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditingEvent(e)}
                              className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 dark:bg-[#8B5CF6]/10 dark:text-[#C4B5FD] hover:bg-teal-600/20 dark:hover:bg-[#8B5CF6]/20 mx-auto" title="ویرایش"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'places' ? (
          <div className="glass border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingPlace ? (
              <div className="glass rounded-2xl p-6 w-full relative">
                <button
                  onClick={() => setEditingPlace(null)}
                  className="absolute top-4 left-4 p-2 glass-soft text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#4C1D95] dark:text-gray-100">ویرایش پاتوق: {editingPlace.name}</h3>
                <PlaceForm
                  isAdmin={true}
                  initialData={editingPlace}
                  onSuccess={() => {
                    setEditingPlace(null);
                    fetchData();
                  }}
                />
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="glass-soft text-gray-700 dark:text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">نام</th><th className="px-4 py-3">نوع</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {places.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{placeTypeLabel(p.type)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingPlace(p)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'chains' ? (
          <div className="glass border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingChain ? (
              <div className="glass rounded-2xl p-6 w-full relative">
                <button onClick={() => setEditingChain(null)} className="absolute top-4 left-4 p-2 glass-soft text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#4C1D95] dark:text-gray-100">ویرایش فستیوال: {editingChain.name}</h3>
                <ChainForm isAdmin={true} initialData={editingChain} onSuccess={() => { setEditingChain(null); fetchData(); }} />
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="glass-soft text-gray-700 dark:text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">نام</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {chains.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingChain(c)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'vibes' ? (
          <div className="glass border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingVibe ? (
              <div className="glass rounded-2xl p-6 w-full relative">
                <button onClick={() => setEditingVibe(null)} className="absolute top-4 left-4 p-2 glass-soft text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#4C1D95] dark:text-gray-100">ویرایش حال و هوا: {editingVibe.title}</h3>
                <VibeForm isAdmin={true} initialData={editingVibe} onSuccess={() => { setEditingVibe(null); fetchData(); }} />
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="glass-soft text-gray-700 dark:text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">عنوان</th><th className="px-4 py-3">محدوده</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {vibes.map(v => (
                    <tr key={v.id}>
                      <td className="px-4 py-3">{v.title}</td>
                      <td className="px-4 py-3">{v.areaName}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingVibe(v)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'flows' ? (
          <div className="glass border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingFlow ? (
              <div className="glass rounded-2xl p-6 w-full relative">
                <button onClick={() => setEditingFlow(null)} className="absolute top-4 left-4 p-2 glass-soft text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#4C1D95] dark:text-gray-100">ویرایش جریان: {editingFlow.title}</h3>
                <FlowForm isAdmin={true} initialData={editingFlow} onSuccess={() => { setEditingFlow(null); fetchData(); }} />
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="glass-soft text-gray-700 dark:text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">عنوان</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {flows.map(f => (
                    <tr key={f.id}>
                      <td className="px-4 py-3">{f.title}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingFlow(f)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
