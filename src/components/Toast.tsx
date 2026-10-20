import { showToast } from '../lib/apiClient';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * All toasts go through one global queue rendered once by <ToastContainer /> in main.tsx,
 * so messages from different screens stack instead of replacing each other.
 */
export function useToast() {
  return { addToast: (message: string, type: ToastType = 'success') => showToast(message, type) };
}
