import fs from 'fs';
let content = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

content = content.replace(
  "          };\n          const data = await res.json();",
  "          });\n          const data = await res.json();"
);

fs.writeFileSync('src/lib/AuthContext.tsx', content);
