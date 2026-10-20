import fs from 'fs';

// Helper function to replace text safely
function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  console.warn("Could not find string to replace:", search.substring(0, 50) + "...");
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// 1 & 2. Toast Types & Toast State
appContent = replaceSafely(appContent, 
  "const [toastMessage, setToastMessage] = useState('');", 
  "const [toastMessage, setToastMessage] = useState('');\n  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');\n  const [activeCategory, setActiveCategory] = useState<string>('all');\n  const [isRefreshing, setIsRefreshing] = useState(false);\n"
);

appContent = replaceSafely(appContent,
  "const showToast = (msg: string) => {",
  "const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {\n    setToastType(type);"
);

// Update Toast UI
const oldToastUI = `{toastMessage && (
          <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-sm text-center">
              {toastMessage}
            </div>
          </div>
        )}`;
const newToastUI = `{toastMessage && (
          <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className={\`px-6 py-3 rounded-full shadow-2xl font-bold text-sm text-center flex items-center gap-2 \${
              toastType === 'success' ? 'bg-green-600 text-white' : 
              toastType === 'error' ? 'bg-red-600 text-white' : 
              'bg-gray-900 text-white'
            }\`}>
              {toastType === 'success' && <CheckCircle className="w-4 h-4" />}
              {toastType === 'error' && <CheckCircle className="w-4 h-4" />}
              {toastMessage}
            </div>
          </div>
        )}`;
appContent = replaceSafely(appContent, oldToastUI, newToastUI);

// 3. Distance Calculation Helper
const helperCode = `const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const p = 0.017453292519943295;    // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  const km = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  return km < 1 ? Math.round(km * 1000) + ' متر' : km.toFixed(1) + ' کیلومتر';
};\n`;
appContent = replaceSafely(appContent, "export default function App() {", helperCode + "export default function App() {");


// 4 & 5. Filter Events with Categories and Add Category Chips
const filterLogicOld = `const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.tags && e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );`;
const filterLogicNew = `const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.tags && e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = activeCategory === 'all' || (e.tags && e.tags.includes(activeCategory));
    return matchesSearch && matchesCategory;
  });
  
  const categories = ['موسیقی', 'تکنولوژی', 'هنر', 'ورزش', 'آموزش', 'کسب و کار', 'تفریح'];
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
    showToast('رویدادها بروزرسانی شدند', 'success');
  };
`;
appContent = replaceSafely(appContent, filterLogicOld, filterLogicNew);

const discoverHeaderOld = `<div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {searchQuery ? 'نتایج جستجو' : 'پیشنهادهای ویژه شما'}
                </h2>
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('map'); }}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  <MapPin className="w-4 h-4" /> روی نقشه
                </button>
              </div>`;
const discoverHeaderNew = `<div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {searchQuery ? 'نتایج جستجو' : 'پیشنهادهای ویژه شما'}
                    <button onClick={handleRefresh} className={\`p-1.5 rounded-full hover:bg-gray-100 transition-all \${isRefreshing ? 'animate-spin text-indigo-600' : 'text-gray-400'}\`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                    </button>
                  </h2>
                  <button 
                    onClick={() => { setShowAiAssistant(false); setActiveTab('map'); }}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    <MapPin className="w-4 h-4" /> روی نقشه
                  </button>
                </div>
                
                {/* Category Chips */}
                {!searchQuery && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={\`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors \${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}\`}
                    >
                      همه
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={\`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors \${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}\`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>`;
appContent = replaceSafely(appContent, discoverHeaderOld, discoverHeaderNew);

// 6. Distance UI in Event Cards & Loading Skeletons
const eventsGridOld = `{filteredEvents.map((event, index) => (`
const eventsGridNew = `
                {loading && events.length === 0 && Array(6).fill(0).map((_, i) => (
                  <div key={'skeleton-'+i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
                    <div className="w-full h-40 bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
                {!loading && filteredEvents.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                    <Search className="w-16 h-16 text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">رویدادی یافت نشد</h3>
                    <p className="text-gray-500">با این فیلترها نتیجه‌ای پیدا نکردیم.</p>
                  </div>
                )}
                {filteredEvents.map((event, index) => (`
appContent = replaceSafely(appContent, eventsGridOld, eventsGridNew);

// Distance display
const cardLocationOld = `<div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {event.location.address}
                        </div>`;
const cardLocationNew = `<div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{event.location.address}</span>
                          </div>
                          {userLocation && event.location.lat && event.location.lng && (
                            <div className="flex items-center gap-1.5 pl-5 text-indigo-600 font-bold">
                              {calculateDistance(userLocation.lat, userLocation.lng, event.location.lat, event.location.lng)} فاصله
                            </div>
                          )}
                        </div>`;
appContent = replaceSafely(appContent, cardLocationOld, cardLocationNew);

// Search Bar UI polish
const searchBarOld = `<div className="mt-4 relative animate-in fade-in slide-in-from-top-2">
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی رویداد، دسته‌بندی یا..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-10"
                />
              </div>`;
const searchBarNew = `<div className="mt-4 relative animate-in fade-in slide-in-from-top-2">
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی رویداد، دسته‌بندی یا..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none block p-2.5 pr-10 pl-10 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>`;
appContent = replaceSafely(appContent, searchBarOld, searchBarNew);

// Navbar styling for mobile (glassmorphism)
const mobileNavOld = `<div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">`;
const mobileNavNew = `<div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">`;
appContent = replaceSafely(appContent, mobileNavOld, mobileNavNew);

// Make Ai Assistant Float better
const floatAiOld = `<button 
          onClick={() => setShowAiAssistant(true)}
          className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 z-40 group flex items-center justify-center"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-spin" />
        </button>`;
const floatAiNew = `<button 
          onClick={() => setShowAiAssistant(true)}
          className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all hover:scale-110 z-40 group flex items-center justify-center animate-bounce-slow"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-spin" />
        </button>
        <style dangerouslySetInnerHTML={{__html: \`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        \`}} />`;
appContent = replaceSafely(appContent, floatAiOld, floatAiNew);


fs.writeFileSync('src/App.tsx', appContent);

// Fix Toast alerts in EventDetail.tsx
let eventDetail = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');
eventDetail = replaceSafely(eventDetail, "alert(", "console.log("); // Temporary bypass or remove alerts in EventDetail
fs.writeFileSync('src/components/EventDetail.tsx', eventDetail);

