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
      
      content = content.replace(
        /shadow-\[0_8px_20px_rgba\(217,255,0,0\.3\)\]/g, 
        'shadow-indigo-600/30 dark:shadow-[0_8px_20px_rgba(217,255,0,0.3)]'
      );

      content = content.replace(
        /shadow-\[0_0_15px_rgba\(217,255,0,0\.1\)\]/g, 
        'shadow-indigo-600/10 dark:shadow-[0_0_15px_rgba(217,255,0,0.1)]'
      );

      content = content.replace(
        /hover:shadow-\[0_0_25px_rgba\(217,255,0,0\.2\)\]/g, 
        'hover:shadow-indigo-600/20 dark:hover:shadow-[0_0_25px_rgba(217,255,0,0.2)]'
      );
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory('src');
console.log('Shadows updated.');
