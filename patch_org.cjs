const fs = require('fs');
let code = fs.readFileSync('src/components/OrganizerPanel.tsx', 'utf8');

// Imports
if (!code.includes('import PlaceForm')) {
  code = code.replace("import EventForm from './EventForm';", "import EventForm from './EventForm';\nimport PlaceForm from './PlaceForm';\nimport ChainForm from './ChainForm';");
}

if (!code.includes('const [createMode, setCreateMode]')) {
  code = code.replace("const [editingEvent, setEditingEvent] = useState<Event | null>(null);", 
    "const [editingEvent, setEditingEvent] = useState<Event | null>(null);\n  const [createMode, setCreateMode] = useState<'EVENT' | 'PLACE' | 'CHAIN' | null>(null);\n  const [showCreateMenu, setShowCreateMenu] = useState(false);");
}

if (!code.includes('ایجاد جدید')) {
  code = code.replace(
    `<h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">`, 
    `<div className="flex gap-2">
            <div className="relative">
              <button onClick={() => setShowCreateMenu(!showCreateMenu)} className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-teal-700 dark:hover:bg-[#c6eb00]">
                ایجاد جدید +
              </button>
              {showCreateMenu && (
                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#1f1f23] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden">
                  <div className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5" onClick={() => { setCreateMode('PLACE'); setShowCreateMenu(false); }}>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">افزودن پاتوق</h4>
                    <p className="text-xs text-gray-500 mt-1">کسب‌وکار یا مکانی با ساعات کاری مشخص دارید؟ (مثل کافه، موزه)</p>
                  </div>
                  <div className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5" onClick={() => { setCreateMode('EVENT'); setShowCreateMenu(false); }}>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">افزودن رویداد</h4>
                    <p className="text-xs text-gray-500 mt-1">برنامه خاصی با تاریخ و ساعت شروع و پایان دارید؟</p>
                  </div>
                  <div className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" onClick={() => { setCreateMode('CHAIN'); setShowCreateMenu(false); }}>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">ساخت زنجیره</h4>
                    <p className="text-xs text-gray-500 mt-1">چندین رویداد مرتبط دارید که می‌خواهید در یک قالب نمایش داده شوند؟</p>
                  </div>
                </div>
              )}
            </div>
          </div>\n          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">`
  );
}

const createFormBlock = `
      {createMode && (
        <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 w-full relative">
          <button 
            onClick={() => setCreateMode(null)}
            className="absolute top-4 left-4 p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">
            {createMode === 'PLACE' ? 'افزودن پاتوق جدید' : createMode === 'CHAIN' ? 'ساخت زنجیره جدید' : 'ایجاد رویداد جدید'}
          </h3>
          {createMode === 'EVENT' && <EventForm onSuccess={() => { setCreateMode(null); fetchEvents(); }} />}
          {createMode === 'PLACE' && <PlaceForm onSuccess={() => { setCreateMode(null); }} />}
          {createMode === 'CHAIN' && <ChainForm onSuccess={() => { setCreateMode(null); }} />}
        </div>
      )}
`;

if (!code.includes('createMode === \'PLACE\'')) {
  code = code.replace(
    `{editingEvent ? (`, 
    `${createFormBlock}\n      {editingEvent ? (`
  );
}

fs.writeFileSync('src/components/OrganizerPanel.tsx', code);
