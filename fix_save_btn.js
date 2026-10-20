import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldSaveBtn = `                          className="flex items-center gap-2 bg-white/90 dark:bg-[#18181b] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors shadow-sm"
                        >
                          {savedEvents.some(se => se.id === event.id) ? (
                            <><Bookmark className="w-4 h-4 fill-[#FD6F2F] dark:fill-blue-500 text-[#FD6F2F] dark:text-blue-500" /> ذخیره شده</>
                          ) : (
                            <><Bookmark className="w-4 h-4" /> ذخیره</>
                          )}
                        </button>`;

const newSaveBtn = `                          className={\`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm \${
                            savedEvents.some(se => se.id === event.id) 
                              ? 'bg-[#747E4D] dark:bg-[#18181b] text-white dark:text-gray-300 border-[#747E4D] dark:border-white/10 hover:bg-[#515739] dark:hover:bg-[#1f1f23]' 
                              : 'bg-white dark:bg-[#18181b] text-[#747E4D] dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1f1f23]'
                          }\`}
                        >
                          {savedEvents.some(se => se.id === event.id) ? (
                            <><Bookmark className="w-4 h-4 fill-white dark:fill-blue-500 dark:text-blue-500" /> ذخیره شده</>
                          ) : (
                            <><Bookmark className="w-4 h-4" /> ذخیره</>
                          )}
                        </button>`;

content = content.replace(oldSaveBtn, newSaveBtn);
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed Save button styling');
