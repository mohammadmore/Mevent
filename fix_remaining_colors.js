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
  
  // Remaining indigos
  content = content.replace(/bg-indigo-900/g, 'bg-[#d9ff00]/10');
  content = content.replace(/text-indigo-100/g, 'text-gray-200');
  content = content.replace(/text-indigo-200/g, 'text-[#d9ff00]/60');
  content = content.replace(/text-indigo-300/g, 'text-[#d9ff00]/80');
  content = content.replace(/bg-indigo-400/g, 'bg-[#d9ff00]');
  content = content.replace(/text-indigo-400/g, 'text-[#d9ff00]/80');
  content = content.replace(/bg-indigo-200/g, 'bg-[#d9ff00]/30');
  content = content.replace(/text-indigo-800/g, 'text-white');
  content = content.replace(/from-indigo-100/g, 'from-[#d9ff00]/20');
  content = content.replace(/to-purple-100/g, 'to-[#d9ff00]/10');
  content = content.replace(/hover:bg-indigo-200/g, 'hover:bg-[#d9ff00]/30');

  // Any remaining light-theme grays
  content = content.replace(/bg-gray-900/g, 'bg-[#18181b]');
  content = content.replace(/bg-gray-800/g, 'bg-[#1f1f23]');
  content = content.replace(/border-gray-50/g, 'border-white/5');
  content = content.replace(/border-gray-100/g, 'border-white/10');
  content = content.replace(/border-gray-200/g, 'border-white/20');
  content = content.replace(/divide-gray-100/g, 'divide-white/10');
  content = content.replace(/divide-gray-50/g, 'divide-white/5');

  // Other non-fitting colors
  content = content.replace(/bg-gray-50/g, 'bg-[#1f1f23]');
  content = content.replace(/text-gray-800/g, 'text-gray-200');
  content = content.replace(/text-gray-900/g, 'text-white');
  
  // Specific fix in Gamification panel:
  content = content.replace(/bg-yellow-100 text-yellow-700/g, 'bg-yellow-500/20 text-yellow-500');
  content = content.replace(/bg-orange-100 text-orange-700/g, 'bg-orange-500/20 text-orange-500');
  content = content.replace(/bg-green-100 text-green-700/g, 'bg-green-500/20 text-green-500');

  fs.writeFileSync(file, content);
}
