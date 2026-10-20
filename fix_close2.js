import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-[#d9ff00]/20 text-[#d9ff00] border-[#d9ff00]/40 px-2.5 py-1 rounded-lg text-xs font-bold border">منم میرم</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-[#1f1f23] text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {rsvpEvents.length === 0 && (`,
  `                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-[#d9ff00]/20 text-[#d9ff00] border-[#d9ff00]/40 px-2.5 py-1 rounded-lg text-xs font-bold border">منم میرم</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-[#1f1f23] text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-white/10">{tag}</span>
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                  {rsvpEvents.length === 0 && (`
);

content = content.replace(
  `                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-blue-200 text-blue-800 border-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold border">نشان شده</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-[#1f1f23] text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0 && (`,
  `                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-blue-200 text-blue-800 border-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold border">نشان شده</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-[#1f1f23] text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-white/10">{tag}</span>
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0 && (`
);


fs.writeFileSync('src/App.tsx', content);
