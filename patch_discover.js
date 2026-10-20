import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const filterLogicOld = `  const filteredEvents = events.filter(e => 
    (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (e.tags && e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );`;
const filterLogicNew = `  const filteredEvents = events.filter(e => {
    const matchesSearch = (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (e.tags && e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = activeCategory === 'all' || (e.tags && e.tags.includes(activeCategory));
    return matchesSearch && matchesCategory;
  });

  const categories = ['موسیقی', 'تکنولوژی', 'هنر', 'ورزش', 'آموزش', 'کسب و کار', 'تفریح'];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
    showToast('رویدادها بروزرسانی شدند', 'success');
  };`;

content = content.replace(filterLogicOld, filterLogicNew);

const searchBarOld = `            {isSearching && (
              <div className="mt-4">
                <input 
                  type="text" 
                  placeholder="جستجوی رویداد، دسته‌بندی و..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            )}`;
const searchBarNew = `            {isSearching && (
              <div className="mt-4 relative animate-in fade-in slide-in-from-top-2">
                <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی رویداد، دسته‌بندی و..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-3 top-3 text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            )}`;

content = content.replace(searchBarOld, searchBarNew);

const mobileNavOld = `<div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">`;
const mobileNavNew = `<div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">`;
content = content.replace(mobileNavOld, mobileNavNew);

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
content = content.replace(floatAiOld, floatAiNew);


fs.writeFileSync('src/App.tsx', content);
