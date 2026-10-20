import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The string in NavItem is `onClick={() => setActiveTab('xyz')}` or similar.
// Wait, I already replaced some of them. Let's make sure it's correct.
// The easiest is just finding all `onClick={() => setActiveTab(` and replacing them.
content = content.replace(/onClick=\{\(\) => setActiveTab\(/g, "onClick={() => { setShowAiAssistant(false); setActiveTab(");

// We need to fix the closing brace for the function
content = content.replace(/setActiveTab\('([^']+)'\)\}/g, "setActiveTab('$1'); }}");

fs.writeFileSync('src/App.tsx', content);
