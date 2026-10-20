const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// For places creation
code = code.replace(
  /name: data.name \|\| 'پاتوق جدید',/,
  `name: data.name || 'پاتوق جدید',\n        city: data.city || 'تهران',`
);

// For events creation
// Wait, createEvent is in src/db/events.ts? I'll just check where createEvent is defined.
fs.writeFileSync('server.ts', code);
