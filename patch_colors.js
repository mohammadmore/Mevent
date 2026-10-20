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
  content = content.replace(/bg-white\/90/g, 'bg-[#18181b]/90');
  content = content.replace(/bg-white\/10/g, 'bg-white/10');
  content = content.replace(/bg-white/g, 'bg-[#18181b]');
  content = content.replace(/text-gray-900/g, 'text-gray-100');
  content = content.replace(/text-gray-800/g, 'text-gray-200');
  content = content.replace(/text-gray-500/g, 'text-gray-400');
  content = content.replace(/text-gray-600/g, 'text-gray-300');
  content = content.replace(/border-gray-100/g, 'border-white/10');
  content = content.replace(/border-gray-200/g, 'border-white/20');
  content = content.replace(/border-gray-300/g, 'border-white/30');
  content = content.replace(/bg-gray-50/g, 'bg-[#1f1f23]');
  content = content.replace(/bg-gray-100/g, 'bg-white/5');
  content = content.replace(/bg-gray-200/g, 'bg-white/10');
  content = content.replace(/bg-indigo-50/g, 'bg-indigo-500/10');
  content = content.replace(/border-indigo-100/g, 'border-indigo-500/20');
  fs.writeFileSync(file, content);
}
