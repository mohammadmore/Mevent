import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace("ExternalLink } from 'lucide-react';", "ExternalLink, CheckCircle } from 'lucide-react';");

fs.writeFileSync('src/components/EventDetail.tsx', content);
