import React, { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { User } from '../types';

interface ProfileEditModalProps {
  profile: User;
  onClose: () => void;
  onSave: (updatedProfile: Partial<User>) => Promise<void>;
}

export function ProfileEditModal({ profile, onClose, onSave }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    coverImage: profile.coverImage || '',
    organizerType: profile.organizerType || 'INDIVIDUAL',
    website: profile.website || '',
    instagram: profile.instagram || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md z-10">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">ویرایش پروفایل عمومی</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">نام (برند یا شخص)</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-600 dark:focus:border-[#d9ff00] transition-colors dark:text-white"
              />
            </div>
            
            {profile.role === 'ORGANIZER' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">نوع فعالیت</label>
                <select
                  value={formData.organizerType}
                  onChange={e => setFormData({ ...formData, organizerType: e.target.value as 'INDIVIDUAL' | 'CORPORATE' })}
                  className="w-full bg-gray-50 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-600 dark:focus:border-[#d9ff00] transition-colors dark:text-white"
                >
                  <option value="INDIVIDUAL">حقیقی (شخص)</option>
                  <option value="CORPORATE">حقوقی (موسسه / گالری / سالن)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">این فیلد عمومی نیست و جهت بهینه‌سازی امکانات پنل شما استفاده می‌شود.</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">درباره شما (توضیحات)</label>
              <textarea
                value={formData.bio || ''}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="توضیحاتی در مورد فعالیت‌های شما..."
                className="w-full bg-gray-50 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-600 dark:focus:border-[#d9ff00] transition-colors resize-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">کاور پروفایل (URL)</label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={formData.coverImage}
                  onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-600 dark:focus:border-[#d9ff00] transition-colors dark:text-white"
                  dir="ltr"
                />
                <ImageIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">وب‌سایت</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-600 dark:focus:border-[#d9ff00] transition-colors dark:text-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">اینستاگرام</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-600 dark:focus:border-[#d9ff00] transition-colors dark:text-white"
                  dir="ltr"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#1f1f23] sticky bottom-0">
          <button 
            type="submit"
            form="profile-edit-form"
            disabled={loading}
            className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black py-3 rounded-xl font-bold hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors disabled:opacity-50"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
