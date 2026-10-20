import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = `        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6 leading-tight">{event.title}</h1>`;

const rep = `        <div className="flex items-center gap-3 mb-4">
          <img src={\`https://api.dicebear.com/7.x/notionists/svg?seed=\${event.organizerId || event.title}&backgroundColor=transparent\`} alt="Organizer" className="w-12 h-12 rounded-full border border-white/10 shrink-0 bg-[#1f1f23]/50" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">برگزارکننده</span>
            <span className="font-bold text-gray-100 text-sm">{event.source === 'UGC' ? 'مجری اختصاصی میونت' : 'مجری رویداد'}</span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6 leading-tight">{event.title}</h1>`;

content = content.replace(target, rep);

fs.writeFileSync('src/components/EventDetail.tsx', content);
