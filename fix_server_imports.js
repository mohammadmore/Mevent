import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// Replace .ts imports with standard module paths
content = content.replace(/from '\.\/src\/db\/index\.ts';/g, "from './src/db/index';");
content = content.replace(/from '\.\/src\/db\/schema\.ts';/g, "from './src/db/schema';");
content = content.replace(/from '\.\/src\/db\/events\.ts';/g, "from './src/db/events';");
content = content.replace(/from '\.\/src\/db\/interactions\.ts';/g, "from './src/db/interactions';");
content = content.replace(/from '\.\/src\/db\/users\.ts';/g, "from './src/db/users';");
content = content.replace(/from '\.\/src\/db\/tickets\.ts';/g, "from './src/db/tickets';");
content = content.replace(/from '\.\/src\/db\/hubs\.ts';/g, "from './src/db/hubs';");

fs.writeFileSync('server.ts', content);
console.log('Fixed imports in server.ts');
