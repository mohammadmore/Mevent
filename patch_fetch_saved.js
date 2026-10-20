import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  function fetchProfile() {
    if (!dbUserId) return;
    fetch(\`/api/users/\${dbUserId}/profile\`)`;

const replacement = `  function fetchProfile() {
    if (!dbUserId) return;
    fetchSavedEvents(); // Also fetch saved events globally
    fetch(\`/api/users/\${dbUserId}/profile\`)`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
