import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/components/OrganizerPanel.tsx', 'utf8');

const importOld = `import { Calendar, Users, BarChart3, Edit, Copy, Trash2, Eye, Bookmark, CheckCircle, Ticket, Activity } from 'lucide-react';`;
const importNew = `import { Calendar, Users, BarChart3, Edit, Copy, Trash2, Eye, Bookmark, CheckCircle, Ticket, Activity, QrCode, Power, X } from 'lucide-react';`;
appContent = replaceSafely(appContent, importOld, importNew);

const stateOld = `const [statsLoading, setStatsLoading] = useState(false);`;
const stateNew = `const [statsLoading, setStatsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);`;
appContent = replaceSafely(appContent, stateOld, stateNew);


const actionsOld = `<div className="flex gap-1">
                      <button className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"><Copy className="w-3.5 h-3.5" /></button>
                    </div>`;

const actionsNew = `<div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(event.id, event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'); }}
                        className={\`p-1.5 rounded-lg \${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}\`} title="تغییر وضعیت (انتشار/پیش‌نویس)"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>`;
appContent = replaceSafely(appContent, actionsOld, actionsNew);


const fetchEventsOld = `const fetchEvents = async () => {`;
const newMethods = `const toggleStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(\`/api/events/\${id}/status\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('آیا از حذف این رویداد مطمئن هستید؟')) return;
    try {
      const res = await fetch(\`/api/events/\${id}\`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        if (selectedEventId === id) setSelectedEventId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEvents = async () => {`;
appContent = replaceSafely(appContent, fetchEventsOld, newMethods);

const qrButtonOld = `<button className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-md">اسکن QR Code</button>`;
const qrButtonNew = `<button onClick={() => setShowScanner(true)} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2">
                          <QrCode className="w-4 h-4" /> اسکن QR Code
                        </button>`;
appContent = replaceSafely(appContent, qrButtonOld, qrButtonNew);

const renderOld = `return (
    <div className="space-y-6">`;
const renderNew = `return (
    <div className="space-y-6">
      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">اسکن بلیت (QR Code)</h3>
              <button onClick={() => setShowScanner(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center bg-gray-50 min-h-[300px]">
              <div className="w-48 h-48 border-2 border-indigo-500 border-dashed rounded-2xl flex items-center justify-center relative overflow-hidden mb-4">
                <QrCode className="w-16 h-16 text-indigo-300" />
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
              <p className="text-gray-500 text-sm text-center">دوربین را مقابل بارکد بلیت شرکت‌کننده قرار دهید</p>
            </div>
          </div>
        </div>
      )}`;
appContent = replaceSafely(appContent, renderOld, renderNew);


fs.writeFileSync('src/components/OrganizerPanel.tsx', appContent);
