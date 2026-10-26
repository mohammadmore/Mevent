import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { clearCachedUserData } from './pwa';
import { browserReachesGoogle } from './reachability';
import { api, showToast } from './apiClient';
import { setAuthTokenGetter } from './authFetch';

// Two ways in:
//  - phone number + SMS code (primary): the server sets an httpOnly session cookie;
//  - Google (optional, AUTH_GOOGLE_ENABLED on the server): Firebase is loaded only then,
//    so phone-only deployments (e.g. hosted in Iran) never download or contact Google.

export interface AuthConfig { phone: boolean; google: boolean; codeLength: number; resendSeconds: number }

interface SignedInUser { provider: 'phone' | 'google' }

interface AuthContextType {
  user: SignedInUser | null;
  dbUserId: number | null;
  loading: boolean;
  config: AuthConfig | null;
  isLoggingIn: boolean;
  /** Set when Google sign-in cannot work here (e.g. Instagram/Telegram in-app browsers). */
  loginBlockedReason: string | null;
  requestCode: (phone: string) => Promise<{ phone: string; resendIn: number; devCode?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ created: boolean }>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** Starts loading Google sign-in (called when the login screen opens) so the button reacts at once. */
  prepareGoogle: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUserId: null,
  loading: true,
  config: null,
  isLoggingIn: false,
  loginBlockedReason: null,
  requestCode: async () => { throw new Error('not ready'); },
  verifyCode: async () => { throw new Error('not ready'); },
  login: async () => {},
  logout: async () => {},
  prepareGoogle: () => {},
});

export const useAuth = () => useContext(AuthContext);

const INVITE_KEY = 'mevent_invite_code';

/** Remembers an invite code from /invite/:code until the visitor signs up. */
export function rememberInviteCode(code: string) {
  try { localStorage.setItem(INVITE_KEY, code.toUpperCase()); } catch {}
}

function peekInviteCode(): string | undefined {
  try { return localStorage.getItem(INVITE_KEY) || undefined; } catch { return undefined; }
}

function forgetInviteCode() {
  try { localStorage.removeItem(INVITE_KEY); } catch {}
}

// Google blocks OAuth inside embedded webviews ("disallowed_useragent").
function inAppBrowserName(): string | null {
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'اینستاگرام';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'فیسبوک';
  if (/Telegram/i.test(ua)) return 'تلگرام';
  if (/WhatsApp/i.test(ua)) return 'واتس‌اپ';
  if (/; wv\)/.test(ua) && /Android/i.test(ua)) return 'برنامه فعلی';
  return null;
}

type FirebaseModule = typeof import('./firebase');

// Who was signed in last time on this device. Used only when the server cannot be reached
// (offline, flaky mobile data), so a signed-in person is not shown as a stranger; cleared on logout.
const LAST_USER_KEY = 'mevent_last_user';
const REDIRECT_KEY = 'mevent_google_redirect';
/**
 * Whether a Google sign-in is stored on this device. Firebase keeps it in IndexedDB; the
 * database also exists (empty) once the login page was opened, so look inside it.
 */
