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
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [serverCfg, me] = await Promise.all([
        api<{ data: AuthConfig }>('/api/auth/config', { silent: true }).then(d => d.data).catch(() => ({ phone: true, google: false, codeLength: 6, resendSeconds: 60 })),
        api<{ data: any; via: string | null }>('/api/auth/me', { silent: true }).catch(() => ({ data: null, via: null })),
      ]);
      if (cancelled) return;
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
        setLoading(false);
        return;
      }
      if (!cfg.google) {
        setLoading(false);
        return;
      }

      try {
        const fb = await import('./firebase');
        if (cancelled) return;
        firebase.current = fb;
        fb.getRedirectResult(fb.auth).catch((err) => console.warn('Redirect sign-in failed:', err?.code));
        unsubscribe = fb.onAuthStateChanged(fb.auth, async (firebaseUser) => {
          setLoading(true);
          if (!firebaseUser) {
            setAuthTokenGetter(null);
            setUser(null);
            setDbUserId(null);
            setLoading(false);
            return;
          }
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
      } catch (err) {
        // Google services unreachable: phone login still works.
        console.warn('Google sign-in unavailable:', err);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; unsubscribe?.(); };
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
    return { created: Boolean(res.created) };
  }, []);

  const login = useCallback(async () => {
    if (isLoggingIn) return;
    if (loginBlockedReason) {
      showToast(loginBlockedReason, 'warning');
      return;
    }
    const fb = firebase.current;
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
  }, [isLoggingIn, loginBlockedReason]);

  const logout = useCallback(async () => {
    clearCachedUserData();
    await api('/api/auth/logout', { body: {}, silent: true }).catch(() => {});
    const fb = firebase.current;
    if (fb) await fb.signOut(fb.auth).catch(() => {});
    setAuthTokenGetter(null);
    setUser(null);
    setDbUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUserId, loading, config, isLoggingIn, loginBlockedReason, requestCode, verifyCode, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
