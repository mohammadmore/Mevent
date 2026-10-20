const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const target = `        <button
          onClick={() => setActiveTab('settings')}`;

const rep = `        <button
          onClick={() => setActiveTab('places')}
          className={\`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 \${
            activeTab === 'places'
              ? 'border-teal-600 text-teal-600 dark:border-[#d9ff00] dark:text-[#d9ff00]'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }\`}
        >
          <MapPin className="w-4 h-4" />
          پاتوق‌ها ({toPersianDigits(places.length)})
        </button>
        <button
          onClick={() => setActiveTab('chains')}
          className={\`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 \${
            activeTab === 'chains'
              ? 'border-teal-600 text-teal-600 dark:border-[#d9ff00] dark:text-[#d9ff00]'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }\`}
        >
          <Film className="w-4 h-4" />
          فستیوال‌ها ({toPersianDigits(chains.length)})
        </button>
        <button
          onClick={() => setActiveTab('vibes')}
          className={\`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 \${
            activeTab === 'vibes'
              ? 'border-teal-600 text-teal-600 dark:border-[#d9ff00] dark:text-[#d9ff00]'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }\`}
        >
          <Wind className="w-4 h-4" />
          حال و هوا ({toPersianDigits(vibes.length)})
        </button>
        <button
          onClick={() => setActiveTab('flows')}
          className={\`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 \${
            activeTab === 'flows'
              ? 'border-teal-600 text-teal-600 dark:border-[#d9ff00] dark:text-[#d9ff00]'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }\`}
        >
          <Activity className="w-4 h-4" />
          جریان‌ها ({toPersianDigits(flows.length)})
        </button>
        <button
          onClick={() => setActiveTab('settings')}`;

code = code.replace(target, rep);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
