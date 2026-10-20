import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldAllBtn = `                    <button
                      onClick={() => setActiveCategory('all')}
                      className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                    >
                      {activeCategory === 'all' && (
                         <motion.div
                            layoutId="active-category"
                            className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-20 shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                         />
                      )}
                      <span className={\`relative z-10 \${activeCategory === 'all' ? 'text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}\`}>همه</span>
                    </button>`;

const newAllBtn = `                    <button
                      onClick={() => setActiveCategory('all')}
                      className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                    >
                      {activeCategory === 'all' && (
                         <motion.div
                            layoutId="active-category"
                            className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                         />
                      )}
                      <span className={\`relative z-10 \${activeCategory === 'all' ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}\`}>همه</span>
                    </button>`;

const oldCatBtn = `                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                      >
                        {activeCategory === cat && (
                           <motion.div
                              layoutId="active-category"
                              className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-20 shadow-sm"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                           />
                        )}
                        <span className={\`relative z-10 \${activeCategory === cat ? 'text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}\`}>{cat}</span>
                      </button>`;

const newCatBtn = `                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                      >
                        {activeCategory === cat && (
                           <motion.div
                              layoutId="active-category"
                              className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                           />
                        )}
                        <span className={\`relative z-10 \${activeCategory === cat ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}\`}>{cat}</span>
                      </button>`;

content = content.replace(oldAllBtn, newAllBtn);
content = content.replace(oldCatBtn, newCatBtn);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed category chips');
