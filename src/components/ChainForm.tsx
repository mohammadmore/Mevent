import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { useAuth } from '../lib/AuthContext';
import { useToast } from './Toast';
import { Network, Search, Check } from 'lucide-react';
import { Event } from '../types';

export default function ChainForm({ onSuccess, initialData, isAdmin }: any) {
  const { dbUserId } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
  
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    tags: [],
    status: 'PUBLISHED'
  });

  useEffect(() => {
    // Fetch all events by this organizer
    if (dbUserId) {
      api(`/api/organizer/events?userId=${dbUserId}`, { silent: true })
        .then(data => {
          if (data.data) {
            setEvents(data.data);
            // If editing, find which events belong to this chain
            if (initialData?.id) {
              const chainEvents = data.data.filter((e: any) => e.chainId === initialData.id);
              setSelectedEventIds(chainEvents.map((e: any) => e.id));
            }
          }
        })
        .catch(() => {});
    }
  }, [dbUserId, initialData]);

  const toggleEvent = (id: number) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter(eid => eid !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return addToast('نام زنجیره الزامی است', 'error');

    setLoading(true);
    try {
      const payload = {
        ...formData,
        eventIds: selectedEventIds, // Backend must handle assigning these events to the chain
      };

      const res = await fetch(initialData ? `/api/admin/chains/${initialData.id}` : '/api/chains', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('زنجیره با موفقیت ذخیره شد', 'success');
        if (onSuccess) onSuccess();
      } else {
        addToast('خطا در ذخیره زنجیره', 'error');
      }
    } catch (err) {
      addToast('خطا در ارتباط با سرور', 'error');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm text-gray-400 mb-1">نام زنجیره (فستیوال/دوره)</label>
        <input 
          type="text" 
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">توضیحات کلی</label>
        <textarea 
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white h-24"
          value={formData.description || ''}
          onChange={e => setFormData({...formData, description: e.target.value})}
        ></textarea>
      </div>
      
      <div>
        <label className="block text-sm text-gray-400 mb-2">انتخاب رویدادهای زیرمجموعه</label>
        <div className="bg-white/5 border border-white/10 rounded-xl max-h-64 overflow-y-auto p-2 space-y-2">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">رویدادی یافت نشد</p>
          ) : (
            events.map(ev => (
              <div 
                key={ev.id}
                onClick={() => toggleEvent(ev.id)}
                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${
                  selectedEventIds.includes(ev.id) 
                    ? 'border-teal-500 bg-teal-500/10' 
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                <div>
                  <h4 className="text-white text-sm font-bold">{ev.title}</h4>
                  <p className="text-xs text-gray-400">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                </div>
                {selectedEventIds.includes(ev.id) && <Check className="w-4 h-4 text-teal-400" />}
              </div>
            ))
          )}
        </div>
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
      >
        {loading ? 'در حال ذخیره...' : 'ذخیره زنجیره'}
      </button>
    </form>
  );
}
