const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// For events creation
code = code.replace(
  /const { title, description,/g,
  'const { title, city, description,'
);

code = code.replace(
  /title,/g,
  'title,\n        city: city || \'تهران\','
);

// We should be more precise since `title,` could match multiple times. Let's just sed precisely.
