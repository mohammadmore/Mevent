import React, { useEffect, useState } from 'react';
import { subscribeToToasts } from '../lib/apiClient';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface ToastItem {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts(({ text, type }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { id, text, type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const bgColors = {
          success: 'bg-emerald-900/90 text-emerald-100 border-emerald-700/50',
          error: 'bg-rose-900/90 text-rose-100 border-rose-700/50',
          warning: 'bg-amber-900/90 text-amber-100 border-amber-700/50',
          info: 'bg-slate-800/90 text-slate-100 border-slate-700/50',
        };

        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 ${bgColors[toast.type]}`}
          >
            <div className="flex items-center gap-2.5">
              {icons[toast.type]}
              <span className="text-sm font-medium leading-relaxed">{toast.text}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
