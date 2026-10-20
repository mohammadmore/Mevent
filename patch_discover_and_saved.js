import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace Discover card styling
const targetDiscoverCard = `                  <div 
                    key={\`\${event.id}-\${index}\`} 
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden cursor-pointer"
                    onClick={() => { handleInteraction(event.id, 'VIEW'); setSelectedEvent(event); }}
                  >`;

const replacementDiscoverCard = `                  <div 
                    key={\`\${event.id}-\${index}\`} 
                    className={\`group rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer \${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-green-50/50 border-green-100 shadow-sm hover:shadow-md' 
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-blue-50/50 border-blue-100 shadow-sm hover:shadow-md'
                        : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                    }\`}
                    onClick={() => { handleInteraction(event.id, 'VIEW'); setSelectedEvent(event); }}
                  >`;
content = content.replace(targetDiscoverCard, replacementDiscoverCard);

// Replace RSVP button in Discover
const targetRSVP = `                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleInteraction(event.id, 'RSVP'); }}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                          >
                            <CheckCircle className="w-4 h-4" /> منم میام
                          </button>
                        )}`;

const replacementRSVP = `                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleInteraction(event.id, 'RSVP'); }}
                            className={\`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm \${
                              rsvpEvents.some(se => se.id === event.id)
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }\`}
                          >
                            <CheckCircle className="w-4 h-4" /> {rsvpEvents.some(se => se.id === event.id) ? 'می‌روم' : 'منم میام'}
                          </button>
                        )}`;
content = content.replace(targetRSVP, replacementRSVP);

// Replace Saved Tab content
const targetSavedTab = `              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">رویدادهای ذخیره شده</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedEvents.map((event: any, index) => (
                    <div key={\`\${event.id}-\${index}\`} className={\`\${event.savedInteractionType === 'RSVP' ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'} rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer\`} onClick={() => setSelectedEvent(event)}>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-500 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={\`\${event.savedInteractionType === 'RSVP' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'} px-2.5 py-1 rounded-lg text-xs font-bold border\`}>{event.savedInteractionType === 'RSVP' ? 'منم میرم' : 'نشان شده'}</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium border border-gray-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0 && (
                     <p className="text-center text-gray-400 py-6">هنوز رویدادی ذخیره نکرده‌اید.</p>
                  )}
                </div>
              </div>`;

const replacementSavedTab = `              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">رویدادهایی که می‌روم</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rsvpEvents.map((event: any, index) => (
                    <div key={\`\${event.id}-\${index}\`} className="bg-green-50/50 border-green-100 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-500 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-green-100 text-green-700 border-green-200 px-2.5 py-1 rounded-lg text-xs font-bold border">منم میرم</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium border border-gray-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {rsvpEvents.length === 0 && (
                     <p className="text-center text-gray-400 py-6">هنوز برای رویدادی ثبت‌نام نکرده‌اید.</p>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">رویدادهای نشان‌شده</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedEvents.map((event: any, index) => (
                    <div key={\`\${event.id}-\${index}\`} className="bg-blue-50/50 border-blue-100 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-500 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-blue-100 text-blue-700 border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold border">نشان شده</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium border border-gray-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0 && (
                     <p className="text-center text-gray-400 py-6">هنوز رویدادی نشان نکرده‌اید.</p>
                  )}
                </div>
              </div>`;
content = content.replace(targetSavedTab, replacementSavedTab);

fs.writeFileSync('src/App.tsx', content);
