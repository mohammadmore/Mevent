import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const stateOld = `const [searchQuery, setSearchQuery] = useState('');`;
const stateNew = `const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'weekend'>('all');`;
appContent = replaceSafely(appContent, stateOld, stateNew);

const filterLogicOld = `const matchesCategory = activeCategory === 'all' || (e.tags && e.tags.includes(activeCategory));
    return matchesSearch && matchesCategory;`;
const filterLogicNew = `const matchesCategory = activeCategory === 'all' || (e.tags && e.tags.includes(activeCategory));
    
    let matchesPrice = true;
    if (priceFilter === 'free') matchesPrice = e.cost === 0;
    if (priceFilter === 'paid') matchesPrice = e.cost > 0;
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      const today = new Date().setHours(0,0,0,0);
      const eventDate = new Date(e.startTime).setHours(0,0,0,0);
      matchesDate = today === eventDate;
    } else if (dateFilter === 'weekend') {
      const day = new Date(e.startTime).getDay();
      matchesDate = day === 4 || day === 5; // Thursday, Friday in Iran
    }
    
    return matchesSearch && matchesCategory && matchesPrice && matchesDate;`;
appContent = replaceSafely(appContent, filterLogicOld, filterLogicNew);

const filterUIOld = `                {/* Category Chips */}`;
const filterUINew = `                {/* Advanced Filters */}
                {searchQuery && (
                  <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                    <button onClick={() => setShowFilters(!showFilters)} className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap \${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700'}\`}>
                      <Filter className="w-3.5 h-3.5" /> فیلترهای بیشتر
                    </button>
                  </div>
                )}
                
                {showFilters && searchQuery && (
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <span className="text-xs font-bold text-gray-700 mb-2 block">هزینه</span>
                      <div className="flex gap-2">
                        {['all', 'free', 'paid'].map(t => (
                          <button 
                            key={t}
                            onClick={() => setPriceFilter(t as any)}
                            className={\`px-3 py-1.5 rounded-lg text-xs font-medium \${priceFilter === t ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}\`}
                          >
                            {t === 'all' ? 'همه' : t === 'free' ? 'رایگان' : 'پولی'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-700 mb-2 block">زمان</span>
                      <div className="flex gap-2">
                        {['all', 'today', 'weekend'].map(t => (
                          <button 
                            key={t}
                            onClick={() => setDateFilter(t as any)}
                            className={\`px-3 py-1.5 rounded-lg text-xs font-medium \${dateFilter === t ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}\`}
                          >
                            {t === 'all' ? 'همه زمان‌ها' : t === 'today' ? 'امروز' : 'آخر هفته'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Chips */}`;
appContent = replaceSafely(appContent, filterUIOld, filterUINew);


// Adding a Notifications Tab UI
const bellOld = `<Search className="w-5 h-5" />
              </button>
            </div>`;
const bellNew = `<Search className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setShowAiAssistant(false); setActiveTab('notifications'); }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100 relative ml-2"
              >
                <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
              </button>
            </div>`;
// Actually search button is next to MapPin, let's inject bell properly.
// The code is:
/*
<button onClick={() => setIsSearching(!isSearching)} className="...">
  <Search className="w-5 h-5" />
</button>
</div>
*/
const searchContainerOld = `              <button 
                onClick={() => setIsSearching(!isSearching)}
                className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors \${isSearching ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>`;
const searchContainerNew = `              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSearching(!isSearching)}
                  className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors \${isSearching ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('notifications'); }}
                  className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative \${activeTab === 'notifications' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}
                >
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                </button>
              </div>
            </div>`;
appContent = replaceSafely(appContent, searchContainerOld, searchContainerNew);


const mapTabOld = `{activeTab === 'map' && (`;
const notifTab = `          {activeTab === 'notifications' && (
            <div className="h-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl mx-auto w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                اعلانات شما
              </h2>
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm mb-1">ثبت‌نام شما قطعی شد</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed mb-2">بلیت رویداد "دورهمی طراحان UI/UX" صادر شد. می‌توانید در بخش بلیت‌های من آن را مشاهده کنید.</p>
                    <span className="text-[10px] text-indigo-400 font-medium">۲ ساعت پیش</span>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex gap-4">
                  <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">رویداد جدید در حوزه علاقه‌مندی شما</h4>
                    <p className="text-xs text-gray-600 leading-relaxed mb-2">یک رویداد جدید با تگ "هوش مصنوعی" نزدیک به موقعیت شما ثبت شده است.</p>
                    <span className="text-[10px] text-gray-400 font-medium">۱ روز پیش</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'map' && (`;
appContent = replaceSafely(appContent, mapTabOld, notifTab);

fs.writeFileSync('src/App.tsx', appContent);
