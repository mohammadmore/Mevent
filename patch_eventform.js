import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const exportOld = `export default function EventForm({ onSuccess }: { onSuccess: () => void }) {`;
const exportNew = `export default function EventForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {`;
content = replaceSafely(content, exportOld, exportNew);


const stateOld = `  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    address: '',
    cost: 0,
  });`;

const stateNew = `  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : '',
    address: initialData?.address || '',
    cost: initialData?.cost || 0,
  });
  
  // Update location if initialData has it
  useState(() => {
    if (initialData?.lat && initialData?.lng) {
      setLocation({ lat: initialData.lat, lng: initialData.lng });
    }
  });`;
content = replaceSafely(content, stateOld, stateNew);

const submitOld = `      const res = await fetch('/api/events', {
        method: 'POST',`;
const submitNew = `      const res = await fetch(initialData ? \`/api/events/\${initialData.id}\` : '/api/events', {
        method: initialData ? 'PUT' : 'POST',`;
content = replaceSafely(content, submitOld, submitNew);

const submitTextOld = `<span className="font-bold">{loading ? 'در حال ثبت...' : 'ثبت نهایی رویداد'}</span>`;
const submitTextNew = `<span className="font-bold">{loading ? (initialData ? 'در حال ویرایش...' : 'در حال ثبت...') : (initialData ? 'ویرایش رویداد' : 'ثبت نهایی رویداد')}</span>`;
content = replaceSafely(content, submitTextOld, submitTextNew);


fs.writeFileSync('src/components/EventForm.tsx', content);
