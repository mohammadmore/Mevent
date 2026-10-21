import { motion } from 'motion/react';
import { api } from '../lib/apiClient';
import { useState, useRef, FormEvent, useEffect, useMemo } from 'react';
import { MapPin, Calendar, Clock, CreditCard, Tag, FileText, Type, Image as ImageIcon, Upload, FileSpreadsheet, Info, Ticket, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useAppData } from '../lib/appData';
import { availableIcons, defaultBackgroundIcons } from '../lib/icons';
import { MoreHorizontal, X } from 'lucide-react';
import LocationPicker from './LocationPicker';
import { useToast } from './Toast';
import readXlsxFile from 'read-excel-file/browser';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";


const defaultAdvancedFieldsConfig = [
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
];


const cinemaAdvancedFieldsConfig = [
  { name: 'director', label: 'کارگردان', options: ["دارد", "ندارد"] },
  { name: 'producer', label: 'تهیه‌کننده', options: ["دارد", "ندارد"] },
  { name: 'writer', label: 'نویسنده / فیلمنامه‌نویس', options: ["دارد", "ندارد"] },
  { name: 'mainCast', label: 'بازیگران اصلی', options: ["دارد", "ندارد"] },
  { name: 'supportingCast', label: 'بازیگران فرعی', options: ["دارد", "ندارد"] },
  { name: 'cinematographer', label: 'مدیر فیلمبرداری', options: ["دارد", "ندارد"] },
  { name: 'editor', label: 'تدوین‌گر', options: ["دارد", "ندارد"] },
  { name: 'composer', label: 'آهنگساز', options: ["دارد", "ندارد"] },
  { name: 'soundDesigner', label: 'طراح صدا / صداگذار', options: ["دارد", "ندارد"] },
  { name: 'productionDesign', label: 'طراح صحنه و لباس', options: ["دارد", "ندارد"] },
  { name: 'makeupArtist', label: 'طراح چهره‌پردازی', options: ["دارد", "ندارد"] },
  { name: 'vfx', label: 'جلوه‌های ویژه (VFX)', options: ["دارد", "ندارد"] },
  { name: 'genre', label: 'ژانر فیلم', options: ["درام", "کمدی", "اکشن", "عاشقانه", "ترسناک", "علمی-تخیلی", "مستند", "انیمیشن", "سایر"] },
  { name: 'ageRating', label: 'رده سنی', options: ["مناسب برای همه", "بالای ۱۲ سال", "بالای ۱۵ سال", "بالای ۱۸ سال"] },
  { name: 'productionYear', label: 'سال ساخت', options: ["۱۴۰۳", "۱۴۰۲", "۱۴۰۱", "۱۴۰۰", "قبل از ۱۴۰۰"] },
  { name: 'duration', label: 'مدت زمان فیلم', options: ["کمتر از ۹۰ دقیقه", "۹۰ تا ۱۲۰ دقیقه", "بیشتر از ۱۲۰ دقیقه"] },
  { name: 'originalLanguage', label: 'زبان اصلی', options: ["فارسی", "انگلیسی", "فرانسوی", "سایر"] },
  { name: 'subtitles', label: 'وضعیت زیرنویس/دوبله', options: ["زیرنویس فارسی", "دوبله فارسی", "زبان اصلی بدون زیرنویس"] },
  { name: 'nationalAwards', label: 'جوایز داخلی', options: ["سیمرغ بلورین", "جشن خانه سینما", "سایر جوایز داخلی", "بدون جایزه"] },
  { name: 'internationalAwards', label: 'جوایز بین‌المللی', options: ["جشنواره کن", "جشنواره ونیز", "جشنواره برلین", "اسکار", "سایر جوایز"] },
  { name: 'festivals', label: 'حضور در جشنواره‌ها', options: ["فجر", "کن", "ونیز", "برلین", "سایر"] },
];

