import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import config from "../../firebase-applet-config.json";

export const app = initializeApp(config);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Local end-to-end testing against the Firebase Auth emulator. Only active when the build sets
// VITE_FIREBASE_AUTH_EMULATOR (e.g. "http://127.0.0.1:9099"); production builds never include it.
if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR) {
  connectAuthEmulator(auth, import.meta.env.VITE_FIREBASE_AUTH_EMULATOR, { disableWarnings: true });
  (window as any).__meventTestSignIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
}

export { signInWithPopup, signOut, onAuthStateChanged };
