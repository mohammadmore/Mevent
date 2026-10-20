const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.split("\\\\n").join("\\n");
fs.writeFileSync('src/components/AdminPanel.tsx', code);
