import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { clearCachedUserData } from './pwa';
import { api, showToast } from './apiClient';

// Sign-in is a phone number plus an SMS code. The server sets an httpOnly session cookie that
// the browser sends with every request; nothing here talks to an outside identity service.

export interface AuthConfig { phone: boolean; codeLength: number; resendSeconds: number }

interface SignedInUser { provider: 'phone' }

interface AuthContextType {
  user: SignedInUser | null;
  dbUserId: number | null;
  loading: boolean;
  config: AuthConfig | null;
  requestCode: (phone: string) => Promise<{ phone: string; resendIn: number; devCode?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ created: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUserId: null,
  loading: true,
  config: null,
  requestCode: async () => { throw new Error('not ready'); },
  verifyCode: async () => { throw new Error('not ready'); },
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

const LAST_USER_KEY = 'mevent_last_user';
type LastUser = { id: number };
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cfg, me] = await Promise.all([
        api<{ data: AuthConfig }>('/api/auth/config', { silent: true }).then(d => d.data).catch(() => ({ phone: true, codeLength: 6, resendSeconds: 60 })),
        api<{ data: any; via: string | null }>('/api/auth/me', { silent: true })
          .catch((err) => ({ data: null, via: null, unreachable: err?.status === 0 })),
      ]);
      if (cancelled) return;
      setConfig(cfg);
      // No connection: carry on as the person who was signed in here last time.
      const offlineUser = (me as any).unreachable ? lastUser() : null;
      if (offlineUser) {
        setUser({ provider: 'phone' });
        setDbUserId(offlineUser.id);
      } else if (me.data) {
        setUser({ provider: 'phone' });
        setDbUserId(me.data.id);
        rememberUser({ id: me.data.id });
      } else {
        forgetUser(); // the server says nobody is signed in
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

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
    rememberUser({ id: res.data.id });
    return { created: Boolean(res.created) };
  }, []);

  const logout = useCallback(async () => {
    clearCachedUserData();
    forgetUser();
    await api('/api/auth/logout', { body: {}, silent: true }).catch(() => {});
    setUser(null);
    setDbUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUserId, loading, config, requestCode, verifyCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
