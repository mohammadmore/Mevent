import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');
content = content.replace("import readXlsxFile from 'read-excel-file';", "import readXlsxFile from 'read-excel-file/browser';");
fs.writeFileSync('src/components/EventForm.tsx', content);

let globals = fs.readFileSync('src/globals.d.ts', 'utf8');
globals = globals.replace("declare module 'read-excel-file' {", "declare module 'read-excel-file/browser' {");
fs.writeFileSync('src/globals.d.ts', globals);
