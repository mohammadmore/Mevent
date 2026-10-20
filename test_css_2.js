import fs from 'fs';

let css = fs.readFileSync('src/index.css', 'utf8');

const additionalOverrides = `
@layer base {
  :root {
    --color-cyan-50: #FFEAD1;
    --color-cyan-100: #DCE4B8;
    --color-cyan-500: #FD6F2F;
    --color-cyan-600: #FD6F2F;
    --color-cyan-900: #FD6F2F;
    
    --color-yellow-50: #FFEAD1;
    --color-yellow-100: #DCE4B8;
    --color-yellow-500: #FD6F2F;
    --color-yellow-600: #FD6F2F;
    
    --color-amber-50: #FFEAD1;
    --color-amber-100: #DCE4B8;
    --color-amber-500: #FD6F2F;
    --color-amber-600: #FD6F2F;
    
    --color-zinc-50: #FFEAD1;
    --color-zinc-100: #DCE4B8;
    --color-zinc-200: #DCE4B8;
    --color-zinc-800: #515739;
    --color-zinc-900: #515739;
  }
}
`;

fs.writeFileSync('src/index.css', css + additionalOverrides);
