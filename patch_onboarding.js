import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<Onboarding userId={dbUserId || 1} onComplete={() => setActiveTab(\'discover\')} />',
  '<div className="max-w-2xl mx-auto w-full"><Onboarding userId={dbUserId || 1} onComplete={() => setActiveTab(\'discover\')} /></div>'
);

fs.writeFileSync('src/App.tsx', content);
