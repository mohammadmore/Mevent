import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast, ToastContainer } from './Toast';
import { Sparkles, Map, Clock, Plus, Trash2 } from 'lucide-react';
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

export default function VibeForm({ onSuccess, initialData, isAdmin }: any) {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    title: '',
    name: '',
    description: '',
    areaName: '',
    imageUrl: ''
  });
  
  const [scheduleType, setScheduleType] = useState<'regular' | 'variable'>(
    initialData?.advancedDetails?.scheduleType || 'regular'
  );

  const [regularTimeSlots, setRegularTimeSlots] = useState<{openTime: string, closeTime: string}[]>(
    initialData?.advancedDetails?.regularTimeSlots || [{ openTime: '16:00', closeTime: '20:00' }]
  );

  const [variableSchedule, setVariableSchedule] = useState<any[]>(
    initialData?.advancedDetails?.variableSchedule || DAYS_OF_WEEK.map(d => ({
      dayOfWeek: d.value,
      isClosed: false,
      timeSlots: [{ openTime: '16:00', closeTime: '20:00' }]
    }))
  );

  const [waypoints, setWaypoints] = useState<{lat: number, lng: number}[]>(
    initialData?.advancedDetails?.waypoints || []
  );

  const [currentLoc, setCurrentLoc] = useState<{lat: number, lng: number} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return addToast('عنوان حال و هوا الزامی است', 'error');
    setLoading(true);
    try {
      const payload = {
        ...formData,
        advancedDetails: {
          scheduleType,
          regularTimeSlots,
          variableSchedule,
          waypoints
        }
      };
      setTimeout(() => {
        addToast('حال و هوا با موفقیت ثبت شد', 'success');
        setLoading(false);
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err) {
      addToast('خطا در ثبت', 'error');
      setLoading(false);
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

  const addWaypoint = () => {
    if (currentLoc) {
      setWaypoints([...waypoints, currentLoc]);
      setCurrentLoc(null);
    } else {
      addToast('لطفا یک نقطه روی نقشه انتخاب کنید', 'info');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-[#515739] dark:text-gray-100 mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-indigo-500" />
        {initialData ? 'ویرایش حال و هوا' : 'ثبت حال و هوای جدید'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">عنوان (مثلا: قدم زدن در ولیعصر)</label>
          <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">توضیحات</label>
          <textarea required rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100"></textarea>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">نام منطقه یا محله</label>
          <input type="text" value={formData.areaName} onChange={e => setFormData({ ...formData, areaName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100" />
        </div>
        
        <div className="border border-gray-200 dark:border-white/10 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <Clock className="w-5 h-5 text-indigo-500" />
              بهترین زمان‌های تجربه
            </label>
            <div className="flex items-center bg-gray-200 dark:bg-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setScheduleType('regular')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${scheduleType === 'regular' ? 'bg-white dark:bg-black/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                پیوسته
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('variable')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${scheduleType === 'variable' ? 'bg-white dark:bg-black/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                متغیر (هفتگی)
              </button>
            </div>
          </div>

          {scheduleType === 'regular' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">بازه زمانی طلایی</span>
                <button type="button" onClick={addRegularTimeSlot} className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg">
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
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        مناسب نیست
                      </label>
                    </div>
                    {!sch.isClosed && (
                      <button type="button" onClick={() => addVariableTimeSlot(dayIndex)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
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
          <label className="block text-sm text-gray-400 mb-1">آدرس تصویر کاور</label>
          <input type="url" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100 text-left" dir="ltr" />
        </div>
        
        <div className="border border-gray-200 dark:border-white/10 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
          <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2 font-bold">
            <Map className="w-4 h-4 text-indigo-500" />
            مسیر حال و هوا (آرایه مکانی دقیق - Waypoints)
          </label>
          
          <div className="space-y-2 mb-4">
            {waypoints.map((wp, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-100 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/5 text-sm">
                <span className="font-mono text-gray-600 dark:text-gray-400" dir="ltr">Lat: {wp.lat.toFixed(5)}, Lng: {wp.lng.toFixed(5)}</span>
                <button type="button" onClick={() => setWaypoints(waypoints.filter((_, idx) => idx !== i))} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 mb-2 relative">
            <LocationPicker 
              onChange={(val) => setCurrentLoc({ lat: val.lat, lng: val.lng })}
              value={currentLoc}
            />
          </div>
          <button type="button" onClick={addWaypoint} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            افزودن نقطه فعلی به مسیر
          </button>
        </div>

        <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
          {loading ? 'در حال ثبت...' : 'ثبت حال و هوا'}
        </button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
