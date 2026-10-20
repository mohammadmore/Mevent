import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            <div className="flex md:flex-col justify-around md:justify-start items-center md:items-stretch w-full md:gap-2">
              <NavItem icon={<Compass />} label="کشف" isActive={activeTab === 'discover'} onClick={() => { setShowAiAssistant(false); setActiveTab('discover'); }} />
              <NavItem icon={<Users />} label="جوامع" isActive={activeTab === 'hubs'} onClick={() => { setShowAiAssistant(false); setActiveTab('hubs'); }} />
              {(profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') && (
                <NavItem icon={<Activity />} label="برگزارکننده" isActive={activeTab === 'organizer'} onClick={() => { setShowAiAssistant(false); setActiveTab('organizer'); }} />
              )}
              {profile?.role === 'ADMIN' && (
                <NavItem icon={<Shield />} label="ادمین" isActive={activeTab === 'admin'} onClick={() => { setShowAiAssistant(false); setActiveTab('admin'); }} />
              )}
              
              <div className="relative -top-5 md:top-0 md:w-full md:my-4 z-50">
                {(profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') && (
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('create'); }}
                  className={\`text-white p-3.5 md:py-3 md:px-4 md:w-full flex items-center justify-center gap-2 md:rounded-xl rounded-full shadow-lg md:shadow-md hover:shadow-xl hover:scale-105 transition-all \${activeTab === 'create' ? 'bg-indigo-600' : 'bg-gray-900'}\`}
                >
                  <PlusCircle className="w-6 h-6" />
                  <span className="hidden md:inline font-bold">ایجاد رویداد</span>
                </button>
                )}
              </div>
              
              <NavItem icon={<Heart />} label="ذخیره" isActive={activeTab === 'saved'} onClick={() => { setShowAiAssistant(false); setActiveTab('saved'); }} />
              <NavItem icon={<User />} label="پروفایل" isActive={activeTab === 'profile'} onClick={() => { setShowAiAssistant(false); setActiveTab('profile'); }} />
            </div>`;

const repl = `            <div className="flex md:flex-col justify-around md:justify-start items-center md:items-stretch w-full md:gap-2">
              <NavItem icon={<Compass />} label="کشف" isActive={activeTab === 'discover'} onClick={() => { setShowAiAssistant(false); setActiveTab('discover'); }} />
              <NavItem icon={<Users />} label="جوامع" isActive={activeTab === 'hubs'} onClick={() => { setShowAiAssistant(false); setActiveTab('hubs'); }} />
              
              <div className="relative -top-5 md:top-0 md:w-full md:my-4 z-50">
                {(profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') && (
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('create'); }}
                  className={\`text-white p-3.5 md:py-3 md:px-4 md:w-full flex items-center justify-center gap-2 md:rounded-xl rounded-full shadow-lg md:shadow-md hover:shadow-xl hover:scale-105 transition-all \${activeTab === 'create' ? 'bg-indigo-600' : 'bg-gray-900'}\`}
                >
                  <PlusCircle className="w-6 h-6" />
                  <span className="hidden md:inline font-bold">ایجاد رویداد</span>
                </button>
                )}
              </div>

              {(profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') && (
                <NavItem icon={<Activity />} label="برگزارکننده" isActive={activeTab === 'organizer'} onClick={() => { setShowAiAssistant(false); setActiveTab('organizer'); }} />
              )}
              {profile?.role === 'ADMIN' && (
                <NavItem icon={<Shield />} label="ادمین" isActive={activeTab === 'admin'} onClick={() => { setShowAiAssistant(false); setActiveTab('admin'); }} />
              )}
              
              <NavItem icon={<Heart />} label="ذخیره" isActive={activeTab === 'saved'} onClick={() => { setShowAiAssistant(false); setActiveTab('saved'); }} />
              <NavItem icon={<User />} label="پروفایل" isActive={activeTab === 'profile'} onClick={() => { setShowAiAssistant(false); setActiveTab('profile'); }} />
            </div>`;

content = content.replace(target, repl);
fs.writeFileSync('src/App.tsx', content);
