import fs from 'fs';
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Imports
content = content.replace(
    "import { Shield, Users, Calendar, Activity, DollarSign, Edit, X } from 'lucide-react';",
    "import { Shield, Users, Calendar, Activity, DollarSign, Edit, X, Settings } from 'lucide-react';"
);

// State
content = content.replace(
    "const [activeTab, setActiveTab] = useState<'users' | 'events'>('users');",
    "const [activeTab, setActiveTab] = useState<'users' | 'events' | 'settings'>('users');\n  const [settings, setSettings] = useState<any>({});\n  const [catInput, setCatInput] = useState('');"
);

// FetchData
content = content.replace(
    "fetch('/api/admin/events')",
    "fetch('/api/admin/events'),\n        fetch('/api/admin/settings')"
);
content = content.replace(
    "const [statsRes, usersRes, eventsRes] = await Promise.all",
    "const [statsRes, usersRes, eventsRes, settingsRes] = await Promise.all"
);
content = content.replace(
    "if (eventsRes.ok) {\n        const eventsData = await eventsRes.json();\n        setEvents(eventsData.data);\n      }",
    "if (eventsRes.ok) {\n        const eventsData = await eventsRes.json();\n        setEvents(eventsData.data);\n      }\n      if (settingsRes.ok) {\n        const settingsData = await settingsRes.json();\n        setSettings(settingsData.data);\n        setCatInput((settingsData.data.event_categories || []).join(', '));\n      }"
);

// changeRole & new updateSettings function
content = content.replace(
    "const changeRole = async",
    `const updateSettings = async () => {
    setLoading(true);
    try {
      const categories = catInput.split(',').map(c => c.trim()).filter(Boolean);
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'event_categories', value: categories })
      });
      alert('تنظیمات با موفقیت ذخیره شد');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async`
);

// Tabs
const newTabs = `
          <button 
            className={\`px-4 py-2 font-medium text-sm \${activeTab === 'events' ? 'text-teal-600 dark:text-[#d9ff00] border-b-2 border-teal-600 dark:border-[#d9ff00]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}\`}
            onClick={() => setActiveTab('events')}
          >
            مدیریت رویدادها
          </button>
          <button 
            className={\`px-4 py-2 font-medium text-sm \${activeTab === 'settings' ? 'text-teal-600 dark:text-[#d9ff00] border-b-2 border-teal-600 dark:border-[#d9ff00]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}\`}
            onClick={() => setActiveTab('settings')}
          >
            تنظیمات پایه
          </button>
`;

content = content.replace(
    /<button[^>]*>\s*مدیریت رویدادها\s*<\/button>/,
    newTabs
);

// Content
const settingsContent = `
        ) : activeTab === 'settings' ? (
          <div className="bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 rounded-xl p-6 shadow-sm space-y-6 text-right" dir="rtl">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                دسته بندی‌های رویدادها
              </h3>
              <p className="text-sm text-gray-500 mb-4">دسته‌بندی‌ها را با کاما (,) جدا کنید. این موارد در فرم ثبت رویداد قابل انتخاب خواهند بود.</p>
              
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={catInput}
                  onChange={(e) => setCatInput(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none bg-transparent"
                  placeholder="مثلا: ورزشی، فرهنگی، آموزشی"
                />
                <button 
                  onClick={updateSettings}
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-[#d9ff00] dark:hover:bg-[#bce000] text-white dark:text-black font-bold py-2 px-6 rounded-xl transition-all"
                >
                  ذخیره
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {catInput.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                  <span key={idx} className="bg-teal-600/10 text-teal-600 dark:bg-[#d9ff00]/10 dark:text-[#d9ff00] px-3 py-1 rounded-full text-xs font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
`;

content = content.replace(
    /\) : \(\s*<div className="space-y-4">/,
    settingsContent
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
console.log('AdminPanel updated with Settings tab.');
