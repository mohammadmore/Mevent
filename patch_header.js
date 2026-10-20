import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldHeader = `        {/* Header */}
        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && (
          <div className="pt-10 md:pt-6 pb-4 px-6 bg-[#18181b] border-b border-white/10 flex flex-col justify-center z-10 sticky top-0 transition-all duration-300">
            <div className="flex justify-between items-center w-full">
              <div>
                <h1 className="text-2xl font-bold text-gray-100 md:hidden">Mevent</h1>
                <button 
                  onClick={requestLocation}
                  disabled={isLocating}
                  className="text-sm text-gray-400 font-medium mt-1 flex items-center gap-1 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  <MapPin className="w-3 h-3" /> 
                  {isLocating ? 'در حال یافتن...' : userLocation ? 'موقعیت شما (نزدیک‌ترین‌ها)' : 'ایران، تهران (یافتن من)'}
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSearching(!isSearching)}
                  className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors \${isSearching ? 'bg-indigo-100 text-indigo-600' : 'bg-[#1f1f23] text-gray-300 hover:bg-gray-100'}\`}
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('notifications'); }}
                  className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative \${activeTab === 'notifications' ? 'bg-indigo-100 text-indigo-600' : 'bg-[#1f1f23] text-gray-300 hover:bg-gray-100'}\`}
                >
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                </button>
              </div>
            </div>
            {isSearching && (
              <div className="mt-4 relative animate-in fade-in slide-in-from-top-2">
                <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی رویداد، دسته‌بندی و..." 
                  className="w-full bg-[#1f1f23] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
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
            )}
          </div>
        )}`;

const newHeader = `        {/* Header */}
        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && (
          <div className="pt-12 md:pt-16 pb-8 px-6 bg-transparent flex flex-col items-center justify-center z-10 transition-all duration-300 relative">
            
            {/* Top actions */}
            <div className="absolute top-6 w-full px-6 flex justify-between items-start pointer-events-none">
              <div className="pointer-events-auto">
                <button 
                  onClick={requestLocation}
                  disabled={isLocating}
                  className="text-xs text-gray-400 font-medium flex items-center gap-1 hover:text-white transition-colors disabled:opacity-50"
                >
                  <MapPin className="w-3 h-3" /> 
                  {isLocating ? 'در حال یافتن...' : userLocation ? 'موقعیت شما' : 'یافتن من'}
                </button>
              </div>
              <div className="flex gap-3 pointer-events-auto">
                <button 
                  onClick={() => setIsSearching(!isSearching)}
                  className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors border \${isSearching ? 'bg-[#d9ff00] text-black border-transparent' : 'bg-[#18181b] text-gray-300 border-white/10 hover:bg-white/5'}\`}
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('notifications'); }}
                  className={\`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative border \${activeTab === 'notifications' ? 'bg-[#d9ff00] text-black border-transparent' : 'bg-[#18181b] text-gray-300 border-white/10 hover:bg-white/5'}\`}
                >
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                </button>
              </div>
            </div>

            {/* Huge Centered Title */}
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mt-6">
              {activeTab === 'discover' && 'کشف'}
              {activeTab === 'hubs' && 'جوامع'}
              {activeTab === 'saved' && 'ذخیره'}
              {activeTab === 'profile' && 'پروفایل'}
              {activeTab === 'create' && 'ایجاد'}
              {activeTab === 'organizer' && 'برگزارکننده'}
              {activeTab === 'admin' && 'ادمین'}
              {activeTab === 'notifications' && 'اعلان‌ها'}
            </h1>
            <p className="text-gray-400 mt-3 text-sm md:text-base">
              {activeTab === 'discover' && 'بهترین رویدادهای اطراف شما'}
              {activeTab === 'hubs' && 'افراد هم‌فکر خود را پیدا کنید'}
              {activeTab === 'saved' && 'رویدادهایی که دوست داشتید'}
              {activeTab === 'profile' && 'تنظیمات و اطلاعات کاربری'}
              {activeTab === 'create' && 'ثبت یک رویداد جدید'}
              {activeTab === 'organizer' && 'مدیریت رویدادها و بلیت‌ها'}
              {activeTab === 'admin' && 'مدیریت کل سیستم'}
              {activeTab === 'notifications' && 'آخرین خبرها و تغییرات'}
            </p>

            {isSearching && (
              <div className="mt-8 relative w-full max-w-md animate-in fade-in zoom-in-95">
                <Search className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی رویداد، دسته‌بندی و..." 
                  className="w-full bg-[#18181b] border border-white/20 rounded-2xl pr-12 pl-4 py-3 outline-none focus:border-[#d9ff00] transition-all text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-4 top-3.5 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        )}`;

content = content.replace(oldHeader, newHeader);

// Let's remove the white background from main content area to let the app background shine through
content = content.replace(
  '<div className="flex-1 flex flex-col h-full overflow-hidden relative pb-[72px] md:pb-0">',
  '<div className="flex-1 flex flex-col h-full overflow-hidden relative pb-[120px]">'
);

fs.writeFileSync('src/App.tsx', content);
