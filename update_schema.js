import fs from 'fs';

let content = fs.readFileSync('src/db/schema.ts', 'utf8');

// Add capacity field to events if not present
if (!content.includes('capacity: integer')) {
  content = content.replace(
    "cost: integer('cost').default(0).notNull(),",
    "cost: integer('cost').default(0).notNull(),\n  capacity: integer('capacity').default(100).notNull(),"
  );
  fs.writeFileSync('src/db/schema.ts', content);
  console.log('Schema updated with capacity field');
} else {
  console.log('Capacity field already exists');
}
