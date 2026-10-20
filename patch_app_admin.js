import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = `import OrganizerPanel from './components/OrganizerPanel';`;
const newImportStatement = `import OrganizerPanel from './components/OrganizerPanel';\nimport AdminPanel from './components/AdminPanel';`;
appContent = replaceSafely(appContent, importStatement, newImportStatement);


const addTab = `              {profile?.role === 'ADMIN' && (
                <NavItem icon={<Activity />} label="مدیریت" isActive={activeTab === 'organizer'} onClick={() => { setShowAiAssistant(false); setActiveTab('organizer'); }} />
              )}`;

const addTabNew = `              {(profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') && (
                <NavItem icon={<Activity />} label="برگزارکننده" isActive={activeTab === 'organizer'} onClick={() => { setShowAiAssistant(false); setActiveTab('organizer'); }} />
              )}
              {profile?.role === 'ADMIN' && (
                <NavItem icon={<Shield />} label="ادمین" isActive={activeTab === 'admin'} onClick={() => { setShowAiAssistant(false); setActiveTab('admin'); }} />
              )}`;
appContent = replaceSafely(appContent, addTab, addTabNew);

const renderTab = `          {activeTab === 'organizer' && profile && (`;
const renderTabNew = `          {activeTab === 'admin' && profile?.role === 'ADMIN' && (
            <div className="h-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-5xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
              <AdminPanel />
            </div>
          )}

          {activeTab === 'organizer' && profile && (`;
appContent = replaceSafely(appContent, renderTab, renderTabNew);

const createBtn = `                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('create'); }}
                  className={\`text-white p-3.5 md:py-3 md:px-4 md:w-full flex items-center justify-center gap-2 md:rounded-xl rounded-full shadow-lg md:shadow-md hover:shadow-xl hover:scale-105 transition-all \${activeTab === 'create' ? 'bg-indigo-600' : 'bg-gray-900'}\`}
                >
                  <PlusCircle className="w-6 h-6" />
                  <span className="hidden md:inline font-bold">ایجاد رویداد</span>
                </button>`;

const createBtnNew = `                {(profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') && (
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('create'); }}
                  className={\`text-white p-3.5 md:py-3 md:px-4 md:w-full flex items-center justify-center gap-2 md:rounded-xl rounded-full shadow-lg md:shadow-md hover:shadow-xl hover:scale-105 transition-all \${activeTab === 'create' ? 'bg-indigo-600' : 'bg-gray-900'}\`}
                >
                  <PlusCircle className="w-6 h-6" />
                  <span className="hidden md:inline font-bold">ایجاد رویداد</span>
                </button>
                )}`;
appContent = replaceSafely(appContent, createBtn, createBtnNew);

fs.writeFileSync('src/App.tsx', appContent);
