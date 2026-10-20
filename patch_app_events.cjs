const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  useEffect(() => {
    const handleNavToEvent = (e: any) => {
      setSelectedEvent(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('navToEvent', handleNavToEvent);
    return () => window.removeEventListener('navToEvent', handleNavToEvent);
  }, []);`;

const rep = `  useEffect(() => {
    const handleNavToEvent = (e: any) => {
      setSelectedEvent(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleNavToPlace = (e: any) => {
      setSelectedPlace(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('navToEvent', handleNavToEvent);
    window.addEventListener('navToPlace', handleNavToPlace);
    return () => {
      window.removeEventListener('navToEvent', handleNavToEvent);
      window.removeEventListener('navToPlace', handleNavToPlace);
    };
  }, []);`;

code = code.replace(target, rep);
fs.writeFileSync('src/App.tsx', code);
