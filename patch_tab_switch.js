import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  useEffect(() => {
    if (activeTab === 'loading') {
      fetchProfile();
    } else {`;

const replacement = `  useEffect(() => {
    setSelectedEvent(null);
    if (activeTab === 'loading') {
      fetchProfile();
    } else {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
