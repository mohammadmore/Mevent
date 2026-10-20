import fs from 'fs';
let content = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

const target = `export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);`;

const replacement = `export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>({ uid: 'test' });
  const [dbUserId, setDbUserId] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);`;

content = content.replace(target, replacement);

const targetEffect = `  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {`;

const replacementEffect = `  useEffect(() => {
    const unsubscribe = () => {};
    const mockAuth = async (firebaseUser: any) => {`;

content = content.replace(targetEffect, replacementEffect);
fs.writeFileSync('src/lib/AuthContext.tsx', content);
