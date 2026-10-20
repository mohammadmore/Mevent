import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import { signInWithRedirect, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { clearCachedUserData } from './pwa';
import { showToast } from './apiClient';

interface AuthContextType {
  user: FirebaseUser | null;
  dbUserId: number | null;
  loading: boolean;
  isLoggingIn: boolean;
  /** Set when sign-in cannot work here (e.g. Instagram/Telegram in-app browsers). */
  loginBlockedReason: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUserId: null,
  loading: true,
  isLoggingIn: false,
  loginBlockedReason: null,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const INVITE_KEY = 'mevent_invite_code';

/** Remembers an invite code from /invite/:code until the visitor signs up. */
export function rememberInviteCode(code: string) {
  try { localStorage.setItem(INVITE_KEY, code.toUpperCase()); } catch {}
}

function takeInviteCode(): string | undefined {
  try { return localStorage.getItem(INVITE_KEY) || undefined; } catch { return undefined; }
}

// Google blocks OAuth inside embedded webviews ("disallowed_useragent").
function inAppBrowserName(): string | null {
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'اینستاگرام';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'فیسبوک';
  if (/Telegram/i.test(ua)) return 'تلگرام';
  if (/WhatsApp/i.test(ua)) return 'واتس‌اپ';
  if (/Line\//i.test(ua)) return 'لاین';
  if (/; wv\)/.test(ua) && /Android/i.test(ua)) return 'برنامه فعلی';
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const inApp = inAppBrowserName();
  const loginBlockedReason = inApp
    ? `ورود با گوگل در مرورگر داخلی ${inApp} ممکن نیست. لطفاً از منوی «⋮» گزینه «باز کردن در مرورگر» (Chrome یا Safari) را بزنید.`
    : null;

  useEffect(() => {
    // Completes a redirect-based sign-in (fallback when popups are blocked).
    getRedirectResult(auth).catch((err) => console.warn('Redirect sign-in failed:', err?.code));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (!firebaseUser) {
        setUser(null);
        setDbUserId(null);
        setLoading(false);
        return;
      }
      try {
        // Creates the DB user on first sign-in; identity is taken from the token on the server.
        const token = await firebaseUser.getIdToken();
        const inviteCode = takeInviteCode();
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: firebaseUser.displayName || 'بدون نام', inviteCode })
        });
        if (!res.ok) throw new Error(`sync failed with status ${res.status}`);
        const data = await res.json();
        if (inviteCode) {
          try { localStorage.removeItem(INVITE_KEY); } catch {}
          if (data.created && data.data.referredById) showToast('به میونت خوش آمدید! امتیاز هدیه دعوت به حساب شما اضافه شد.', 'success');
        }
        setUser(firebaseUser);
        setDbUserId(data.data.id);
      } catch (e) {
        console.error("Failed to sync user:", e);
        showToast('ورود به حساب کامل نشد. لطفاً دوباره تلاش کنید.', 'error');
        setUser(null);
        setDbUserId(null);
        await signOut(auth).catch(() => {});
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    if (isLoggingIn) return;
    if (loginBlockedReason) {
      showToast(loginBlockedReason, 'warning');
      return;
    }
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Popup blocked or unsupported (some mobile browsers): fall back to a full-page redirect.
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(error?.code)) {
        await signInWithRedirect(auth, googleProvider);
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
    await signOut(auth);
    setUser(null);
    setDbUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUserId, loading, isLoggingIn, loginBlockedReason, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
