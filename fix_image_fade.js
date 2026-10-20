import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="w-full h-64 bg-teal-50 dark:bg-white/5 overflow-hidden relative">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>`;

const replacement = `<div className="w-full h-64 overflow-hidden relative">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                      </div>`;

content = content.replaceAll(target, replacement);

// There is one with another spacing perhaps? Let's check.
const target2 = `<div className="w-full h-64 bg-teal-50 dark:bg-white/5 overflow-hidden relative">
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>`;

const replacement2 = `<div className="w-full h-64 overflow-hidden relative">
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                        </div>`;

content = content.replaceAll(target2, replacement2);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed image fade');
