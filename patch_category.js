import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("import { motion } from 'motion/react';")) {
  content = content.replace(
    "import React, { useEffect, useState } from 'react';",
    "import React, { useEffect, useState } from 'react';\nimport { motion } from 'motion/react';"
  );
}

const oldCategoryCode = `{/* Category Chips */}
                {!searchQuery && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={\`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors \${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}\`}
                    >
                      همه
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={\`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors \${activeCategory === cat ? 'bg-[#d9ff00] text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}\`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}`;

const newCategoryCode = `{/* Category Chips */}
                {!searchQuery && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                    >
                      {activeCategory === 'all' && (
                         <motion.div
                            layoutId="active-category"
                            className="absolute inset-0 bg-[#d9ff00] rounded-full z-0 shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                         />
                      )}
                      <span className={\`relative z-10 \${activeCategory === 'all' ? 'text-black font-bold' : 'text-gray-300 group-hover:text-white'}\`}>همه</span>
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                      >
                        {activeCategory === cat && (
                           <motion.div
                              layoutId="active-category"
                              className="absolute inset-0 bg-[#d9ff00] rounded-full z-0 shadow-sm"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                           />
                        )}
                        <span className={\`relative z-10 \${activeCategory === cat ? 'text-black font-bold' : 'text-gray-300 group-hover:text-white'}\`}>{cat}</span>
                      </button>
                    ))}
                  </div>
                )}`;

content = content.replace(oldCategoryCode, newCategoryCode);

fs.writeFileSync('src/App.tsx', content);
