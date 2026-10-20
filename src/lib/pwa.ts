import { api } from './apiClient';

// Service worker registration and Web Push subscription.

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));
  });
}

/** Removes cached personal API responses (called on logout). */
export function clearCachedUserData() {
  navigator.serviceWorker?.controller?.postMessage('CLEAR_USER_DATA');
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export async function getPushState(): Promise<'unsupported' | 'unavailable' | 'denied' | 'enabled' | 'disabled'> {
  if (!pushSupported()) return 'unsupported';
  const { publicKey } = await api<{ publicKey: string | null }>('/api/push/public-key', { silent: true }).catch(() => ({ publicKey: null }));
  if (!publicKey) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'enabled' : 'disabled';
}

export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  const { publicKey } = await api<{ publicKey: string | null }>('/api/push/public-key');
  if (!publicKey) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await api('/api/push/subscribe', { body: { subscription: sub.toJSON() } });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api('/api/push/unsubscribe', { body: { endpoint: sub.endpoint }, silent: true }).catch(() => {});
    await sub.unsubscribe();
  }
}
