import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast, ToastContainer } from './Toast';
import { Sparkles } from 'lucide-react';

export default function FlowForm({ onSuccess, initialData, isAdmin }: any) {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    title: '',
    name: '',
    description: '',
    tag: '',
    coverImage: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.tag) return addToast('عنوان و تگ الزامی است', 'error');
    setLoading(true);
    try {
      const res = await fetch(initialData ? `/api/admin/flows/${initialData.id}` : '/api/flows', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || formData.name,
          description: formData.description,
          tag: formData.tag,
          coverImage: formData.coverImage || formData.imageUrl,
          status: formData.status,
        }),
      });
      if (res.ok) {
        addToast('جریان با موفقیت ثبت شد', 'success');
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json().catch(() => null);
        addToast(data?.error || 'خطا در ثبت', 'error');
      }
    } catch (err) {
      addToast('خطا در ثبت', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-[#515739] dark:text-gray-100 mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-teal-600 dark:text-[#d9ff00]" />
        {initialData ? 'ویرایش جریان' : 'ایجاد جریان جدید'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">عنوان جریان (مثلا: برای گیمرها)</label>
          <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">تگ مرتبط (برای فیلتر خودکار رویدادها، مثلا: گیم)</label>
          <input required type="text" value={formData.tag} onChange={e => setFormData({ ...formData, tag: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">توضیحات</label>
          <textarea required rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100"></textarea>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">آدرس تصویر کاور</label>
          <input type="url" value={formData.coverImage} onChange={e => setFormData({ ...formData, coverImage: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/50 text-gray-800 dark:text-gray-100 text-left" dir="ltr" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-gray-900 rounded-xl font-bold hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors disabled:opacity-50">
          {loading ? 'در حال ثبت...' : 'ثبت جریان'}
        </button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
