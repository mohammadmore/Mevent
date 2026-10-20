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
      
      content = content.replace(/bg-\[\#d9ff00\]\/5/g, 'bg-indigo-600/5 dark:bg-[#d9ff00]/5');
      content = content.replace(/text-\[\#d9ff00\]\/5/g, 'text-indigo-600/5 dark:text-[#d9ff00]/5');
      content = content.replace(/border-\[\#d9ff00\]\/5/g, 'border-indigo-600/5 dark:border-[#d9ff00]/5');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory('src');
console.log('Palette updated 2.');
