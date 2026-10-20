import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<Onboarding userId={dbUserId || 1} onComplete={() => setActiveTab(\'discover\'); }} />',
  '<Onboarding userId={dbUserId || 1} onComplete={() => setActiveTab(\'discover\')} />'
);

fs.writeFileSync('src/App.tsx', content);
