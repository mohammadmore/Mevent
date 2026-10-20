import fs from 'fs';
import path from 'path';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Theme gradient base
      content = content.replace(/from-blue-50/g, 'from-teal-50');
      content = content.replace(/to-purple-50/g, 'to-cyan-50');
      
      // Indigo to Teal
      content = content.replace(/indigo-600/g, 'teal-600');
      content = content.replace(/indigo-700/g, 'teal-700');
      
      // Image placeholders
      content = content.replace(/bg-black\/5 dark:bg-\[\#18181b\]\/5/g, 'bg-teal-50 dark:bg-[#18181b]/5');
      content = content.replace(/bg-black\/5 dark:bg-white\/5/g, 'bg-teal-50 dark:bg-white/5');
      content = content.replace(/bg-black\/10 dark:bg-white\/10/g, 'bg-teal-100 dark:bg-white/10');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory('src');
console.log('Turquoise applied.');