export default function EventForm({ onSuccess, initialData, isAdmin = false }: { onSuccess: () => void, initialData?: any, isAdmin?: boolean }) {
  const { dbUserId } = useAuth();
  const { profile } = useAppData();
  const { addToast } = useToast();
  const [importMode, setImportMode] = useState<'single' | 'batch'>('single');
  const [isForeignCurrency, setIsForeignCurrency] = useState(initialData?.currency && initialData.currency !== 'IRT' ? true : false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<{total: number, success: number, failed: number} | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [mainBranch, setMainBranch] = useState<'event' | 'cinema'>(initialData?.tags?.includes('سینما') ? 'cinema' : 'event');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(initialData?.lat && initialData?.lng ? {lat: initialData.lat, lng: initialData.lng} : null);
  const [hubs, setHubs] = useState<any[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bgIconsConfig, setBgIconsConfig] = useState<any[]>(defaultBackgroundIcons);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [advancedFieldsConfig, setAdvancedFieldsConfig] = useState<any[]>(defaultAdvancedFieldsConfig);
  const [basicFieldsConfig, setBasicFieldsConfig] = useState<any[]>([{"name":"poster","label":"پوستر رویداد","enabled":true},{"name":"category","label":"دسته‌بندی","enabled":true},{"name":"address","label":"محل برگزاری / لینک","enabled":true},{"name":"cost","label":"هزینه ثبت‌نام","enabled":true},{"name":"capacity","label":"ظرفیت رویداد","enabled":true}]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const [newCinemaName, setNewCinemaName] = useState('');
  const [newCinemaAddress, setNewCinemaAddress] = useState('');
  const [newShowtimeDate, setNewShowtimeDate] = useState('');
  const [newShowtimeTime, setNewShowtimeTime] = useState('');
  const [newShowtimeTicketUrl, setNewShowtimeTicketUrl] = useState('');
  const [selectedCinemaIndex, setSelectedCinemaIndex] = useState(-1);

  
  useEffect(() => {
    api('/api/hubs', { silent: true }).then(data => setHubs(data.data || [])).catch(() => {});
    api('/api/organizers', { silent: true }).then(data => setOrganizers(data.data || [])).catch(() => {});
    api('/api/admin/settings', { silent: true })
      .then(data => {
        const cats = data.data?.event_categories;
        if (typeof cats === 'string') {
          setCategories(cats.split(',').map(c => c.trim()).filter(Boolean));
        } else if (Array.isArray(cats)) {
          setCategories(cats);
        } else {
          setCategories([]);
        }
        if (data.data?.event_bg_icons) {
          setBgIconsConfig(data.data.event_bg_icons);
        }
        if (data.data?.event_basic_fields) {
          setBasicFieldsConfig(data.data.event_basic_fields);
        }
        if (data.data?.event_advanced_fields) {
          setAdvancedFieldsConfig(data.data.event_advanced_fields);
        }
      })
      .catch(console.error);
  }, []);
  const [sameDay, setSameDay] = useState(
    initialData?.endTime && initialData?.startTime 
      ? new Date(initialData.endTime).toISOString().slice(0,10) === new Date(initialData.startTime).toISOString().slice(0,10)
      : true
  );
  
  const [formData, setFormData] = useState({
    hubId: initialData?.hubId || '',
    hubIds: initialData?.hubIds || [],
    galleryUrls: initialData?.galleryUrls || [],
    organizerId: initialData?.organizerId || dbUserId || '',
    coOrganizerIds: initialData?.coOrganizerIds || [],
    title: initialData?.title || '',
    city: initialData?.city || 'تهران',
    description: initialData?.description || '',
    startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : '',
    endTime: initialData?.endTime ? new Date(initialData.endTime).toISOString().slice(0, 16) : '',
    address: initialData?.address || '',
    cost: initialData?.cost || 0,
    bgIcon: initialData?.bgIcon || '',
    fuzzyTime: initialData?.fuzzyTime || '',
    website: initialData?.website || '',
    instagram: initialData?.instagram || '',
    telegram: initialData?.telegram || '',
    twitter: initialData?.twitter || '',
    currency: initialData?.currency || 'IRT',
    advancedDetails: initialData?.advancedDetails || {},
  });

  const [showAdvancedDetailsModal, setShowAdvancedDetailsModal] = useState(false);

  const initialFuzzyTimeParsed = useMemo(() => {
    try {
      if (initialData?.fuzzyTime?.startsWith('{')) {
        return JSON.parse(initialData.fuzzyTime);
      }
    } catch {}
    return null;
  }, [initialData?.fuzzyTime]);

  const [fuzzyType, setFuzzyType] = useState<'none' | 'year' | 'season' | 'month' | 'custom'>(
    initialFuzzyTimeParsed?.type || (initialData?.fuzzyTime && !initialData?.fuzzyTime?.startsWith('{') ? 'custom' : 'none')
  );
  const [fuzzyYear, setFuzzyYear] = useState<string>(initialFuzzyTimeParsed?.year?.toString() || '');
  const [fuzzyValue, setFuzzyValue] = useState<string>(initialFuzzyTimeParsed?.value?.toString() || '');

  useEffect(() => {
    if (fuzzyType === 'none') {
      setFormData(prev => ({ ...prev, fuzzyTime: '' }));
    } else if (fuzzyType === 'custom') {
      // Allow manual edits via text input
    } else {
      if (fuzzyYear) {
        let label = fuzzyYear;
        if (fuzzyType === 'season' && fuzzyValue) {
          const seasons = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
          label = `${seasons[parseInt(fuzzyValue) - 1]} ${fuzzyYear}`;
        } else if (fuzzyType === 'month' && fuzzyValue) {
          const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
          label = `${months[parseInt(fuzzyValue) - 1]} ${fuzzyYear}`;
        }
        setFormData(prev => ({ 
          ...prev, 
          fuzzyTime: JSON.stringify({ type: fuzzyType, year: parseInt(fuzzyYear), value: parseInt(fuzzyValue) || null, label }) 
        }));
      }
    }
  }, [fuzzyType, fuzzyYear, fuzzyValue]);


  
  const sortedIcons = useMemo(() => {
    const title = (formData.title || '').toLowerCase();
    const desc = (formData.description || '').toLowerCase();
    
    return [...bgIconsConfig].sort((a, b) => {
      let aScore = 0;
      let bScore = 0;
      
      a.tags.forEach(tag => {
        if (title.includes(tag)) aScore += 2;
        if (desc.includes(tag)) aScore += 1;
      });
      b.tags.forEach(tag => {
        if (title.includes(tag)) bScore += 2;
        if (desc.includes(tag)) bScore += 1;
      });
      
      return bScore - aScore;
    });
  }, [formData.title, formData.description, bgIconsConfig]);

  const displayedIcons = showAllIcons ? sortedIcons : sortedIcons.slice(0, 7);


  useEffect(() => {
    // Keep date part of endTime synced if sameDay is true and startTime changes
    if (sameDay && formData?.startTime) {
      const startDate = formData.startTime.split('T')[0];
      setFormData(prev => {
        if (!prev.endTime) return { ...prev, endTime: `${startDate}T23:59` };
        const timePart = prev.endTime.includes('T') ? prev.endTime.split('T')[1] : prev.endTime;
        return { ...prev, endTime: `${startDate}T${timePart}` };
      });
    }
  }, [formData?.startTime, sameDay]);
  


  const handleBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dbUserId || !excelFile) return;
    setLoading(true);
    setBatchResults(null);
    try {
      const rows = await readXlsxFile(excelFile);
      // Skip header row
      const dataRows = rows.slice(1);
      
      let successCount = 0;
      let failedCount = 0;

      // Header map (example): Title, Description, StartTime, Address, Cost, Lat, Lng
      for (const row of dataRows) {
        try {
          const title = row[0]?.toString();
          const description = row[1]?.toString() || '';
          let startTimeStr = row[2]?.toString();
          
          if (!title || !startTimeStr) {
            failedCount++;
            continue;
          }
          
          // try to make startTime a valid date
          let startTime = new Date(startTimeStr).toISOString();

          const address = row[3]?.toString() || 'مکان نامشخص';
          const cost = parseInt(row[4]?.toString() || '0', 10);
          const lat = parseFloat(row[5]?.toString() || '35.6892');
          const lng = parseFloat(row[6]?.toString() || '51.3890');

          const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              startTime,
              cost: isNaN(cost) ? 0 : cost,
              organizerId: dbUserId,
              location: {
                address,
                lat: isNaN(lat) ? 35.6892 : lat,
                lng: isNaN(lng) ? 51.3890 : lng,
              }
            }),
          });
          if (res.ok) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error('Error processing row', row, err);
          failedCount++;
        }
      }
      setBatchResults({ total: dataRows.length, success: successCount, failed: failedCount });
      if (successCount > 0) {
        // Optional: wait a moment then call onSuccess, or let user dismiss
      }
    } catch (err) {
      console.error(err);
      addToast('خطا در خواندن فایل اکسل. لطفا فرمت فایل را بررسی کنید.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dbUserId) return;
    setLoading(true);
    try {
      
      let imageUrl = null;
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }
      
      let newGalleryUrls = [...formData.galleryUrls];
      if (galleryFiles.length > 0) {
        for (const file of galleryFiles) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            newGalleryUrls.push(uploadData.url);
          }
        }
      }

      const res = await fetch(initialData ? `/api/events/${initialData.id}` : '/api/events', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formData.title,
          city: formData.city,
          description: formData.description,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          fuzzyTime: formData.fuzzyTime,
          website: formData.website,
          instagram: formData.instagram,
          telegram: formData.telegram,
          twitter: formData.twitter,
          currency: formData.currency,
          cost: Number(formData.cost),
          organizerId: formData.organizerId || dbUserId,
          coOrganizerIds: formData.coOrganizerIds,
          imageUrl: imageUrl || initialData?.imageUrl,
          hubIds: formData.hubIds,
          galleryUrls: newGalleryUrls,
          hubId: formData.hubIds.length > 0 ? formData.hubIds[0] : null,
          tags: selectedTags,
          bgIcon: formData.bgIcon,
          location: {
            address: formData.address,
            lat: location ? location.lat : 35.6892,
            lng: location ? location.lng : 51.3890,
          }
        }),
      });
      if (res.ok) {
        addToast(initialData ? 'رویداد با موفقیت ویرایش شد' : 'رویداد با موفقیت ایجاد شد', 'success');
        setTimeout(() => onSuccess(), 1000);
      } else {
        addToast('خطا در ثبت رویداد', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-right" dir="rtl">
      {!initialData && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">ایجاد رویداد جدید</h2>
          <div className="flex bg-gray-100 dark:bg-[#18181b]/50 p-1 rounded-full border border-gray-200 dark:border-white/5">
            <button 
              type="button"
              onClick={() => setImportMode('single')}
              className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
            >
              {importMode === 'single' && (
                 <motion.div
                    layoutId="import-mode"
                    className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                 />
              )}
              <span className={`relative z-10 ${importMode === 'single' ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>تکی</span>
            </button>
            <button 
              type="button"
              onClick={() => setImportMode('batch')}
              className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
            >
              {importMode === 'batch' && (
                 <motion.div
                    layoutId="import-mode"
                    className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                 />
              )}
              <span className={`relative z-10 ${importMode === 'batch' ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>ورود گروهی (اکسل)</span>
            </button>
          </div>
        </div>
      )}

      {importMode === 'batch' ? (
        <form onSubmit={handleBatchSubmit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start relative">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 mb-1">راهنمای فایل اکسل</h4>
              <p className="text-sm text-blue-800 mb-2 leading-relaxed">
                فایل اکسل شما باید دارای ستون‌های زیر به ترتیب از چپ به راست باشد (ردیف اول به عنوان هدر نادیده گرفته می‌شود):
              </p>
              <ul className="text-xs text-blue-700 list-disc list-inside space-y-1 mb-3">
                <li>ستون A: <strong>عنوان رویداد</strong> (الزامی)</li>
                <li>ستون B: <strong>توضیحات</strong></li>
                <li>ستون C: <strong>زمان برگزاری</strong> (فرمت: 2024-12-01T15:00) (الزامی)</li>
                <li>ستون D: <strong>آدرس مکان</strong></li>
                <li>ستون E: <strong>هزینه (تومان)</strong> (عدد)</li>
                <li>ستون F: <strong>عرض جغرافیایی (Lat)</strong> (اختیاری)</li>
                <li>ستون G: <strong>طول جغرافیایی (Lng)</strong> (اختیاری)</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">فایل اکسل خود را انتخاب کنید</label>
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors"
              onClick={() => excelInputRef.current?.click()}
            >
              {excelFile ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-green-500 mb-3" />
                  <div className="text-sm text-gray-100 font-bold mb-1">{excelFile.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{(excelFile.size / 1024).toFixed(1)} KB</div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <span className="text-sm font-bold text-gray-700 mb-1">برای انتخاب فایل اکسل کلیک کنید</span>
                  <span className="text-xs text-gray-400 leading-relaxed">فقط فایل‌های .xlsx پشتیبانی می‌شوند</span>
                </>
              )}
              <input 
                type="file" 
                className="hidden" 
                ref={excelInputRef}
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setExcelFile(e.target.files[0]);
                    setBatchResults(null);
                  }
                }}
              />
            </div>
          </div>

          {batchResults && (
            <div className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-xl p-4 text-sm">
              <h4 className="font-bold text-gray-100 mb-2">نتیجه ورود گروهی:</h4>
              <div className="flex gap-4">
                <span className="text-gray-700 dark:text-gray-300">تعداد کل: <strong>{batchResults.total}</strong></span>
                <span className="text-green-600">موفق: <strong>{batchResults.success}</strong></span>
                <span className="text-red-600">ناموفق: <strong>{batchResults.failed}</strong></span>
              </div>
              {batchResults.success > 0 && (
                <button 
                  type="button"
                  onClick={onSuccess}
                  className="mt-4 bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] px-4 py-2 rounded-lg font-medium text-sm hover:bg-teal-600/30 dark:bg-[#d9ff00]/30 transition-colors"
                >
                  بازگشت به لیست رویدادها
                </button>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="submit"
              disabled={loading || !excelFile}
              className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold py-3 px-4 rounded-xl hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-md disabled:opacity-70 flex justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-gray-900 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال پردازش فایل اکسل...
                </span>
              ) : 'شروع ورود گروهی'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
      {isAdmin && (
        <div className="bg-teal-50 dark:bg-white/5 border border-teal-200 dark:border-white/10 p-4 rounded-xl mb-6">
          <label className="block text-sm font-bold text-teal-800 dark:text-[#d9ff00] mb-3">شاخه اصلی (فقط مدیر)</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="mainBranch" 
                value="event"
                checked={mainBranch === 'event'}
                onChange={() => setMainBranch('event')}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">رویداد معمولی</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="mainBranch" 
                value="cinema"
                checked={mainBranch === 'cinema'}
                onChange={() => {
                  setMainBranch('cinema');
                  if (!selectedTags.includes('سینما')) {
                    setSelectedTags([...selectedTags, 'سینما']);
                  }
                }}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">فیلم سینمایی</span>
            </label>
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تصویر رویداد (اختیاری)</label>
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageFile ? (
            <div className="text-sm text-teal-600 dark:text-[#d9ff00] font-medium">{imageFile.name}</div>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-400 leading-relaxed">برای انتخاب تصویر کلیک کنید</span>
            </>
          )}
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef}
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImageFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      <div>
        

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شهر</label>
        <div className="relative">
          <input
            required
            type="text"
            className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            placeholder="مثلا: تهران"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <MapPin className="absolute right-3 top-2.5 w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">عنوان رویداد</label>
        <div className="relative">
          <input
            required
            type="text"
            className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            placeholder="مثلا: شب شعر یلدا"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <Type className="absolute right-3 top-2.5 w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
        <div className="relative">
          <textarea rows={3}
            className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all resize-none bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            placeholder="درباره رویداد بنویسید..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FileText className="absolute right-3 top-2.5 w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      
      {mainBranch !== 'cinema' && (<>
<div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">زمان رویداد</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
             <div className="relative">
                 <label className="block text-xs text-gray-500 mb-1">شروع (اختیاری)</label>
                 <DatePicker
                   format="YYYY/MM/DD HH:mm"
                   calendar={persian}
                   locale={persian_fa}
                   calendarPosition="bottom-right"
                   value={formData.startTime ? new Date(formData.startTime) : null}
                   disabled={fuzzyType !== 'none'}
                   plugins={[
                     <TimePicker position="bottom" />
                   ]}
                   onChange={(dateObject: any) => {
                     setFormData({ ...formData, startTime: dateObject ? dateObject.toDate().toISOString() : '' });
                   }}
                   render={(value, openCalendar) => (
                     <input
                       readOnly
                       disabled={fuzzyType !== 'none'}
                       onClick={fuzzyType === 'none' ? openCalendar : undefined}
                       value={value}
                       className={`w-full pl-3 pr-10 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-right font-sans ${fuzzyType !== 'none' ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 cursor-not-allowed' : 'border-teal-600/20 dark:border-[#d9ff00]/20 focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 cursor-pointer text-gray-900 dark:text-white'}`}
                       dir="rtl"
                       placeholder="انتخاب تاریخ و ساعت"
                     />
                   )}
                 />
                 <Clock className="absolute right-3 top-9 w-5 h-5 text-gray-600 dark:text-gray-400 pointer-events-none" />
             </div>
             
             <div className="relative">
                 <label className="block text-xs text-gray-500 mb-1">پایان (اختیاری)</label>
                 <DatePicker
                   format="YYYY/MM/DD HH:mm"
                   calendar={persian}
                   locale={persian_fa}
                   calendarPosition="bottom-right"
                   value={formData.endTime ? new Date(formData.endTime) : null}
                   disabled={fuzzyType !== 'none'}
                   plugins={[
                     <TimePicker position="bottom" />
                   ]}
                   onChange={(dateObject: any) => {
                     setFormData({ ...formData, endTime: dateObject ? dateObject.toDate().toISOString() : '' });
                   }}
                   render={(value, openCalendar) => (
                     <input
                       readOnly
                       disabled={fuzzyType !== 'none'}
                       onClick={fuzzyType === 'none' ? openCalendar : undefined}
                       value={value}
                       className={`w-full pl-3 pr-10 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-right font-sans ${fuzzyType !== 'none' ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 cursor-not-allowed' : 'border-teal-600/20 dark:border-[#d9ff00]/20 focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 cursor-pointer text-gray-900 dark:text-white'}`}
                       dir="rtl"
                       placeholder="انتخاب تاریخ و ساعت"
                     />
                   )}
                 />
                 <Clock className="absolute right-3 top-9 w-5 h-5 text-gray-600 dark:text-gray-400 pointer-events-none" />
             </div>
          </div>
          
          <div className="mb-4">
             <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
               <input 
                 type="checkbox" 
                 className="w-4 h-4 text-teal-600 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 focus:ring-teal-500"
                 checked={fuzzyType !== 'none'}
                 onChange={(e) => {
                   if (e.target.checked) {
                     setFuzzyType('year');
                     setFormData({...formData, startTime: '', endTime: ''});
                   } else {
                     setFuzzyType('none');
                   }
                 }}
               />
               تاریخ دقیق مشخص نیست (ثبت زمان تقریبی)
             </label>
          </div>
          
          {fuzzyType !== 'none' && (
             <div className="mt-4 bg-teal-50/50 dark:bg-white/5 p-4 rounded-xl border border-teal-100 dark:border-white/10">
               <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                 رویدادهایی که تاریخ حدودی دارند، اولویت پایین‌تری خواهند داشت. بلافاصله بعد از مشخص شدن تاریخ دقیق رویداد، این بخش را ویرایش کنید.
               </p>
               
               <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                 <button type="button" onClick={() => setFuzzyType('year')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${fuzzyType === 'year' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}>سال</button>
                 <button type="button" onClick={() => setFuzzyType('season')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${fuzzyType === 'season' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}>فصل</button>
                 <button type="button" onClick={() => setFuzzyType('month')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${fuzzyType === 'month' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}>ماه</button>
               </div>

               <div className="flex gap-3">
                 <input
                     type="number"
                     placeholder="سال (مثلا ۱۴۰۳)"
                     value={fuzzyYear}
                     onChange={(e) => setFuzzyYear(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   />
                 
                 {fuzzyType === 'season' && (
                   <select
                     value={fuzzyValue}
                     onChange={(e) => setFuzzyValue(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   >
                     <option value="" disabled>انتخاب فصل...</option>
                     <option value="1">بهار</option>
                     <option value="2">تابستان</option>
                     <option value="3">پاییز</option>
                     <option value="4">زمستان</option>
                   </select>
                 )}

                 {fuzzyType === 'month' && (
                   <select
                     value={fuzzyValue}
                     onChange={(e) => setFuzzyValue(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   >
                     <option value="" disabled>انتخاب ماه...</option>
                     {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'].map((m, i) => (
                       <option key={i+1} value={i+1}>{m}</option>
                     ))}
                   </select>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">آدرس</label>
        <div className="relative mb-3">
          <input
            required
            type="text"
            className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            placeholder="نام مکان یا آدرس..."
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <MapPin className="absolute right-3 top-2.5 w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">موقعیت روی نقشه</label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>
      </>)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وب‌سایت</label>
          <input
            type="url"
            dir="ltr"
            className="w-full px-3 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] outline-none transition-all text-left bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اینستاگرام</label>
          <input
            type="text"
            dir="ltr"
            className="w-full px-3 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] outline-none transition-all text-left bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            value={formData.instagram}
            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
            placeholder="@username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تلگرام</label>
          <input
            type="text"
            dir="ltr"
            className="w-full px-3 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] outline-none transition-all text-left bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            value={formData.telegram}
            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
            placeholder="@username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توییتر (X)</label>
          <input
            type="text"
            dir="ltr"
            className="w-full px-3 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] outline-none transition-all text-left bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            value={formData.twitter}
            onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
            placeholder="@username"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1 mb-4">اگر این موارد را خالی بگذارید، شبکه‌های اجتماعی برگزارکننده در صفحه رویداد نمایش داده می‌شود.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">برگزارکننده اصلی (اجباری)</label>
        <div className="relative mb-3">
          <select
            className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all appearance-none bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            value={formData.organizerId}
            onChange={(e) => setFormData({ ...formData, organizerId: Number(e.target.value) })}
          >
            <option value="">-- انتخاب برگزارکننده --</option>
            {organizers.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">همکاران برگزارکننده (اختیاری - چند مورد با نگه داشتن Ctrl)</label>
        <div className="relative mb-3">
          <select
            multiple
            className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 dark:border-[#d9ff00] transition-all"
            value={formData.coOrganizerIds.map(String)}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions, (option: any) => Number(option.value));
              setFormData({ ...formData, coOrganizerIds: options });
            }}
          >
            {organizers.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">جامعه (اختیاری - چند مورد با نگه داشتن Ctrl)</label>
        <div className="relative mb-3">
          <select
            multiple
            className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 dark:border-[#d9ff00] transition-all"
            value={formData.hubIds.map(String)}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions, (option: any) => Number(option.value));
              setFormData({ ...formData, hubIds: options });
            }}
          >
            {hubs.map(hub => (
              <option key={hub.id} value={hub.id}>{hub.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">گالری تصاویر رویداد (لینک‌ها را با کاما جدا کنید)</label>
        <div className="relative mb-3">
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all resize-none"
            placeholder="لینک تصاویر گالری را وارد کنید..."
            value={formData.galleryUrls.join(', ')}
            onChange={(e) => {
              const urls = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              setFormData({ ...formData, galleryUrls: urls });
            }}
          />
        </div>
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors"
          onClick={() => galleryInputRef.current?.click()}
        >
          {galleryFiles.length > 0 ? (
            <div className="text-sm text-teal-600 dark:text-[#d9ff00] font-medium">{galleryFiles.length} تصویر انتخاب شده</div>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-400 leading-relaxed">برای انتخاب و آپلود مستقیم تصاویر گالری کلیک کنید</span>
            </>
          )}
          <input 
            type="file" 
            className="hidden" 
            ref={galleryInputRef} 
            multiple
            onChange={(e) => {
              if (e.target.files) {
                setGalleryFiles(Array.from(e.target.files));
              }
            }}
            accept="image/*"
          />
        </div>
      </div>

      
      
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی‌ها (تایپ کنید و انتخاب کنید)</label>
        <div 
          className="relative mb-3 flex flex-wrap gap-2 p-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
          onClick={() => setShowTagDropdown(true)}
        >
          {selectedTags.map(cat => (
            <span
              key={cat}
              className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            >
              {cat}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTags(selectedTags.filter(t => t !== cat));
                }}
                className="hover:opacity-75"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            className="flex-1 bg-transparent outline-none min-w-[120px] text-sm py-1"
            placeholder={selectedTags.length === 0 ? "جستجو..." : ""}
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            onFocus={() => setShowTagDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
          />
        </div>
        {showTagDropdown && (
          <div className="absolute z-10 w-full mt-[-10px] mb-3 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-hidden">
            {categories.filter(cat => cat.includes(tagSearch) && !selectedTags.includes(cat)).length > 0 ? (
              categories.filter(cat => cat.includes(tagSearch) && !selectedTags.includes(cat)).map(cat => (
                <div
                  key={cat}
                  className="px-4 py-2 hover:bg-teal-50 dark:hover:bg-white/5 cursor-pointer text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedTags([...selectedTags, cat]);
                    setTagSearch("");
                  }}
                >
                  {cat}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">موردی یافت نشد.</div>
            )}
          </div>
        )}
      </div>
      
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">آیکون پس‌زمینه (اختیاری)</label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 relative">
          {sortedIcons.slice(0, 7).map((iconDef) => {
            const Icon = availableIcons[iconDef.icon];
            if (!Icon) return null;
            return (
              <button
                key={iconDef.icon}
                type="button"
                onClick={() => setFormData({ ...formData, bgIcon: formData.bgIcon === iconDef.icon ? 'none' : iconDef.icon })}
                className={`p-3 flex items-center justify-center rounded-xl border-2 transition-all ${
                  formData.bgIcon === iconDef.icon
                    ? 'border-teal-600 bg-teal-50 dark:border-[#d9ff00] dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00]'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-teal-300 dark:hover:border-white/20 bg-white dark:bg-[#18181b]'
                }`}
                title={iconDef.icon + ' - ' + iconDef.tags.join(', ')}
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          })}
          {sortedIcons.length > 7 && (
             <button
              type="button"
              onClick={() => setShowAllIcons(true)}
              className="p-3 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 text-gray-500 hover:border-teal-500 dark:hover:border-[#d9ff00] hover:text-teal-600 dark:hover:text-[#d9ff00] transition-all bg-white dark:bg-[#18181b]"
              title="بیشتر"
             >
               <MoreHorizontal className="w-6 h-6" />
             </button>
          )}
        </div>
        
        {showAllIcons && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAllIcons(false)}>
            <div className="bg-white dark:bg-[#1f1f23] rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#515739] dark:text-gray-100">همه آیکون‌ها</h3>
                <button onClick={() => setShowAllIcons(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {sortedIcons.map((iconDef) => {
                  const Icon = availableIcons[iconDef.icon];
                  if (!Icon) return null;
                  return (
                    <button
                      key={iconDef.icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, bgIcon: formData.bgIcon === iconDef.icon ? 'none' : iconDef.icon })}
                      className={`p-4 flex flex-col items-center gap-2 justify-center rounded-xl border-2 transition-all ${
                        formData.bgIcon === iconDef.icon
                          ? 'border-teal-600 bg-teal-50 dark:border-[#d9ff00] dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00]'
                          : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-teal-300 dark:hover:border-white/20 bg-white dark:bg-[#18181b]'
                      }`}
                      title={iconDef.icon + ' - ' + iconDef.tags.join(', ')}
                    >
                      <Icon className="w-8 h-8" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">این آیکون به صورت واترمارک محو در پس‌زمینه کارت رویداد نمایش داده می‌شود.</p>
      </div>

      {mainBranch !== 'cinema' && (<>
<div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">هزینه رویداد (۰ برای رایگان)</label>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isForeignCurrency} 
              onChange={(e) => {
                setIsForeignCurrency(e.target.checked);
                if (!e.target.checked) setFormData({ ...formData, currency: 'IRT' });
              }}
              className="rounded text-teal-600 focus:ring-teal-500" 
            />
            واحد پول خارجی
          </label>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all text-left bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
              dir="ltr"
              placeholder="0 برای رایگان"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
            />
            <CreditCard className="absolute right-3 top-2.5 w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          {isForeignCurrency && (
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-32 px-3 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] outline-none bg-white dark:bg-[#18181b] text-gray-900 dark:text-white"
            >
              <option value="USD">دلار (USD)</option>
              <option value="EUR">یورو (EUR)</option>
              <option value="AED">درهم (AED)</option>
              <option value="GBP">پوند (GBP)</option>
              <option value="TRY">لیر (TRY)</option>
            </select>
          )}
        </div>
        {Number(formData.cost) > 0 && profile && profile.role !== 'ADMIN' && (profile as any).kycStatus !== 'VERIFIED' && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">برای فروش بلیت پولی، ابتدا احراز هویت برگزارکننده را در پنل برگزارکننده کامل کنید.</p>
        )}
      </div>
      </>)}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvancedDetailsModal(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <span className="font-bold text-teal-700 dark:text-[#d9ff00]">توضیحات تخصصی رویداد (اختیاری)</span>
          <span className="text-xs bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-700 dark:text-[#d9ff00] px-2 py-1 rounded-lg">
            {Object.values(formData.advancedDetails as any || {}).filter((v: any) => v && typeof v === "object" && v.hasFeature !== undefined).length} مورد پر شده
          </span>
        </button>
      </div>

      
      {selectedTags.includes('سینما') && (
        <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-teal-200 dark:border-teal-900/50 mt-6 shadow-sm">
          <h3 className="font-bold text-teal-800 dark:text-[#d9ff00] mb-2 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            سینماها و سانس‌های اکران
          </h3>
          <p className="text-xs text-gray-500 mb-6">این فرمت ویژه فقط برای رویدادهای دسته‌بندی سینما نمایش داده می‌شود.</p>
          
          <div className="space-y-4 mb-6">
            {((formData.advancedDetails as any).cinemas || []).map((cinema: any, cIdx: number) => (
              <div key={cIdx} className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-4 rounded-xl relative">
                <button 
                  type="button"
                  onClick={() => {
                    const newCinemas = [...((formData.advancedDetails as any).cinemas || [])];
                    newCinemas.splice(cIdx, 1);
                    setFormData({...formData, advancedDetails: { ...formData.advancedDetails, cinemas: newCinemas }});
                  }}
                  className="absolute top-4 left-4 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 pr-12">{cinema.name}</h4>
                {cinema.address && <p className="text-xs text-gray-500 mb-4">{cinema.address}</p>}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {cinema.showtimes.map((st: any, sIdx: number) => (
                    <div key={sIdx} className="bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs border border-gray-200 dark:border-white/5">
                      <span className="text-gray-600 dark:text-gray-400">{st.date}</span>
                      <strong className="text-teal-700 dark:text-[#d9ff00]">{st.time}</strong>
                      <button 
                        type="button"
                        onClick={() => {
                          const newCinemas = [...((formData.advancedDetails as any).cinemas || [])];
                          newCinemas[cIdx].showtimes.splice(sIdx, 1);
                          setFormData({...formData, advancedDetails: { ...formData.advancedDetails, cinemas: newCinemas }});
                        }}
                        className="text-red-500 hover:text-red-700 mr-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 items-end border-t border-gray-100 dark:border-white/5 pt-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">تاریخ</label>
                    <input type="text" placeholder="مثلا: پنجشنبه ۲۵ مرداد" value={selectedCinemaIndex === cIdx ? newShowtimeDate : ''} onChange={(e) => { setSelectedCinemaIndex(cIdx); setNewShowtimeDate(e.target.value); }} className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-white/20 rounded-lg outline-none bg-transparent" />
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">ساعت</label>
                    <input type="text" placeholder="۱۴:۳۰" value={selectedCinemaIndex === cIdx ? newShowtimeTime : ''} onChange={(e) => { setSelectedCinemaIndex(cIdx); setNewShowtimeTime(e.target.value); }} className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-white/20 rounded-lg outline-none bg-transparent text-left" dir="ltr" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">لینک خرید</label>
                    <input type="text" placeholder="https://..." value={selectedCinemaIndex === cIdx ? newShowtimeTicketUrl : ''} onChange={(e) => { setSelectedCinemaIndex(cIdx); setNewShowtimeTicketUrl(e.target.value); }} className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-white/20 rounded-lg outline-none bg-transparent text-left" dir="ltr" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!newShowtimeDate || !newShowtimeTime) return;
                      const newCinemas = [...((formData.advancedDetails as any).cinemas || [])];
                      newCinemas[cIdx].showtimes.push({ date: newShowtimeDate, time: newShowtimeTime, ticketUrl: newShowtimeTicketUrl });
                      setFormData({...formData, advancedDetails: { ...formData.advancedDetails, cinemas: newCinemas }});
                      setNewShowtimeDate(''); setNewShowtimeTime(''); setNewShowtimeTicketUrl('');
                    }}
                    className="bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors"
                  >
                    افزودن
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-teal-200 dark:border-teal-900/50 pt-5">
            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">افزودن سینمای جدید</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">نام سینما / پردیس</label>
                <input type="text" placeholder="مثلا: پردیس سینمایی کوروش" value={newCinemaName} onChange={(e) => setNewCinemaName(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-white/20 rounded-xl outline-none bg-transparent focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">آدرس (اختیاری)</label>
                <input type="text" placeholder="بزرگراه ستاری..." value={newCinemaAddress} onChange={(e) => setNewCinemaAddress(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-white/20 rounded-xl outline-none bg-transparent focus:ring-1 focus:ring-teal-500" />
              </div>
            </div>
            <button 
              type="button"
              onClick={() => {
                if (!newCinemaName) return;
                const newCinemas = [...((formData.advancedDetails as any).cinemas || []), { name: newCinemaName, address: newCinemaAddress, showtimes: [] }];
                setFormData({...formData, advancedDetails: { ...formData.advancedDetails, cinemas: newCinemas }});
                setNewCinemaName(''); setNewCinemaAddress('');
              }}
              className="bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors w-full sm:w-auto"
            >
              افزودن سینما به لیست
            </button>
          </div>
        </div>
      )}

      <div className="pt-4 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="w-2/3 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold py-3 px-4 rounded-xl hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-md disabled:opacity-70 flex justify-center"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-gray-900 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              در حال ذخیره‌سازی...
            </span>
          ) : (initialData ? 'ثبت تغییرات' : 'ثبت رویداد')}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onSuccess}
          className="w-1/3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-colors shadow-sm disabled:opacity-70 flex justify-center"
        >
          انصراف
        </button>
      </div>

      {showAdvancedDetailsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdvancedDetailsModal(false)}>
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 shrink-0">
              <h3 className="font-bold text-lg text-[#515739] dark:text-gray-100">توضیحات تخصصی رویداد</h3>
              <button 
                type="button"
                onClick={() => setShowAdvancedDetailsModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">این اطلاعات اختیاری هستند اما به شرکت‌کنندگان کمک می‌کنند تا تصمیم بهتری برای حضور در رویداد بگیرند.</p>
              
              <div className="flex flex-col gap-6">
                {(mainBranch === 'cinema' ? cinemaAdvancedFieldsConfig : advancedFieldsConfig).map((field) => {
                  const currentValue = (formData.advancedDetails as any)[field.name] as any || {};
                  const hasFeature = currentValue.hasFeature;
                  const option = currentValue.option || '';
                  const description = currentValue.description || '';
                  
                  const handleUpdate = (updates: any) => {
                    setFormData({
                      ...formData,
                      advancedDetails: {
                        ...formData.advancedDetails,
                        [field.name]: { ...currentValue, ...updates }
                      }
                    });
                  };

                  return (
                  <div key={field.name} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <label className="text-sm font-bold text-[#515739] dark:text-gray-200">{field.label}</label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                          <input 
                            type="radio" 
                            name={`hasFeature-${field.name}`} 
                            checked={hasFeature === true} 
                            onChange={() => handleUpdate({ hasFeature: true })}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                          />
                          دارد / بلی
                        </label>
                        <label className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                          <input 
                            type="radio" 
                            name={`hasFeature-${field.name}`} 
                            checked={hasFeature === false} 
                            onChange={() => handleUpdate({ hasFeature: false })}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                          />
                          ندارد / خیر
                        </label>
                      </div>
                    </div>

                    {hasFeature === true && (
                      <div className="mt-3 pr-2 sm:pr-4 border-r-2 border-teal-600/30 dark:border-[#d9ff00]/30 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {field.options.map(opt => (
                            <label key={opt} className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${option === opt ? 'bg-teal-100 dark:bg-[#d9ff00]/20 text-teal-800 dark:text-[#d9ff00] font-bold border border-teal-200 dark:border-[#d9ff00]/30' : 'bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                              <input 
                                type="radio" 
                                name={`opt-${field.name}`} 
                                value={opt} 
                                checked={option === opt}
                                onChange={() => handleUpdate({ option: opt })}
                                className="sr-only"
                              />
                              {opt}
                            </label>
                          ))}
                          <label className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${option === 'سایر' ? 'bg-teal-100 dark:bg-[#d9ff00]/20 text-teal-800 dark:text-[#d9ff00] font-bold border border-teal-200 dark:border-[#d9ff00]/30' : 'bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            <input 
                              type="radio" 
                              name={`opt-${field.name}`} 
                              value="سایر" 
                              checked={option === 'سایر'}
                              onChange={() => handleUpdate({ option: 'سایر' })}
                              className="sr-only"
                            />
                            سایر
                          </label>
                        </div>
                        
                        {(option === 'سایر' || option !== '') && (
                          <div className="mt-3">
                            <input
                              type="text"
                              className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#d9ff00] focus:border-teal-600 dark:focus:border-[#d9ff00] outline-none transition-all bg-white dark:bg-[#18181b] text-gray-900 dark:text-white"
                              value={description}
                              onChange={(e) => handleUpdate({ description: e.target.value })}
                              placeholder={option === 'سایر' ? "لطفا جزئیات را بنویسید..." : "توضیحات تکمیلی (اختیاری)"}
                              autoFocus={option === 'سایر' && !description}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#1f1f23] shrink-0">
              <button 
                type="button"
                onClick={() => setShowAdvancedDetailsModal(false)}
                className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold py-3 rounded-xl hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-md"
              >
                تایید و بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
      )}
    </div>
  );
}
