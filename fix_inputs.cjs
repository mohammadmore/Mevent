const fs = require('fs');

const file = 'src/components/PlaceForm.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/value=\{formData\.name\}/g, "value={formData.name || ''}");
  content = content.replace(/value=\{formData\.address\}/g, "value={formData.address || ''}");
  content = content.replace(/value=\{formData\.imageUrl\}/g, "value={formData.imageUrl || ''}");
  content = content.replace(/value=\{formData\.type\}/g, "value={formData.type || ''}");
  fs.writeFileSync(file, content);
}
