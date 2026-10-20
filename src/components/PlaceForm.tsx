import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast, ToastContainer } from './Toast';
import { 
  Store, MapPin, Clock, Plus, Trash2,
  Wifi, BatteryCharging, Car, Sun, Wind, Utensils, Coffee, Dog, Users, 
  Music, VolumeX, Sofa, Gamepad2, BookOpen, Briefcase, CreditCard, Mic, Film, Baby, Camera, Check, ImageIcon
} from 'lucide-react';
import LocationPicker from './LocationPicker';

const DAYS_OF_WEEK = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنج‌شنبه' },
  { value: 5, label: 'جمعه' },
];

const FEATURE_LIST = [
  { id: 'wifi', label: 'وای‌فای', icon: Wifi },
  { id: 'outlets', label: 'پریز برق', icon: BatteryCharging },
  { id: 'parking', label: 'جای پارک', icon: Car },
  { id: 'outdoor', label: 'فضای باز', icon: Sun },
  { id: 'smoking', label: 'فضای سیگار', icon: Wind },
  { id: 'food', label: 'سرو غذا', icon: Utensils },
  { id: 'coffee', label: 'قهوه و بار گرم', icon: Coffee },
  { id: 'petFriendly', label: 'حیوانات خانگی', icon: Dog },
  { id: 'accessibility', label: 'مناسب توان‌یابان', icon: Users },
  { id: 'liveMusic', label: 'موسیقی زنده', icon: Music },
  { id: 'quietZone', label: 'فضای مطالعه/آرام', icon: VolumeX },
  { id: 'comfySeating', label: 'مبلمان راحتی', icon: Sofa },
  { id: 'boardGames', label: 'بازی رومیزی', icon: Gamepad2 },
  { id: 'books', label: 'کتابخانه', icon: BookOpen },
  { id: 'meetings', label: 'فضای جلسه', icon: Briefcase },
  { id: 'cardPayment', label: 'کارتخوان', icon: CreditCard },
  { id: 'openMic', label: 'میکروفون آزاد', icon: Mic },
  { id: 'screening', label: 'پخش فیلم', icon: Film },
  { id: 'kidsFriendly', label: 'مناسب کودکان', icon: Baby },
  { id: 'photogenic', label: 'فضای عکاسی', icon: Camera },
];

const TYPE_FEATURES: Record<string, string[]> = {
  CAFE: ['wifi', 'outlets', 'outdoor', 'smoking', 'food', 'coffee', 'petFriendly', 'liveMusic', 'quietZone', 'comfySeating', 'boardGames', 'books', 'cardPayment', 'photogenic'],
  RESTAURANT: ['parking', 'outdoor', 'smoking', 'food', 'coffee', 'liveMusic', 'kidsFriendly', 'cardPayment', 'photogenic'],
  BOOKSTORE: ['quietZone', 'books', 'coffee', 'comfySeating', 'wifi', 'cardPayment'],
  CONCEPT_STORE: ['photogenic', 'coffee', 'cardPayment', 'parking', 'wifi', 'outdoor'],
  CINEMA: ['parking', 'food', 'coffee', 'cardPayment', 'accessibility', 'kidsFriendly'],
  THEATER: ['parking', 'coffee', 'cardPayment', 'accessibility', 'food'],
  MUSEUM: ['parking', 'coffee', 'quietZone', 'accessibility', 'cardPayment', 'photogenic'],
  ESCAPE_ROOM: ['parking', 'cardPayment', 'coffee', 'accessibility'],
  BOARD_GAME_CAFE: ['boardGames', 'food', 'coffee', 'wifi', 'outlets', 'smoking', 'cardPayment'],
  COWORKING: ['wifi', 'outlets', 'quietZone', 'meetings', 'coffee', 'food', 'parking', 'outdoor', 'cardPayment'],
  PARK: ['outdoor', 'kidsFriendly', 'petFriendly', 'parking', 'photogenic', 'accessibility'],
  ART_GALLERY: ['quietZone', 'photogenic', 'coffee', 'cardPayment', 'outdoor'],
  OTHER: FEATURE_LIST.map(f => f.id),
};

