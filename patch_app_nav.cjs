const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `export default function App() {`;

const rep = `export default function App() {

  useEffect(() => {
    const handleNavToEvent = (e: any) => {
      setSelectedEvent(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('navToEvent', handleNavToEvent);
    return () => window.removeEventListener('navToEvent', handleNavToEvent);
  }, []);`;

code = code.replace(target, rep);
fs.writeFileSync('src/App.tsx', code);
