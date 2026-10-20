import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from './firebase';
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
  const [user, setUser] = useState<any>({ uid: 'test', getIdToken: () => 'dummy' });
  const [dbUserId, setDbUserId] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = () => {};
    const mockAuth = async (firebaseUser: any) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: firebaseUser.displayName || 'بدون نام',
              email: firebaseUser.email
            })
          });
          const data = await res.json();
          setDbUserId(data.data.id);
        } catch (e) {
          console.error("Failed to sync user:", e);
        }
      } else {
        setDbUserId(null);
      }
      setLoading(false);
    };

    return unsubscribe;
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
  };

  return (
    <AuthContext.Provider value={{ user, dbUserId, loading, isLoggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
