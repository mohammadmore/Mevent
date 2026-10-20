import fs from 'fs';
let content = fs.readFileSync('src/components/DockMenu.tsx', 'utf8');

const target = `              <motion.div 
                className="z-10 flex items-center justify-center absolute pointer-events-none"
                animate={{ 
                  y: isActive ? -20 : 0,
                  color: isActive ? '#000000' : '#9ca3af' // gray-400
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                whileHover={!isActive ? { color: '#ffffff' } : {}}
              >`;

const rep = `              <motion.div 
                className={\`z-10 flex items-center justify-center absolute pointer-events-none transition-colors duration-300 \${isActive ? 'text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}\`}
                animate={{ 
                  y: isActive ? -20 : 0
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                whileHover={!isActive ? { scale: 1.1 } : {}}
              >`;

content = content.replace(target, rep);

fs.writeFileSync('src/components/DockMenu.tsx', content);
