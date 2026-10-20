import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSearching(!isSearching)}`;

const rep = `              <div className="flex gap-2">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:bg-white/5"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsSearching(!isSearching)}`;

content = content.replace(target, rep);

fs.writeFileSync('src/App.tsx', content);
