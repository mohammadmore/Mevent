import fs from 'fs';
let content = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

content = content.replace("const [user, setUser] = useState<FirebaseUser | null>(null);", "const [user, setUser] = useState<any>({ uid: 'test', getIdToken: () => 'dummy' });");
content = content.replace("const [dbUserId, setDbUserId] = useState<number | null>(null);", "const [dbUserId, setDbUserId] = useState<number | null>(1);");
content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(false);");

fs.writeFileSync('src/lib/AuthContext.tsx', content);
