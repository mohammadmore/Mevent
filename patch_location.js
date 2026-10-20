import fs from 'fs';

let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const oldLoc = `const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);`;
const newLoc = `const [location, setLocation] = useState<{lat: number, lng: number} | null>(initialData?.lat && initialData?.lng ? {lat: initialData.lat, lng: initialData.lng} : null);`;
content = content.replace(oldLoc, newLoc);

const oldHook = `  // Update location if initialData has it
  useState(() => {
    if (initialData?.lat && initialData?.lng) {
      setLocation({ lat: initialData.lat, lng: initialData.lng });
    }
  });`;
content = content.replace(oldHook, '');

fs.writeFileSync('src/components/EventForm.tsx', content);
