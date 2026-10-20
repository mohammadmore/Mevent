import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir('src');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace text-white with text-black when next to bg-indigo-600
  content = content.replace(/bg-indigo-600\s+text-white/g, 'bg-[#d9ff00] text-black');
  content = content.replace(/text-white\s+bg-indigo-600/g, 'text-black bg-[#d9ff00]');
  
  // Hover states
  content = content.replace(/hover:bg-indigo-700\s+text-white/g, 'hover:bg-[#c6eb00] text-black');
  content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-[#c6eb00]');
  content = content.replace(/hover:text-indigo-700/g, 'hover:text-[#c6eb00]');
  
  // Backgrounds
  content = content.replace(/bg-indigo-600/g, 'bg-[#d9ff00] text-black');
  content = content.replace(/bg-indigo-500\/10/g, 'bg-[#d9ff00]/10');
  content = content.replace(/bg-indigo-100/g, 'bg-[#d9ff00]/20');
  
  // Texts
  content = content.replace(/text-indigo-600/g, 'text-[#d9ff00]');
  content = content.replace(/text-indigo-700/g, 'text-[#d9ff00]');
  content = content.replace(/text-indigo-900/g, 'text-white');
  content = content.replace(/text-indigo-500/g, 'text-[#d9ff00]');
  content = content.replace(/text-indigo-400/g, 'text-[#d9ff00]/80');
  
  // Borders
  content = content.replace(/border-indigo-600/g, 'border-[#d9ff00]');
  content = content.replace(/border-indigo-500\/20/g, 'border-[#d9ff00]/20');
  content = content.replace(/border-indigo-500/g, 'border-[#d9ff00]');
  content = content.replace(/border-indigo-300/g, 'border-[#d9ff00]/50');
  content = content.replace(/border-indigo-200/g, 'border-[#d9ff00]/30');
  
  // Rings
  content = content.replace(/ring-indigo-600/g, 'ring-[#d9ff00]');
  content = content.replace(/ring-indigo-500/g, 'ring-[#d9ff00]');
  content = content.replace(/ring-indigo-100/g, 'ring-[#d9ff00]/30');
  
  // Fills
  content = content.replace(/fill-indigo-600/g, 'fill-[#d9ff00]');

  // Shadows
  content = content.replace(/shadow-indigo-200/g, 'shadow-[#d9ff00]/20');

  // Any remaining indigo
  content = content.replace(/indigo-600/g, '[#d9ff00]');
  content = content.replace(/indigo-500/g, '[#d9ff00]');

  fs.writeFileSync(file, content);
}
