const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const cityHtml = `        {event.city && (
          <div className="flex items-center gap-1 mb-2 text-teal-600 dark:text-[#d9ff00] font-bold text-sm bg-teal-50 dark:bg-[#d9ff00]/10 w-fit px-3 py-1 rounded-full border border-teal-200 dark:border-[#d9ff00]/20">
            <MapPin className="w-4 h-4" />
            {event.city}
          </div>
        )}`;

code = code.replace(
  /<h1 className="text-2xl sm:text-3xl font-bold text-\[#515739\] dark:text-gray-100 mb-6 leading-tight">\{event\.title\}<\/h1>/,
  `${cityHtml}\n        <h1 className="text-2xl sm:text-3xl font-bold text-[#515739] dark:text-gray-100 mb-6 leading-tight">{event.title}</h1>`
);

fs.writeFileSync('src/components/EventDetail.tsx', code);
