import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: FirebaseUser | null;
  dbUserId: number | null;
  loading: boolean;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUserId: null,
  loading: true,
  isLoggingIn: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
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
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: firebaseUser.displayName || 'بدون نام' })
        });
        if (!res.ok) throw new Error(`sync failed with status ${res.status}`);
        const data = await res.json();
        setUser(firebaseUser);
        setDbUserId(data.data.id);
      } catch (e) {
        console.error("Failed to sync user:", e);
        // Without a DB user nothing works; sign out so the login screen is shown again.
        setUser(null);
        setDbUserId(null);
        await signOut(auth).catch(() => {});
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error?.code === 'auth/popup-blocked') {
        alert("پاپ‌آپ مسدود شد! لطفا پاپ‌آپ‌ها را برای این سایت مجاز کنید یا برنامه را در تب جدید باز کنید.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setDbUserId(null);
  };

  return (
    <AuthContext.Provider value={{ user, dbUserId, loading, isLoggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
