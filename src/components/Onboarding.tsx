import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Check, Sparkles } from 'lucide-react';

const PREDEFINED_TAGS = [
  '#فرهنگی', '#تکنولوژی', '#هنری', '#ورزشی', '#موسیقی',
  '#کارگاه', '#طبیعت‌گردی', '#تجاری', '#بازی', '#کتاب'
];

export default function Onboarding({ userId, onComplete }: { userId: number, onComplete: () => void }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingPreferences, setExistingPreferences] = useState<string[]>([]);

  useEffect(() => {
    api(`/api/users/${userId}/profile`, { silent: true })
      .then(data => {
        if (data.data?.preferences && data.data.preferences.length > 0) {
          const pref = typeof data.data.preferences === 'string' ? JSON.parse(data.data.preferences) : data.data.preferences;
          setExistingPreferences(pref);
          setSelectedTags(pref);
        }
      })
      .catch(() => {});
  }, [userId]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api(`/api/users/${userId}/preferences`, { method: 'PUT', body: { preferences: selectedTags } });
      onComplete();
    } catch {
      // error toast already shown; stay on this screen so the choice is not lost
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/90 dark:bg-[#18181b] text-right" dir="rtl">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex items-center justify-center w-16 h-16 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-full mb-6 mx-auto text-teal-600 dark:text-[#d9ff00]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2 text-center">علایق خود را انتخاب کنید</h1>
        <p className="text-gray-400 mb-8 leading-relaxed text-center text-sm">
          برای اینکه موتور هوش مصنوعی Mevent بهترین رویدادها را به شما پیشنهاد دهد، چند مورد از علایق خود را انتخاب کنید.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          {PREDEFINED_TAGS.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                  isSelected 
                    ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black border-teal-600 dark:border-[#d9ff00] shadow-md shadow-teal-600/20 dark:shadow-[#d9ff00]/20' 
                    : 'bg-white/90 dark:bg-[#18181b] text-gray-700 border-gray-300 dark:border-white/20 hover:border-teal-600/50 dark:border-teal-600/5 dark:border-[#d9ff00]/50 hover:bg-teal-600/10 dark:bg-[#d9ff00]/10'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {tag}
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#18181b]">
        <button
          onClick={handleSave}
          disabled={loading || selectedTags.length === 0}
          className="w-full bg-white/90 dark:bg-[#18181b] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors shadow-lg disabled:opacity-50"
        >
          {loading ? 'در حال ذخیره...' : 'ذخیره و شروع کشف رویدادها'}
        </button>
      </div>
    </div>
  );
}
