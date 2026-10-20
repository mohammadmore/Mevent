import fs from 'fs';
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(
  "imageUrl?: string;",
  "imageUrl?: string;\n  ticketUrl?: string;"
);

fs.writeFileSync('src/types.ts', content);
