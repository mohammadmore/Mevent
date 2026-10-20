import fs from 'fs';

let content = fs.readFileSync('src/db/events.ts', 'utf8');

if (!content.includes('capacity: events.capacity')) {
  content = content.replace(
    'cost: events.cost,',
    'cost: events.cost,\n      capacity: events.capacity,'
  );
  fs.writeFileSync('src/db/events.ts', content);
  console.log('src/db/events.ts updated with capacity');
} else {
  console.log('capacity already in events.ts');
}
