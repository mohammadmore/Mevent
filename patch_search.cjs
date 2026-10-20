const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const [searchType, setSearchType]')) {
  code = code.replace(
    'const [searchQuery, setSearchQuery] = useState(\'\');',
    'const [searchQuery, setSearchQuery] = useState(\'\');\n  const [searchType, setSearchType] = useState<\'all\' | \'events\' | \'places\'>(\'all\');'
  );
  
  code = code.replace(
    `placeholder="جستجوی رویداد، دسته‌بندی و..."`,
    `placeholder="جستجوی پاتوق، رویداد، دسته‌بندی و..."`
  );

  const pills = `
                {searchQuery && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setSearchType('all')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>همه نتایج</button>
                    <button onClick={() => setSearchType('events')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'events' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>رویدادها</button>
                    <button onClick={() => setSearchType('places')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'places' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>پاتوق‌ها</button>
                  </div>
                )}
`;

  code = code.replace(
    `</button>
                )}
              </div>`,
    `</button>
                )}
              </div>` + pills
  );
  
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched search');
} else {
  console.log('Already patched search');
}
