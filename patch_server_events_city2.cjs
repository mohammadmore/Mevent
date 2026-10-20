const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const { title, description, /g,
  'const { title, city, description, '
);

code = code.replace(
  /        title,/g,
  '        title,\n        city: city || \'تهران\','
);

fs.writeFileSync('server.ts', code);
