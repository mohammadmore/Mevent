import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');
content = content.replace("event.location?.address || event.address || 'مکان نامشخص'", "event.location?.address || 'مکان نامشخص'");
fs.writeFileSync('src/components/EventDetail.tsx', content);
