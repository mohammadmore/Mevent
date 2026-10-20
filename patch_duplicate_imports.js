import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "      const { db } = await import('./src/db/index.ts');\n      const { users } = await import('./src/db/schema.ts');\n      const { eq, sql } = await import('drizzle-orm');",
  "      const { users } = await import('./src/db/schema.ts');\n      const { sql } = await import('drizzle-orm');"
);

fs.writeFileSync('server.ts', content);
