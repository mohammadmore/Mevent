import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const importOld = `import { EventDetail } from './components/EventDetail';`;
const importNew = `import { EventDetail } from './components/EventDetail';
import { ToastContainer, useToast } from './components/Toast';`;
appContent = replaceSafely(appContent, importOld, importNew);

const appStartOld = `export default function App() {
  const { user, dbUserId, loading, isLoggingIn, login, logout } = useAuth();`;
const appStartNew = `export default function App() {
  const { user, dbUserId, loading, isLoggingIn, login, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);`;
appContent = replaceSafely(appContent, appStartOld, appStartNew);

const handleInteractionOld = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    const event = events.find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId) || rsvpEvents.find(e => e.id === eventId);

    if (type === 'SAVE') {
      const isSaved = savedEvents.some(e => e.id === eventId);
      if (isSaved) {
        setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      } else if (event) {
        setSavedEvents(prev => [event, ...prev]);
      }
    } else if (type === 'RSVP' || type === 'VIEW' || type === 'SHARE') {
        if (type === 'RSVP' && event) {
          const isRsvp = rsvpEvents.some(e => e.id === eventId);
          if (!isRsvp) {
             setRsvpEvents(prev => [event, ...prev]);
          }
        }
    }`;
const handleInteractionNew = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    const event = events.find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId) || rsvpEvents.find(e => e.id === eventId);

    if (type === 'SAVE') {
      const isSaved = savedEvents.some(e => e.id === eventId);
      if (isSaved) {
        setSavedEvents(prev => prev.filter(e => e.id !== eventId));
        addToast('رویداد از نشان‌شده‌ها حذف شد', 'info');
      } else if (event) {
        setSavedEvents(prev => [event, ...prev]);
        addToast('رویداد نشان شد', 'success');
      }
    } else if (type === 'RSVP' || type === 'VIEW' || type === 'SHARE') {
        if (type === 'RSVP' && event) {
          const isRsvp = rsvpEvents.some(e => e.id === eventId);
          if (!isRsvp) {
             setRsvpEvents(prev => [event, ...prev]);
             addToast('ثبت‌نام شما با موفقیت انجام شد', 'success');
          }
        }
        if (type === 'SHARE') {
          addToast('لینک رویداد کپی شد', 'success');
          navigator.clipboard.writeText(window.location.href);
        }
    }`;
appContent = replaceSafely(appContent, handleInteractionOld, handleInteractionNew);

const fetchEventsOld = `  function fetchEvents() {
    if (!dbUserId) return;
    
    let url = \`/api/events/recommendations?userId=\${dbUserId}\`;`;
const fetchEventsNew = `  function fetchEvents() {
    if (!dbUserId) return;
    
    setIsRefreshing(true);
    let url = \`/api/events/recommendations?userId=\${dbUserId}\`;`;
appContent = replaceSafely(appContent, fetchEventsOld, fetchEventsNew);

const fetchEventsEndOld = `    fetch(url)
      .then(res => res.json())
      .then(data => setEvents(data.data));
  }`;
const fetchEventsEndNew = `    fetch(url)
      .then(res => res.json())
      .then(data => {
        setEvents(data.data);
      })
      .finally(() => {
        setTimeout(() => setIsRefreshing(false), 500); // Visual delay
      });
  }`;
appContent = replaceSafely(appContent, fetchEventsEndOld, fetchEventsEndNew);

const listHeaderOld = `              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">رویدادهای پیشنهادی</h2>
              </div>`;
const listHeaderNew = `              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">رویدادهای پیشنهادی</h2>
                <button onClick={fetchEvents} className={\`p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-all \${isRefreshing ? 'animate-spin text-indigo-600' : ''}\`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21v-5h5"></path></svg>
                </button>
              </div>`;
appContent = replaceSafely(appContent, listHeaderOld, listHeaderNew);

const renderContainerOld = `        <div className="flex-1 overflow-y-auto relative bg-gray-50/30">`;
const renderContainerNew = `        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="flex-1 overflow-y-auto relative bg-gray-50/30">`;
appContent = replaceSafely(appContent, renderContainerOld, renderContainerNew);

const emptyDiscoverOld = `                {!loading && filteredEvents.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500">
                    هیچ رویدادی با این مشخصات یافت نشد
                  </div>
                )}`;
const emptyDiscoverNew = `                {!loading && !isRefreshing && filteredEvents.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">نتیجه‌ای یافت نشد</h3>
                    <p className="text-sm text-gray-500 max-w-sm mb-6">متاسفانه رویدادی با فیلترهای انتخابی شما پیدا نکردیم. لطفاً جستجو یا فیلترها را تغییر دهید.</p>
                    <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); setPriceFilter('all'); setDateFilter('all'); }} className="px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors">
                      پاک کردن فیلترها
                    </button>
                  </div>
                )}`;
appContent = replaceSafely(appContent, emptyDiscoverOld, emptyDiscoverNew);

fs.writeFileSync('src/App.tsx', appContent);
