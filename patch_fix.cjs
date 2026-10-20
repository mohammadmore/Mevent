const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(/\\n {2}/g, '\n  ');

fs.writeFileSync('src/components/AdminPanel.tsx', code);
