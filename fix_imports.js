import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'import { Filter, Trash2',
  'import { Sun, Moon, Filter, Trash2'
);

fs.writeFileSync('src/App.tsx', content);
