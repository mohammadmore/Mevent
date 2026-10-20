const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

if (code.includes('placeId?: number;')) {
  console.log('Already patched');
  process.exit(0);
}

code = code.replace(/export interface Event \{/, `export interface Event {
  placeId?: number;
  chainId?: number;
  capacity?: number;`);
  
fs.writeFileSync('src/types.ts', code);
console.log('Event patched');
