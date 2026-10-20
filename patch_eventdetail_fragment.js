import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(
  '</div>\n    </div>\n  );\n}',
  '</div>\n    </div>\n    </>\n  );\n}'
);

fs.writeFileSync('src/components/EventDetail.tsx', content);