async function mayHaveGoogleSession(): Promise<boolean> {
  try {
    if (Object.keys(localStorage).some(k => k.startsWith('firebase:authUser:'))) return true;
    const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };
    if (idb.databases && !(await idb.databases()).some(d => d.name === 'firebaseLocalStorageDb')) return false;
    return await new Promise<boolean>(resolve => {
      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onupgradeneeded = () => { req.transaction?.abort(); resolve(false); }; // did not exist
      req.onerror = () => resolve(false);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); return resolve(false); }
          const count = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').count();
          count.onsuccess = () => { db.close(); resolve(count.result > 0); };
          count.onerror = () => { db.close(); resolve(true); };
        } catch { db.close(); resolve(true); }
      };
    });
  } catch { return true; }
}
const hasPendingRedirect = () => { try { return sessionStorage.getItem(REDIRECT_KEY) === '1'; } catch { return false; } };
type LastUser = { id: number; provider: 'phone' | 'google' };
const rememberUser = (u: LastUser) => { try { localStorage.setItem(LAST_USER_KEY, JSON.stringify(u)); } catch {} };
const forgetUser = () => { try { localStorage.removeItem(LAST_USER_KEY); } catch {} };
function lastUser(): LastUser | null {
  try {
    const u = JSON.parse(localStorage.getItem(LAST_USER_KEY) || 'null');
    return u && Number.isInteger(u.id) ? u : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const firebase = useRef<FirebaseModule | null>(null);
  const inApp = inAppBrowserName();
  const loginBlockedReason = inApp
    ? `ورود با گوگل در مرورگر داخلی ${inApp} ممکن نیست. از ورود با شماره موبایل استفاده کنید یا لینک را در مرورگر باز کنید.`
    : null;

  // Creates/fetches the DB user for a Google account (the server verifies the Firebase token).
  const syncGoogleUser = useCallback(async (firebaseUser: any) => {
    const inviteCode = peekInviteCode();
    const data = await api<any>('/api/auth/sync', { body: { name: firebaseUser.displayName || 'بدون نام', inviteCode }, silent: true });
    if (inviteCode) forgetInviteCode();
    if (data.created && data.data.referredById) showToast('به میونت خوش آمدید! امتیاز هدیه دعوت به حساب شما اضافه شد.', 'success');
    setUser({ provider: 'google' });
    setDbUserId(data.data.id);
    rememberUser({ id: data.data.id, provider: 'google' });
  }, []);

  // Loads Firebase once and follows the Google sign-in state. Returns null when Google is unreachable.
  const firebaseUnsubscribe = useRef<(() => void) | null>(null);
  const firebaseLoading = useRef<Promise<FirebaseModule | null> | null>(null);
  const startFirebase = useCallback(() => {
    firebaseLoading.current ??= (async () => {
      try {
        const fb = await import('./firebase');
        firebase.current = fb;
        fb.getRedirectResult(fb.auth).catch((err) => console.warn('Redirect sign-in failed:', err?.code))
          .finally(() => { try { sessionStorage.removeItem(REDIRECT_KEY); } catch {} });
        firebaseUnsubscribe.current = fb.onAuthStateChanged(fb.auth, async (firebaseUser) => {
          if (!firebaseUser) {
            // Nobody signed in with Google; a phone session (if any) is left alone.
            if (lastUser()?.provider === 'google') forgetUser();
            setAuthTokenGetter(null);
            setUser(u => (u?.provider === 'google' ? null : u));
            setDbUserId(id => (lastUser() ? id : null));
            setLoading(false);
            return;
          }
          setLoading(true);
          setAuthTokenGetter(() => firebaseUser.getIdToken());
          try {
            await syncGoogleUser(firebaseUser);
          } catch (e) {
            console.error('Failed to sync user:', e);
            showToast('ورود به حساب کامل نشد. لطفاً دوباره تلاش کنید.', 'error');
            setAuthTokenGetter(null);
            setUser(null);
            setDbUserId(null);
            await fb.signOut(fb.auth).catch(() => {});
          } finally {
            setLoading(false);
          }
        });
        return fb;
      } catch (err) {
        // Google services unreachable: phone login still works.
        console.warn('Google sign-in unavailable:', err);
        setLoading(false);
        firebaseLoading.current = null;
        return null;
      }
    })();
    return firebaseLoading.current;
  }, [syncGoogleUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [serverCfg, me] = await Promise.all([
        api<{ data: AuthConfig }>('/api/auth/config', { silent: true }).then(d => d.data).catch(() => ({ phone: true, google: false, codeLength: 6, resendSeconds: 60 })),
        api<{ data: any; via: string | null }>('/api/auth/me', { silent: true })
          .catch((err) => ({ data: null, via: null, unreachable: err?.status === 0 })),
      ]);
      if (cancelled) return;
      // No connection: carry on as the person who was signed in here last time.
      const offlineUser = (me as any).unreachable ? lastUser() : null;
      if (offlineUser) {
        setConfig(serverCfg);
        setUser({ provider: offlineUser.provider });
        setDbUserId(offlineUser.id);
        setLoading(false);
        return;
      }
      // Google sign-in also needs Google reachable from this browser; otherwise hide it (phone login stays).
      const cfg = serverCfg.google && !(me.data && me.via === 'session') && !(await browserReachesGoogle())
        ? { ...serverCfg, google: false }
        : serverCfg;
      if (cancelled) return;
      setConfig(cfg);

      // A phone session (cookie) takes precedence; Google is only consulted without one.
      if (me.data && me.via === 'session') {
        setUser({ provider: 'phone' });
        setDbUserId(me.data.id);
        rememberUser({ id: me.data.id, provider: 'phone' });
        setLoading(false);
        return;
      }
      if (!cfg.google) {
        forgetUser(); // the server says nobody is signed in
        setLoading(false);
        return;
      }
      // Firebase is only needed to restore a Google sign-in or to sign in with Google, so a
      // visitor who has never used Google login does not download it.
      const wantsGoogle = lastUser()?.provider === 'google' || window.location.pathname === '/login' || hasPendingRedirect()
        || (!lastUser() && await mayHaveGoogleSession());
      if (!wantsGoogle) {
        forgetUser();
        setLoading(false);
        return;
      }

      await startFirebase();
    })();
    return () => { cancelled = true; firebaseUnsubscribe.current?.(); };
  }, [syncGoogleUser]);

  const requestCode = useCallback(async (phone: string) => {
    return api<any>('/api/auth/otp/request', { body: { phone } });
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    const inviteCode = peekInviteCode();
    const res = await api<any>('/api/auth/otp/verify', { body: { phone, code, inviteCode } });
    if (inviteCode) forgetInviteCode();
    if (res.created && res.data.referredById) showToast('به میونت خوش آمدید! امتیاز هدیه دعوت به حساب شما اضافه شد.', 'success');
    setUser({ provider: 'phone' });
    setDbUserId(res.data.id);
    rememberUser({ id: res.data.id, provider: 'phone' });
    return { created: Boolean(res.created) };
  }, []);

  const login = useCallback(async () => {
    if (isLoggingIn) return;
    if (loginBlockedReason) {
      showToast(loginBlockedReason, 'warning');
      return;
    }
    const fb = firebase.current || await startFirebase();
    if (!fb) {
      showToast('ورود با گوگل در حال حاضر در دسترس نیست. با شماره موبایل وارد شوید.', 'warning');
      return;
    }
    setIsLoggingIn(true);
    try {
      await fb.signInWithPopup(fb.auth, fb.googleProvider);
    } catch (error: any) {
      // Popup blocked or unsupported (some mobile browsers): fall back to a full-page redirect.
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(error?.code)) {
        try { sessionStorage.setItem(REDIRECT_KEY, '1'); } catch {}
        await fb.signInWithRedirect(fb.auth, fb.googleProvider);
        return;
      }
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.error('Login failed', error);
        showToast('ورود با گوگل انجام نشد. لطفاً دوباره تلاش کنید.', 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, [isLoggingIn, loginBlockedReason, startFirebase]);

  const prepareGoogle = useCallback(() => {
    if (config?.google && !loginBlockedReason) startFirebase();
  }, [config?.google, loginBlockedReason, startFirebase]);

  const logout = useCallback(async () => {
    clearCachedUserData();
    forgetUser();
    await api('/api/auth/logout', { body: {}, silent: true }).catch(() => {});
    const fb = firebase.current;
    if (fb) await fb.signOut(fb.auth).catch(() => {});
    setAuthTokenGetter(null);
    setUser(null);
    setDbUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUserId, loading, config, isLoggingIn, loginBlockedReason, requestCode, verifyCode, login, logout, prepareGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}
