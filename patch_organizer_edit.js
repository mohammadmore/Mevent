import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let content = fs.readFileSync('src/components/OrganizerPanel.tsx', 'utf8');

const importOld = `import { Calendar, Users, BarChart3, Edit, Copy, Trash2, Eye, Bookmark, CheckCircle, Ticket, Activity, QrCode, Power, X } from 'lucide-react';`;
const importNew = `import { Calendar, Users, BarChart3, Edit, Copy, Trash2, Eye, Bookmark, CheckCircle, Ticket, Activity, QrCode, Power, X } from 'lucide-react';\nimport EventForm from './EventForm';`;
content = replaceSafely(content, importOld, importNew);

const editEventOld = `                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(event.id, event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'); }}
                        className={\`p-1.5 rounded-lg \${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}\`} title="تغییر وضعیت (انتشار/پیش‌نویس)"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>`;
const editEventNew = `                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="ویرایش"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(event.id, event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'); }}
                        className={\`p-1.5 rounded-lg \${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}\`} title="تغییر وضعیت (انتشار/پیش‌نویس)"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>`;
content = replaceSafely(content, editEventOld, editEventNew);

const renderOld = `      {events.length === 0 ? (`;
const renderNew = `      {editingEvent ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full relative">
          <button 
            onClick={() => setEditingEvent(null)}
            className="absolute top-4 left-4 p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-gray-900">ویرایش رویداد: {editingEvent.title}</h3>
          <EventForm 
            initialData={editingEvent} 
            onSuccess={() => {
              setEditingEvent(null);
              fetchEvents();
            }} 
          />
        </div>
      ) : events.length === 0 ? (`;
content = replaceSafely(content, renderOld, renderNew);

fs.writeFileSync('src/components/OrganizerPanel.tsx', content);
