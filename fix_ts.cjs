const fs = require('fs');

const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const payload = \{\};/g, 'const payload: any = {};');
code = code.replace(/const payload = \{(\s*name:.*?)status:.*?\};/gs, (match) => {
  return match.replace(/const payload = \{/, 'const payload: any = {');
});

fs.writeFileSync(file, code);
console.log('fixed TS errors');
