import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<button\n                onClick={login}\n                disabled={isLoggingIn}\n                className="w-full',
  '<button\n                onClick={login}\n                disabled={isLoggingIn}\n                className="w-full max-w-sm mx-auto'
);

fs.writeFileSync('src/App.tsx', content);
