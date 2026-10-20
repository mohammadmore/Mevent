const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

if (code.includes('activeTab === \'flows\'')) {
  console.log('Already patched');
  process.exit(0);
}

// Add tabs in the nav
code = code.replace(
  `<button onClick={() => setActiveTab('metrics')} className={\`flex items-center gap-2 px-4 py-3 \${activeTab === 'metrics' ? 'border-b-2 border-teal-600 text-teal-600 dark:text-[#d9ff00] dark:border-[#d9ff00] font-bold' : 'text-gray-500 hover:text-gray-700'}\`}><Activity className="w-5 h-5"/> وضعیت سیستم</button>`,
  `<button onClick={() => setActiveTab('metrics')} className={\`flex items-center gap-2 px-4 py-3 \${activeTab === 'metrics' ? 'border-b-2 border-teal-600 text-teal-600 dark:text-[#d9ff00] dark:border-[#d9ff00] font-bold' : 'text-gray-500 hover:text-gray-700'}\`}><Activity className="w-5 h-5"/> وضعیت سیستم</button>
          <button onClick={() => setActiveTab('flows')} className={\`flex items-center gap-2 px-4 py-3 \${activeTab === 'flows' ? 'border-b-2 border-teal-600 text-teal-600 dark:text-[#d9ff00] dark:border-[#d9ff00] font-bold' : 'text-gray-500 hover:text-gray-700'}\`}><Zap className="w-5 h-5"/> جریان‌ها</button>
          <button onClick={() => setActiveTab('movies')} className={\`flex items-center gap-2 px-4 py-3 \${activeTab === 'movies' ? 'border-b-2 border-teal-600 text-teal-600 dark:text-[#d9ff00] dark:border-[#d9ff00] font-bold' : 'text-gray-500 hover:text-gray-700'}\`}><Play className="w-5 h-5"/> فیلم‌ها</button>
          <button onClick={() => setActiveTab('vibes')} className={\`flex items-center gap-2 px-4 py-3 \${activeTab === 'vibes' ? 'border-b-2 border-teal-600 text-teal-600 dark:text-[#d9ff00] dark:border-[#d9ff00] font-bold' : 'text-gray-500 hover:text-gray-700'}\`}><Activity className="w-5 h-5"/> وایب‌ها</button>`
);

// Add placeholders for the tabs contents
code = code.replace(
  `{activeTab === 'metrics' && (`,
  `{activeTab === 'flows' && (
        <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              مدیریت جریان‌ها (Flows)
            </h3>
            <button className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold shadow-md">
              ایجاد جریان جدید +
            </button>
          </div>
          <p className="text-gray-500 text-center py-10">این بخش به زودی برای مدیریت جریان‌های محتوایی در دسترس خواهد بود.</p>
        </div>
      )}
      
      {activeTab === 'movies' && (
        <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              مدیریت فیلم‌ها و سانس‌ها
            </h3>
            <button className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold shadow-md">
              افزودن فیلم جدید +
            </button>
          </div>
          <p className="text-gray-500 text-center py-10">بخش مدیریت فیلم‌ها و سانس‌های سینما در حال توسعه است.</p>
        </div>
      )}
      
      {activeTab === 'vibes' && (
        <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              مدیریت وایب‌ها (Vibes)
            </h3>
            <button className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold shadow-md">
              ایجاد وایب جدید +
            </button>
          </div>
          <p className="text-gray-500 text-center py-10">ابزار ساخت اتمسفرهای شهری (وایب) به زودی اضافه می‌شود.</p>
        </div>
      )}
      
      {activeTab === 'metrics' && (`
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
