import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = `        <div>
          <h2 className="text-lg font-bold text-gray-100 mb-3">درباره رویداد</h2>
          <div className="prose prose-sm text-gray-300 leading-loose">
            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p className="italic text-gray-400">توضیحاتی برای این رویداد ثبت نشده است.</p>
            )}
          </div>
        </div>`;

const rep = `        <div>
          <h2 className="text-lg font-bold text-gray-100 mb-3">درباره رویداد</h2>
          <div className="prose prose-sm text-gray-300 leading-loose">
            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p className="italic text-gray-400">توضیحاتی برای این رویداد ثبت نشده است.</p>
            )}
          </div>
        </div>

        {/* Gallery Section */}
        <div className="mt-8 mb-4">
          <h2 className="text-lg font-bold text-gray-100 mb-4">گالری تصاویر رویداد</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((num) => (
              <div key={num} className="rounded-xl overflow-hidden aspect-[4/3] bg-white/5 border border-white/10 relative group cursor-pointer">
                <img 
                  src={\`https://picsum.photos/seed/\${event.id * 10 + num}/400/300\`} 
                  alt={\`تصویر گالری \${num}\`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
              </div>
            ))}
          </div>
        </div>`;

content = content.replace(target, rep);

fs.writeFileSync('src/components/EventDetail.tsx', content);
