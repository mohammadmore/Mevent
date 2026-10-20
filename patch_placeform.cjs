const fs = require('fs');
let code = fs.readFileSync('src/components/PlaceForm.tsx', 'utf8');

code = code.replace(
  'export default function PlaceForm({ onSuccess, initialData }: any) {',
  'export default function PlaceForm({ onSuccess, initialData, isAdmin }: any) {'
);

const targetFetch = `      const res = await fetch('/api/places', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });`;

const repFetch = `      const url = isAdmin && initialData ? \`/api/admin/places/\${initialData.id}\` : '/api/places';
      const res = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });`;

code = code.replace(targetFetch, repFetch);

fs.writeFileSync('src/components/PlaceForm.tsx', code);
