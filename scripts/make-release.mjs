// Builds the folder to upload to a Node.js host (cPanel "Setup Node.js App", a VPS, ...):
//
//   npm run build && node scripts/make-release.mjs      →  release/
//
// release/ holds dist/ (the app) and a package.json that lists only what the server needs while
// running (about a tenth of the full install: no Vite, TypeScript or other build tools), plus a
// package-lock.json with the exact versions this project was tested with. On the host, "npm
// install" (cPanel: the "Run NPM Install" button) reads that package.json.
import fs from 'fs';
import path from 'path';
import { builtinModules } from 'module';
import { execSync } from 'child_process';

const root = process.cwd();
const bundle = path.join(root, 'dist', 'server.cjs');
if (!fs.existsSync(bundle)) throw new Error('dist/server.cjs not found: run "npm run build" first.');
const main = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// Packages the bundled server loads at run time (esbuild keeps them external).
const code = fs.readFileSync(bundle, 'utf8');
const names = new Set();
for (const m of code.matchAll(/(?:require|import)\(\s*["']([^"'.][^"']*)["']\s*\)/g)) {
  const spec = m[1].replace(/^node:/, '');
  if (builtinModules.includes(spec.split('/')[0]) || builtinModules.includes(spec)) continue;
  const parts = spec.split('/');
  names.add(spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
}
// Loaded only by the development server; the production server never reaches it.
names.delete('vite');

const dependencies = {};
for (const name of [...names].sort()) {
  // Exactly the version installed here (and tested), not the range from package.json.
  dependencies[name] = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
}

const out = path.join(root, 'release');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'dist'), path.join(out, 'dist'), { recursive: true, filter: src => !src.endsWith('.map') });
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({
  name: main.name === 'react-example' ? 'mevent' : main.name,
  version: main.version,
  private: true,
  scripts: { start: 'node app.js' },
  engines: { node: '>=20.18.1' },
  dependencies,
}, null, 2) + '\n');
// The startup file for the host ("Application startup file: app.js", cPanel's default). Written in
// old-style JavaScript so that even a very old Node.js can run it and explain what is wrong,
// instead of failing on the modern syntax of dist/server.cjs with a confusing error.
fs.writeFileSync(path.join(out, 'app.js'), `// Mevent startup file. Needs Node.js 20.18 or newer (22 recommended).
var v = process.versions.node.split('.').map(Number);
if (v[0] < 20 || (v[0] === 20 && v[1] < 18)) {
  console.error('Mevent needs Node.js 22 (at least 20.18), but this app runs on Node.js ' + process.version + '.');
  console.error('cPanel > Setup Node.js App > Edit > "Node.js version": choose 22, Save, then Run NPM Install and Restart.');
  process.exit(1);
}
require('./dist/server.cjs');
`);
// The initial database tables, as a plain SQL file to import with phpPgAdmin (no command line needed).
// The export tool prints a few notices on the same output; only SQL lines are kept.
const exported = execSync('npx drizzle-kit export --config src/db/drizzle.config.ts --sql', {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  env: { ...process.env, SQL_HOST: 'x', SQL_DB_NAME: 'x', SQL_ADMIN_USER: 'x', SQL_ADMIN_PASSWORD: 'x' },
});
const sqlLines = exported.split('\n').filter(line => !line.includes('statement-breakpoint') && /^(CREATE|ALTER|DROP|INSERT|\s|\)|--|$)/.test(line));
if (!sqlLines.some(l => l.startsWith('CREATE TABLE'))) throw new Error('The schema export contained no tables.');
fs.writeFileSync(path.join(out, 'mevent-tables.sql'), [
  '-- Mevent: the initial database tables. Run once, on an empty PostgreSQL database.',
  '-- Import with phpPgAdmin (SQL tab). Newer columns and tables are added by the application itself',
  '-- the first time it starts, so nothing else is needed.',
  '', ...sqlLines, '',
].join('\n').replace(/\n{3,}/g, '\n\n'));
execSync('npm install --package-lock-only --omit=dev --ignore-scripts --no-audit --no-fund', { cwd: out, stdio: 'inherit' });
console.log(`\nrelease/ is ready (app, package files and mevent-tables.sql): ${Object.keys(dependencies).length} runtime packages\n  ${Object.keys(dependencies).join(', ')}`);
