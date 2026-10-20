import fs from 'fs';

// 1. Update server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
const adminUsersApi = "app.get('/api/admin/users', async (req, res) => {";
const adminEventsApi = `app.get('/api/admin/events', async (req, res) => {
    try {
      const { db } = await import('./src/db/index.ts');
      const { events, users } = await import('./src/db/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      const allEvents = await db.select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        cost: events.cost,
        status: events.status,
        organizerId: events.organizerId,
        organizerName: users.name,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id));
      
      res.json({ data: allEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admin events' });
    }
  });

  `;

if (!serverContent.includes('/api/admin/events')) {
    serverContent = serverContent.replace(adminUsersApi, adminEventsApi + adminUsersApi);
    fs.writeFileSync('server.ts', serverContent);
}

// 2. Update AdminPanel.tsx
let adminPanelContent = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Imports
adminPanelContent = adminPanelContent.replace(
    "import { Shield, Users, Calendar, Activity, DollarSign } from 'lucide-react';",
    "import { Shield, Users, Calendar, Activity, DollarSign, Edit, X } from 'lucide-react';\nimport EventForm from './EventForm';"
);

// State
adminPanelContent = adminPanelContent.replace(
    "const [users, setUsers] = useState<any[]>([]);",
    "const [users, setUsers] = useState<any[]>([]);\n  const [events, setEvents] = useState<any[]>([]);\n  const [editingEvent, setEditingEvent] = useState<any>(null);\n  const [activeTab, setActiveTab] = useState<'users' | 'events'>('users');"
);

// fetchData
adminPanelContent = adminPanelContent.replace(
    "fetch('/api/admin/users')",
    "fetch('/api/admin/users'),\n        fetch('/api/admin/events')"
);
adminPanelContent = adminPanelContent.replace(
    "const [statsRes, usersRes] = await Promise.all",
    "const [statsRes, usersRes, eventsRes] = await Promise.all"
);
adminPanelContent = adminPanelContent.replace(
    "if (usersRes.ok) {\n        const usersData = await usersRes.json();\n        setUsers(usersData.data);\n      }",
    "if (usersRes.ok) {\n        const usersData = await usersRes.json();\n        setUsers(usersData.data);\n      }\n      if (eventsRes.ok) {\n        const eventsData = await eventsRes.json();\n        setEvents(eventsData.data);\n      }"
);

// Tabs and Event Table
const tabsAndTable = `
      <div className="flex border-b border-gray-200 dark:border-white/10 mb-4">
        <button 
          className={\`px-4 py-2 font-medium text-sm \${activeTab === 'users' ? 'text-teal-600 dark:text-[#d9ff00] border-b-2 border-teal-600 dark:border-[#d9ff00]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}\`}
          onClick={() => setActiveTab('users')}
        >
          مدیریت کاربران
        </button>
        <button 
          className={\`px-4 py-2 font-medium text-sm \${activeTab === 'events' ? 'text-teal-600 dark:text-[#d9ff00] border-b-2 border-teal-600 dark:border-[#d9ff00]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}\`}
          onClick={() => setActiveTab('events')}
        >
          مدیریت رویدادها
        </button>
      </div>

      {activeTab === 'users' ? (
`;

const eventsTable = `
      ) : (
        <div className="space-y-4">
          {editingEvent ? (
            <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 w-full relative">
              <button 
                onClick={() => setEditingEvent(null)}
                className="absolute top-4 left-4 p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">ویرایش رویداد: {editingEvent.title}</h3>
              <EventForm 
                initialData={editingEvent} 
                onSuccess={() => {
                  setEditingEvent(null);
                  fetchData();
                }} 
              />
            </div>
          ) : (
            <div className="bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-100 dark:bg-[#1f1f23] text-gray-300 font-medium border-b border-gray-300 dark:border-white/20">
                    <tr>
                      <th className="px-4 py-3">شناسه</th>
                      <th className="px-4 py-3">عنوان</th>
                      <th className="px-4 py-3">برگزارکننده</th>
                      <th className="px-4 py-3">وضعیت</th>
                      <th className="px-4 py-3">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {events.map(e => (
                      <tr key={e.id} className="hover:bg-gray-100/50 dark:bg-[#1f1f23]/50">
                        <td className="px-4 py-3 text-gray-400 font-mono">{e.id}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{e.title}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.organizerName || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={\`px-2 py-1 rounded-md text-xs font-bold \${
                            e.status === 'PUBLISHED' ? 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00]' : 'bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                          }\`}>
                            {e.status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => setEditingEvent(e)}
                            className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 dark:bg-[#d9ff00]/10 dark:text-[#d9ff00] hover:bg-teal-600/20 dark:hover:bg-[#d9ff00]/20" title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
`;

adminPanelContent = adminPanelContent.replace(
    "<div>\n        <h3 className=\"font-bold text-gray-100 mb-4\">مدیریت کاربران</h3>",
    tabsAndTable
);

adminPanelContent = adminPanelContent.replace(
    "</div>\n      </div>\n    </div>",
    "</div>\n      </div>\n" + eventsTable + "\n    </div>"
);

fs.writeFileSync('src/components/AdminPanel.tsx', adminPanelContent);
console.log('AdminPanel updated.');

