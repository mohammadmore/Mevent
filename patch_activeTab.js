import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace("const [activeTab, setActiveTab] = useState('loading');", "const [activeTab, setActiveTab] = useState('discover');");
fs.writeFileSync('src/App.tsx', content);
