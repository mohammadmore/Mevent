import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const target = `      const { name, description, type, ownerId } = req.body;
      const { createHub } = await import('./src/db/hubs.ts');
      const hub = await createHub({ name, description, type, ownerId });`;

const repl = `      const { name, description, type, ownerId, imageUrl } = req.body;
      const { createHub } = await import('./src/db/hubs.ts');
      const hub = await createHub({ name, description, type, ownerId, imageUrl });`;

content = content.replace(target, repl);
fs.writeFileSync('server.ts', content);
