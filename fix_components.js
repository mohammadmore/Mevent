import fs from 'fs';

const files = [
  'src/components/EventDetail.tsx',
  'src/components/HubsPanel.tsx',
  'src/components/OrganizerPanel.tsx',
  'src/components/AdminPanel.tsx',
  'src/components/GamificationPanel.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<h([1-6])([^>]*)text-gray-900([^>]*)>/g, '<h$1$2text-[#515739]$3>');
  fs.writeFileSync(file, content);
});
console.log('Fixed components');
