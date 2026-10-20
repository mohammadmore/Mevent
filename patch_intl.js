import fs from 'fs';
let contentApp = fs.readFileSync('src/App.tsx', 'utf8');
let contentDetail = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

contentApp = contentApp.replace(
  "const optionsDate: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };",
  "const optionsDate: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', calendar: 'persian' };"
).replace(
  "const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };",
  "const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', calendar: 'persian' };"
);

contentDetail = contentDetail.replace(
  "new Intl.DateTimeFormat('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);",
  "new Intl.DateTimeFormat('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', calendar: 'persian' }).format(d);"
).replace(
  "new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(d);",
  "new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', calendar: 'persian' }).format(d);"
);

fs.writeFileSync('src/App.tsx', contentApp);
fs.writeFileSync('src/components/EventDetail.tsx', contentDetail);