const BUSINESS_TYPES = [
  { value: 'CAFE', label: 'کافه' },
  { value: 'RESTAURANT', label: 'رستوران' },
  { value: 'BOOKSTORE', label: 'کتاب‌فروشی' },
  { value: 'CONCEPT_STORE', label: 'کانسپت استور' },
  { value: 'CINEMA', label: 'سینما' },
  { value: 'THEATER', label: 'تئاتر' },
  { value: 'MUSEUM', label: 'موزه' },
  { value: 'ESCAPE_ROOM', label: 'اتاق فرار' },
  { value: 'BOARD_GAME_CAFE', label: 'کافه بازی (بردگیم)' },
  { value: 'COWORKING', label: 'فضای کار اشتراکی' },
  { value: 'PARK', label: 'پارک و فضای سبز' },
  { value: 'ART_GALLERY', label: 'گالری هنری' },
  { value: 'OTHER', label: 'سایر' },
];

export default function PlaceForm({ onSuccess, initialData, isAdmin }: any) {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    name: '',
    city: 'تهران',
    description: '',
    address: '',
    imageUrl: '',
    galleryUrls: [],
    type: 'CAFE',
    status: 'PUBLISHED',
    features: []
  });
  
  const [scheduleType, setScheduleType] = useState<'regular' | 'variable'>(
    initialData?.advancedDetails?.scheduleType || 'regular'
  );

  const [regularTimeSlots, setRegularTimeSlots] = useState<{openTime: string, closeTime: string}[]>(
    initialData?.advancedDetails?.regularTimeSlots || [{ openTime: '08:00', closeTime: '23:00' }]
  );
  
  const [regularHolidays, setRegularHolidays] = useState<number[]>(
    initialData?.advancedDetails?.regularHolidays || []
  );

  const [variableSchedule, setVariableSchedule] = useState<any[]>(
    initialData?.advancedDetails?.variableSchedule || DAYS_OF_WEEK.map(d => ({
      dayOfWeek: d.value,
      isClosed: false,
      timeSlots: [{ openTime: '08:00', closeTime: '23:00' }]
    }))
  );

  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [location, setLocation] = useState(initialData?.location || null);

  const availableFeatures = TYPE_FEATURES[formData.type] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return addToast('نام پاتوق الزامی است', 'error');

    setLoading(true);
    try {
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

      const payload = {
        ...formData,
        city: formData.city,
        galleryUrls: newGalleryUrls,
        address: formData.address || location?.address,
        lat: location?.lat,
        lng: location?.lng,
        advancedDetails: {
          scheduleType,
          regularTimeSlots,
          regularHolidays,
          variableSchedule,
          features: formData.features
        }
      };

      const url = isAdmin && initialData ? `/api/admin/places/${initialData.id}` : '/api/places';
      const res = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('پاتوق با موفقیت ذخیره شد', 'success');
        if (onSuccess) onSuccess();
      } else {
        addToast('خطا در ذخیره پاتوق', 'error');
      }
    } catch (err) {
      addToast('خطا در ارتباط با سرور', 'error');
    }
    setLoading(false);
  };

  const toggleHoliday = (dayVal: number) => {
    if (regularHolidays.includes(dayVal)) {
      setRegularHolidays(regularHolidays.filter(d => d !== dayVal));
    } else {
      setRegularHolidays([...regularHolidays, dayVal]);
    }
  };

  const addRegularTimeSlot = () => {
    setRegularTimeSlots([...regularTimeSlots, { openTime: '16:00', closeTime: '23:00' }]);
  };

  const removeRegularTimeSlot = (index: number) => {
    setRegularTimeSlots(regularTimeSlots.filter((_, i) => i !== index));
  };

  const updateRegularTimeSlot = (index: number, key: string, value: string) => {
    const newSlots = [...regularTimeSlots];
    newSlots[index] = { ...newSlots[index], [key]: value };
    setRegularTimeSlots(newSlots);
  };

  const addVariableTimeSlot = (dayIndex: number) => {
    const newSchedule = [...variableSchedule];
    newSchedule[dayIndex].timeSlots.push({ openTime: '16:00', closeTime: '23:00' });
    setVariableSchedule(newSchedule);
  };

  const removeVariableTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...variableSchedule];
    newSchedule[dayIndex].timeSlots.splice(slotIndex, 1);
    setVariableSchedule(newSchedule);
  };

  const updateVariableTimeSlot = (dayIndex: number, slotIndex: number, key: string, value: string) => {
    const newSchedule = [...variableSchedule];
    newSchedule[dayIndex].timeSlots[slotIndex] = { ...newSchedule[dayIndex].timeSlots[slotIndex], [key]: value };
    setVariableSchedule(newSchedule);
  };

  const updateVariableDay = (dayIndex: number, key: string, value: any) => {
    const newSchedule = [...variableSchedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [key]: value };
    setVariableSchedule(newSchedule);
  };

  const toggleFeature = (featureId: string) => {
    const current = formData.features || [];
    if (current.includes(featureId)) {
      setFormData({ ...formData, features: current.filter((id: string) => id !== featureId) });
    } else {
      setFormData({ ...formData, features: [...current, featureId] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          
        <div>
          <label className="block text-sm text-gray-400 mb-1">شهر</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.city || 'تهران'} 
            onChange={e => setFormData({...formData, city: e.target.value})} 
            required
          />
        </div>

        <label className="block text-sm text-gray-400 mb-1">نام پاتوق</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.name || ''} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">آدرس متنی</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.address || ''} 
            onChange={e => setFormData({...formData, address: e.target.value})} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">لینک تصویر (کاور)</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.imageUrl || ''} 
            onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">نوع کسب‌وکار</label>
          <select 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            value={formData.type || ''} 
            onChange={e => setFormData({...formData, type: e.target.value})}
          >
            {BUSINESS_TYPES.map(bt => (
              <option key={bt.value} value={bt.value} className="text-gray-900 bg-white dark:bg-gray-800 dark:text-white">{bt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">گالری تصاویر</label>
        <div className="space-y-4">
          <textarea
            rows={3}
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white resize-none"
            placeholder="لینک تصاویر گالری را با کاما جدا کنید..."
            value={formData.galleryUrls.join(', ')}
            onChange={(e) => {
              const urls = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              setFormData({ ...formData, galleryUrls: urls });
            }}
          />
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
              accept="image/*" 
              onChange={(e) => {
                if (e.target.files) {
                  setGalleryFiles(Array.from(e.target.files));
                }
              }} 
            />
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm text-gray-400 mb-1">پاتوق شما واسه چه حال و هوایی مناسبه؟</label>
        <textarea 
          className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white h-24"
          value={formData.description || ''}
          onChange={e => setFormData({...formData, description: e.target.value})}
        ></textarea>
      </div>

      <div className="border border-gray-200 dark:border-white/10 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
        <label className="block text-sm text-gray-400 mb-4 flex items-center gap-2 font-bold">
          <Store className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
          امکانات و ویژگی‌ها
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {FEATURE_LIST.filter(f => availableFeatures.includes(f.id)).map(feature => {
            const Icon = feature.icon;
            const isSelected = (formData.features || []).includes(feature.id);
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => toggleFeature(feature.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-teal-600/10 border-teal-600/50 text-teal-600 dark:bg-[#d9ff00]/10 dark:border-[#d9ff00]/50 dark:text-[#d9ff00]' 
                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                }`}
              >
                <div className="relative mb-2">
                  <Icon className="w-6 h-6" />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-center font-medium leading-tight">{feature.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-gray-200 dark:border-white/10 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <Clock className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
            ساعات کاری
          </label>
          <div className="flex items-center bg-gray-200 dark:bg-white/10 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setScheduleType('regular')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${scheduleType === 'regular' ? 'bg-white dark:bg-black/40 text-teal-600 dark:text-[#d9ff00] font-bold shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              پیوسته
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('variable')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${scheduleType === 'variable' ? 'bg-white dark:bg-black/40 text-teal-600 dark:text-[#d9ff00] font-bold shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              متغیر (هفتگی)
            </button>
          </div>
        </div>

        {scheduleType === 'regular' ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">بازه زمانی فعالیت</span>
                <button type="button" onClick={addRegularTimeSlot} className="flex items-center gap-1 text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-[#d9ff00] px-2 py-1 rounded-lg">
                  <Plus className="w-3 h-3" />
                  افزودن بازه جدید
                </button>
              </div>
              <div className="space-y-3">
                {regularTimeSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="time" 
                        value={slot.openTime} 
                        onChange={(e) => updateRegularTimeSlot(i, 'openTime', e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white text-sm"
                      />
                      <span className="text-gray-500">تا</span>
                      <input 
                        type="time" 
                        value={slot.closeTime} 
                        onChange={(e) => updateRegularTimeSlot(i, 'closeTime', e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    {regularTimeSlots.length > 1 && (
                      <button type="button" onClick={() => removeRegularTimeSlot(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">روزهای تعطیل</span>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleHoliday(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${regularHolidays.includes(d.value) ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-400' : 'bg-white border-gray-200 text-gray-700 dark:bg-black/20 dark:border-white/10 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {variableSchedule.map((sch, dayIndex) => (
              <div key={sch.dayOfWeek} className="flex flex-col p-4 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span className="w-20 font-bold text-gray-900 dark:text-gray-100">
                      {DAYS_OF_WEEK.find(d => d.value === sch.dayOfWeek)?.label}
                    </span>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={sch.isClosed} 
                        onChange={(e) => updateVariableDay(dayIndex, 'isClosed', e.target.checked)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      تعطیل
                    </label>
                  </div>
                  {!sch.isClosed && (
                    <button type="button" onClick={() => addVariableTimeSlot(dayIndex)} className="text-xs text-teal-600 dark:text-[#d9ff00] hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      افزودن بازه
                    </button>
                  )}
                </div>
                
                {!sch.isClosed && (
                  <div className="space-y-2">
                    {sch.timeSlots.map((slot: any, slotIndex: number) => (
                      <div key={slotIndex} className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={slot.openTime} 
                          onChange={(e) => updateVariableTimeSlot(dayIndex, slotIndex, 'openTime', e.target.value)}
                          className="flex-1 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white text-sm"
                        />
                        <span className="text-gray-500 text-sm">تا</span>
                        <input 
                          type="time" 
                          value={slot.closeTime} 
                          onChange={(e) => updateVariableTimeSlot(dayIndex, slotIndex, 'closeTime', e.target.value)}
                          className="flex-1 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white text-sm"
                        />
                        {sch.timeSlots.length > 1 && (
                          <button type="button" onClick={() => removeVariableTimeSlot(dayIndex, slotIndex)} className="text-red-500 p-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2 font-bold">
          <MapPin className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
          موقعیت مکانی دقیق روی نقشه
        </label>
        <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
          <LocationPicker 
            onChange={(val) => setLocation({ lat: val.lat, lng: val.lng, address: '' })}
            value={location}
          />
        </div>
        {location && (
          <div className="mt-2 text-xs text-gray-500 font-mono text-left" dir="ltr">
            [Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}]
          </div>
        )}
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white dark:bg-[#d9ff00] dark:text-gray-900 dark:hover:bg-[#c6eb00] py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
      >
        {loading ? 'در حال ذخیره...' : 'ذخیره پاتوق'}
      </button>
    </form>
  );
}
