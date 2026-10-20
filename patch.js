import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `{activeTab === 'hubs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">جوامع و هاب‌ها</h2>
                <button onClick={handleCreateHub} className="text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors">ایجاد جامعه +</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {hubs.map(hub => (
                  <div key={hub.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{hub.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{hub.type}</p>
                    <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                      {hub.followersCount} دنبال‌کننده
                    </div>
                  </div>
                ))}
                {hubs.length === 0 && (
                   <div className="col-span-full flex flex-col items-center justify-center py-16">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-center text-gray-500 font-medium text-lg mb-2">هنوز جامعه‌ای وجود ندارد</p>
                      <p className="text-center text-gray-400 text-sm mb-6 max-w-xs">شما می‌توانید اولین جامعه را در حوزه مورد علاقه خود بسازید.</p>
                      <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" />
                        ایجاد جامعه جدید
                      </button>
                   </div>
                )}
              </div>
            </div>
          )}`;

const replacement = `{activeTab === 'hubs' && (
            <HubsPanel 
              dbUserId={dbUserId} 
              initialHubs={hubs} 
              events={events} 
              onNavigateToEvent={(event) => setSelectedEvent(event)} 
            />
          )}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
