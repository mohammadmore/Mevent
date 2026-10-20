const fs = require('fs');

const files = [
  'src/components/ChainForm.tsx',
  'src/components/PlaceForm.tsx',
  'src/components/EventForm.tsx',
  'src/components/ProfileEditModal.tsx',
  'src/components/FlowForm.tsx',
  'src/components/VibeForm.tsx',
  'src/components/HubsPanel.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/value=\{formData\.description\}/g, "value={formData.description || ''}");
    content = content.replace(/value=\{formData\.bio\}/g, "value={formData.bio || ''}");
    // also for HubsPanel, there might be other variables
    fs.writeFileSync(file, content);
  }
}
