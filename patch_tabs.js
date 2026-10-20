import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'onClick={() => setActiveTab(',
  'onClick={() => { setShowAiAssistant(false); setActiveTab('
);
content = content.replace(
  'onClick={() => setActiveTab(',
  'onClick={() => { setShowAiAssistant(false); setActiveTab('
);
content = content.replace(
  'onClick={() => setActiveTab(',
  'onClick={() => { setShowAiAssistant(false); setActiveTab('
);
content = content.replace(
  'onClick={() => setActiveTab(',
  'onClick={() => { setShowAiAssistant(false); setActiveTab('
);
content = content.replace(
  'onClick={() => setActiveTab(',
  'onClick={() => { setShowAiAssistant(false); setActiveTab('
);
content = content.replace(
  'onClick={() => setActiveTab(',
  'onClick={() => { setShowAiAssistant(false); setActiveTab('
);

fs.writeFileSync('src/App.tsx', content);
