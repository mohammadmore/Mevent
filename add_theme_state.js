import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const { toasts, addToast, removeToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);`;

const rep = `  const { toasts, addToast, removeToast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('mevent_theme');
    return saved ? saved === 'dark' : true;
  });
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mevent_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mevent_theme', 'light');
    }
  }, [isDarkMode]);

  const [events, setEvents] = useState<Event[]>([]);`;

content = content.replace(target, rep);

// Replace bg-[#0f0f11] with light mode gradient
content = content.replace(
  `min-h-screen bg-[#0f0f11] flex justify-center font-sans text-right text-gray-900 dark:text-gray-100"`,
  `min-h-screen transition-colors duration-500 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-[#0f0f11] dark:via-[#0f0f11] dark:to-[#0f0f11] flex justify-center font-sans text-right text-gray-900 dark:text-gray-100"`
);

// We should also add a toggle button somewhere. The header is a good place.
// Let's find the header.
const headerTarget = `        <header className="flex justify-between items-center p-4 sm:p-6 pb-2 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#d9ff00] rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-[#d9ff00]/20">`;

const headerRep = `        <header className="flex justify-between items-center p-4 sm:p-6 pb-2 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#d9ff00] rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-[#d9ff00]/20">`;

content = content.replace(headerTarget, headerRep);

fs.writeFileSync('src/App.tsx', content);
