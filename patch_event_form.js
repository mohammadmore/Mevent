import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const targetState = `  const [location, setLocation] = useState<{lat: number, lng: number} | null>(initialData?.lat && initialData?.lng ? {lat: initialData.lat, lng: initialData.lng} : null);
  const [formData, setFormData] = useState({`;

const replState = `  const [location, setLocation] = useState<{lat: number, lng: number} | null>(initialData?.lat && initialData?.lng ? {lat: initialData.lat, lng: initialData.lng} : null);
  const [hubs, setHubs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/hubs').then(res => res.json()).then(data => setHubs(data.data || []));
  }, []);
  const [formData, setFormData] = useState({
    hubId: initialData?.hubId || '',`;

content = content.replace(targetState, replState);

const targetInput = `      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">هزینه (تومان)</label>
        <div className="relative">`;

const replInput = `      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">جامعه (اختیاری)</label>
        <div className="relative mb-3">
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all appearance-none"
            value={formData.hubId}
            onChange={(e) => setFormData({ ...formData, hubId: e.target.value })}
          >
            <option value="">-- انتخاب جامعه --</option>
            {hubs.map(hub => (
              <option key={hub.id} value={hub.id}>{hub.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">هزینه (تومان)</label>
        <div className="relative">`;

content = content.replace(targetInput, replInput);

// Also need to add useEffect to imports if not there.
if (!content.includes('useEffect')) {
    content = content.replace('import React, { useState, FormEvent }', 'import React, { useState, useEffect, FormEvent }');
}

// In handleSubmit
const targetSubmit = `        body: JSON.stringify({ ...formData, organizerId: userId, lat: location?.lat, lng: location?.lng })`;
const replSubmit = `        body: JSON.stringify({ ...formData, organizerId: userId, lat: location?.lat, lng: location?.lng, hubId: formData.hubId ? parseInt(formData.hubId) : null })`;
content = content.replace(targetSubmit, replSubmit);
content = content.replace(targetSubmit, replSubmit); // For the second match just in case

fs.writeFileSync('src/components/EventForm.tsx', content);
