import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let content = fs.readFileSync('src/components/OrganizerPanel.tsx', 'utf8');

const importOld = `import EventForm from './EventForm';`;
const importNew = `import EventForm from './EventForm';
import { useToast, ToastContainer } from './Toast';`;
content = replaceSafely(content, importOld, importNew);

const componentOld = `export default function OrganizerPanel({ userId }: OrganizerPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);`;
const componentNew = `export default function OrganizerPanel({ userId }: OrganizerPanelProps) {
  const { toasts, addToast, removeToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);`;
content = replaceSafely(content, componentOld, componentNew);

const toggleStatusOld = `      const res = await fetch(\`/api/events/\${id}/status\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchEvents();
      }`;
const toggleStatusNew = `      const res = await fetch(\`/api/events/\${id}/status\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchEvents();
        addToast(\`وضعیت رویداد به \${status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'} تغییر یافت\`, 'success');
      }`;
content = replaceSafely(content, toggleStatusOld, toggleStatusNew);

const deleteEventOld = `      const res = await fetch(\`/api/events/\${id}\`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        if (selectedEventId === id) setSelectedEventId(null);
      }`;
const deleteEventNew = `      const res = await fetch(\`/api/events/\${id}\`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        if (selectedEventId === id) setSelectedEventId(null);
        addToast('رویداد با موفقیت حذف شد', 'info');
      }`;
content = replaceSafely(content, deleteEventOld, deleteEventNew);

const renderOld = `return (
    <div className="space-y-6">`;
const renderNew = `return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />`;
content = replaceSafely(content, renderOld, renderNew);

fs.writeFileSync('src/components/OrganizerPanel.tsx', content);
