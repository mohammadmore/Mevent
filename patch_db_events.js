import fs from 'fs';
let content = fs.readFileSync('src/db/events.ts', 'utf8');

if (!content.includes('inArray')) {
  content = content.replace("import { eq, gt, and } from 'drizzle-orm';", "import { eq, gt, and, inArray } from 'drizzle-orm';");
}

content = content.replace(
  "eq(interactions.type, 'SAVE')",
  "inArray(interactions.type, ['SAVE', 'RSVP'])"
);

fs.writeFileSync('src/db/events.ts', content);
