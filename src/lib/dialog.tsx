import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

// In-app replacements for window.alert / confirm / prompt: styled, RTL, keyboard friendly,
// and they do not block the page.

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
  /** Quick choices shown as chips (e.g. report reasons). */
  choices?: string[];
}

type Request =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOptions; resolve: (v: string | null) => void };

let enqueue: ((r: Request) => void) | null = null;

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    if (!enqueue) return resolve(window.confirm(opts.message || opts.title));
    enqueue({ kind: 'confirm', opts, resolve });
  });
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise(resolve => {
    if (!enqueue) return resolve(window.prompt(opts.message || opts.title, opts.defaultValue));
    enqueue({ kind: 'prompt', opts, resolve });
  });
}

export function DialogHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const current = queue[0];

  useEffect(() => {
    enqueue = (r) => setQueue(q => [...q, r]);
    return () => { enqueue = null; };
  }, []);

  useEffect(() => {
    if (current?.kind === 'prompt') {
      setValue(current.opts.defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [current]);

  if (!current) return null;

  const close = (result: boolean) => {
    if (current.kind === 'confirm') current.resolve(result);
    else current.resolve(result ? value.trim() : null);
    setQueue(q => q.slice(1));
  };

  const minLength = current.kind === 'prompt' ? current.opts.minLength ?? 1 : 0;
  const canSubmit = current.kind === 'confirm' || value.trim().length >= minLength;
  const { opts } = current;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => close(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') close(false); }}
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <form
        className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) close(true); }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${opts.danger ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-teal-600/10 text-teal-600 dark:bg-[#d9ff00]/10 dark:text-[#d9ff00]'}`}>
            {opts.danger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{opts.title}</h3>
            {opts.message && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{opts.message}</p>}
          </div>
          <button type="button" onClick={() => close(false)} className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>

        {current.kind === 'prompt' && (
          <div className="mb-4 space-y-3">
            {current.opts.choices && (
              <div className="flex flex-wrap gap-2">
                {current.opts.choices.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setValue(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${value === c ? 'bg-teal-600 text-white border-teal-600 dark:bg-[#d9ff00] dark:text-black dark:border-[#d9ff00]' : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {current.opts.multiline ? (
              <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={current.opts.placeholder}
                rows={4}
                className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#d9ff00]/40"
              />
            ) : (
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={current.opts.placeholder}
                className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#d9ff00]/40"
              />
            )}
            {minLength > 1 && value.trim().length < minLength && (
              <p className="text-xs text-gray-500">حداقل {minLength.toLocaleString('fa-IR')} نویسه</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${opts.danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-[#d9ff00] dark:text-black dark:hover:bg-[#c6eb00]'}`}
          >
            {opts.confirmText || 'تأیید'}
          </button>
          <button type="button" onClick={() => close(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
            {opts.cancelText || 'انصراف'}
          </button>
        </div>
      </form>
    </div>
  );
}
