import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-500 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                    </div>`;

const replacement = `                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-500 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-green-200">نشان شده</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium border border-gray-100">{tag}</span>
                        ))}
                      </div>
                    </div>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
