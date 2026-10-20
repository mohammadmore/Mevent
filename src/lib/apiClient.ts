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
