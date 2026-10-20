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
      
      content = content.replace(/hover:bg-teal-50 dark:bg-white\/5/g, 'hover:bg-teal-50 dark:hover:bg-white/5');
      content = content.replace(/hover:bg-teal-100 dark:bg-white\/10/g, 'hover:bg-teal-100 dark:hover:bg-white/10');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory('src');
console.log('Hover dark mode issues fixed.');
