import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace("const [activeTab, setActiveTab] = useState('discover');", "const [activeTab, setActiveTab] = useState('loading');");
fs.writeFileSync('src/App.tsx', content);
