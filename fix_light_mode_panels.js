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
      
      // Fix background colors
      content = content.replace(/bg-\[\#18181b\](?!\/)/g, 'bg-white/90 dark:bg-[#18181b]');
      content = content.replace(/bg-\[\#1f1f23\](?!\/)/g, 'bg-gray-100 dark:bg-[#1f1f23]');
      
      // Fix background colors with opacity
      content = content.replace(/bg-\[\#18181b\]\/(\d+)/g, 'bg-white/$1 dark:bg-[#18181b]/$1');
      content = content.replace(/bg-\[\#1f1f23\]\/(\d+)/g, 'bg-gray-100/$1 dark:bg-[#1f1f23]/$1');

      // Fix hover backgrounds
      content = content.replace(/hover:bg-\[\#1f1f23\](?!\/)/g, 'hover:bg-gray-200 dark:hover:bg-[#1f1f23]');
      content = content.replace(/hover:bg-\[\#18181b\](?!\/)/g, 'hover:bg-white dark:hover:bg-[#18181b]');

      // Fix text colors that are light gray for dark mode
      content = content.replace(/text-gray-300/g, 'text-gray-700 dark:text-gray-300');
      content = content.replace(/text-gray-200/g, 'text-gray-800 dark:text-gray-200');
      content = content.replace(/text-gray-100/g, 'text-gray-900 dark:text-gray-100');
      
      // Fix border colors
      content = content.replace(/border-white\/10/g, 'border-gray-200 dark:border-white/10');
      content = content.replace(/border-white\/20/g, 'border-gray-300 dark:border-white/20');
      
      // Write back
      fs.writeFileSync(fullPath, content);
    }
  }
}

// But wait, there might be duplicate `dark:` or `bg-white/90` if we run it on App.tsx which we already fixed.
// So let's run it only on specific files
const targets = [
  'src/components/OrganizerPanel.tsx',
  'src/components/GamificationPanel.tsx',
  'src/components/HubsPanel.tsx',
  'src/components/AiAssistant.tsx',
  'src/components/EventForm.tsx',
  'src/components/AdminPanel.tsx',
  'src/components/MapComponent.tsx',
  'src/components/Onboarding.tsx'
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    let content = fs.readFileSync(target, 'utf8');
      
    // Fix background colors
    content = content.replace(/bg-\[\#18181b\](?!\/)/g, 'bg-white/90 dark:bg-[#18181b]');
    content = content.replace(/bg-\[\#1f1f23\](?!\/)/g, 'bg-gray-100 dark:bg-[#1f1f23]');
    
    // Fix background colors with opacity
    content = content.replace(/bg-\[\#18181b\]\/(\d+)/g, 'bg-white/$1 dark:bg-[#18181b]/$1');
    content = content.replace(/bg-\[\#1f1f23\]\/(\d+)/g, 'bg-gray-100/$1 dark:bg-[#1f1f23]/$1');

    // Fix hover backgrounds
    content = content.replace(/hover:bg-\[\#1f1f23\](?!\/)/g, 'hover:bg-gray-200 dark:hover:bg-[#1f1f23]');
    content = content.replace(/hover:bg-\[\#18181b\](?!\/)/g, 'hover:bg-white dark:hover:bg-[#18181b]');

    // Fix text colors that are light gray for dark mode
    content = content.replace(/text-gray-400(?!\/| )/g, 'text-gray-600 dark:text-gray-400');
    content = content.replace(/text-gray-300(?!\/| )/g, 'text-gray-700 dark:text-gray-300');
    content = content.replace(/text-gray-200(?!\/| )/g, 'text-gray-800 dark:text-gray-200');
    content = content.replace(/text-gray-100(?!\/| )/g, 'text-gray-900 dark:text-gray-100');
    
    // Fix text-white
    content = content.replace(/text-white(?!\/| )/g, 'text-gray-900 dark:text-white');
    
    // For text-white where it's inside a colored button (like bg-teal-600) we should revert that back
    content = content.replace(/bg-teal-600 dark:bg-\[\#d9ff00\] text-gray-900 dark:text-white/g, 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black');
    content = content.replace(/bg-teal-600 dark:bg-\[\#d9ff00\] text-gray-900 dark:text-white dark:text-black/g, 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black');
    
    // Fix border colors
    content = content.replace(/border-white\/10/g, 'border-gray-200 dark:border-white/10');
    content = content.replace(/border-white\/20/g, 'border-gray-300 dark:border-white/20');

    // Fix text-white inside black bg
    content = content.replace(/bg-black text-gray-900 dark:text-white/g, 'bg-black text-white');
    content = content.replace(/bg-black\/(\d+) text-gray-900 dark:text-white/g, 'bg-black/$1 text-white');

    fs.writeFileSync(target, content);
  }
}
console.log('Done panels');
