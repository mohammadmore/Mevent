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
      
      // bg-[#d9ff00] -> bg-indigo-600 dark:bg-[#d9ff00]
      content = content.replace(/bg-\[\#d9ff00\](?!\/)/g, 'bg-indigo-600 dark:bg-[#d9ff00]');
      
      // text-[#d9ff00] -> text-indigo-600 dark:text-[#d9ff00]
      content = content.replace(/text-\[\#d9ff00\](?!\/)/g, 'text-indigo-600 dark:text-[#d9ff00]');
      
      // text-black for the button -> text-white dark:text-black
      // Wait, there might be places where we need to fix the text color of the button explicitly.
      // Let's just do it broadly for the buttons using regex.
      // e.g. text-black on bg-[#d9ff00]
      content = content.replace(/bg-indigo-600 dark:bg-\[\#d9ff00\] text-black/g, 'bg-indigo-600 dark:bg-[#d9ff00] text-white dark:text-black');
      
      // Variants with opacity
      const opacities = ['10', '20', '30', '40', '50', '80'];
      for (const op of opacities) {
        content = content.replace(new RegExp(`bg-\\[\\#d9ff00\\]\\/${op}`, 'g'), `bg-indigo-600/${op} dark:bg-[#d9ff00]/${op}`);
        content = content.replace(new RegExp(`text-\\[\\#d9ff00\\]\\/${op}`, 'g'), `text-indigo-600/${op} dark:text-[#d9ff00]/${op}`);
        content = content.replace(new RegExp(`border-\\[\\#d9ff00\\]\\/${op}`, 'g'), `border-indigo-600/${op} dark:border-[#d9ff00]/${op}`);
        content = content.replace(new RegExp(`shadow-\\[\\#d9ff00\\]\\/${op}`, 'g'), `shadow-indigo-600/${op} dark:shadow-[#d9ff00]/${op}`);
      }
      
      // shadow-[#d9ff00]/5
      content = content.replace(/shadow-\[\#d9ff00\]\/5/g, 'shadow-indigo-600/5 dark:shadow-[#d9ff00]/5');
      // ring-[#d9ff00]
      content = content.replace(/ring-\[\#d9ff00\]/g, 'ring-indigo-600 dark:ring-[#d9ff00]');
      // border-[#d9ff00]
      content = content.replace(/border-\[\#d9ff00\](?!\/)/g, 'border-indigo-600 dark:border-[#d9ff00]');
      
      // hover:text-[#d9ff00]
      content = content.replace(/hover:text-\[\#d9ff00\]/g, 'hover:text-indigo-600 dark:hover:text-[#d9ff00]');
      // hover:bg-[#d9ff00]/10
      content = content.replace(/hover:bg-\[\#d9ff00\]\/10/g, 'hover:bg-indigo-600/10 dark:hover:bg-[#d9ff00]/10');
      // hover:border-[#d9ff00]/50
      content = content.replace(/hover:border-\[\#d9ff00\]\/50/g, 'hover:border-indigo-600/50 dark:hover:border-[#d9ff00]/50');
      
      // hover:text-[#c6eb00] (the hover variant of the primary button text)
      content = content.replace(/hover:text-\[\#c6eb00\]/g, 'hover:text-indigo-700 dark:hover:text-[#c6eb00]');
      // hover:bg-[#c6eb00]
      content = content.replace(/hover:bg-\[\#c6eb00\]/g, 'hover:bg-indigo-700 dark:hover:bg-[#c6eb00]');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDirectory('src');
console.log('Palette updated.');
