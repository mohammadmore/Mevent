export interface RequestOptions extends RequestInit {
  retries?: number;
  retryDelayMs?: number;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type ToastListener = (msg: { text: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
const listeners: ToastListener[] = [];

export function subscribeToToasts(listener: ToastListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function showToast(text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  listeners.forEach(l => l({ text, type }));
}

export async function fetchWithRetry<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { retries = 2, retryDelayMs = 800, ...fetchOptions } = options;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (_) {}

        const errorMessage = errorData.error || errorData.message || `خطای سرور (${response.status})`;

        if (response.status === 429) {
          showToast('تعداد درخواست‌های شما بیش از حد مجاز است. لطفا چند ثانیه صبر کنید.', 'warning');
          throw new ApiError(errorMessage, 429, errorData);
        }

        if (response.status >= 500 && attempt < retries) {
          attempt++;
          await new Promise(r => setTimeout(r, retryDelayMs * attempt));
          continue;
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      if (attempt < retries) {
        attempt++;
        await new Promise(r => setTimeout(r, retryDelayMs * attempt));
      } else {
        showToast('مشکل در برقراری ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.', 'error');
        throw new ApiError('مشکل برقراری ارتباط با سرور', 0, { originalError: err.message });
      }
    }
  }

  throw new ApiError('خطای ناشناخته در ارسال درخواست', 500);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number = 300) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

export interface ApiOptions {
  method?: string;
  /** Plain objects are sent as JSON; FormData is sent as-is. */
  body?: unknown;
  /** Do not show an error toast (the caller handles the failure). */
  silent?: boolean;
  signal?: AbortSignal;
}

/**
 * Fetch wrapper used by the UI: checks the HTTP status, parses JSON, and turns failures into
 * an ApiError with the server's (Persian) message, shown as a toast unless `silent` is set.
 */
export async function api<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const init: RequestInit = { method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'), signal: opts.signal };
  if (opts.body instanceof FormData) {
    init.body = opts.body;
  } else if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    const message = typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'شما آفلاین هستید. پس از اتصال به اینترنت دوباره تلاش کنید.'
      : 'مشکل در برقراری ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.';
    if (!opts.silent) showToast(message, 'error');
    throw new ApiError(message, 0);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || (response.status === 429
      ? 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفا چند ثانیه صبر کنید.'
      : `خطای سرور (${response.status})`);
    if (!opts.silent) showToast(message, response.status === 429 ? 'warning' : 'error');
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}
