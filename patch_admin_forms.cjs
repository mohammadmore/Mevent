const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// replace chains inline form
code = code.replace(
  `              <div className="p-6">
                <button onClick={() => setEditingChain(null)} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-4 h-4" /> انصراف
                </button>
                <h3 className="font-bold mb-4">ویرایش فستیوال: {editingChain.name}</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" value={editingChain.name} onChange={e => setEditingChain({...editingChain, name: e.target.value})} className="p-2 border rounded" placeholder="نام" />
                  <input type="text" value={editingChain.coverImage || ''} onChange={e => setEditingChain({...editingChain, coverImage: e.target.value})} className="p-2 border rounded" placeholder="لینک عکس" />
                  <textarea value={editingChain.description || ''} onChange={e => setEditingChain({...editingChain, description: e.target.value})} className="p-2 border rounded" placeholder="توضیحات"></textarea>
                  <button onClick={async () => {
                    await fetch(\`/api/admin/chains/\${editingChain.id}\`, {
                      method: 'PUT',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify(editingChain)
                    });
                    setEditingChain(null);
                    fetchData();
                  }} className="bg-teal-600 text-white p-2 rounded">ذخیره</button>
                </div>
              </div>`,
  `              <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 w-full relative">
                <button onClick={() => setEditingChain(null)} className="absolute top-4 left-4 p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">ویرایش فستیوال: {editingChain.name}</h3>
                <ChainForm isAdmin={true} initialData={editingChain} onSuccess={() => { setEditingChain(null); fetchData(); }} />
              </div>`
);

// replace vibes inline form
code = code.replace(
  `              <div className="p-6">
                <button onClick={() => setEditingVibe(null)} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-4 h-4" /> انصراف
                </button>
                <h3 className="font-bold mb-4">ویرایش حال و هوا: {editingVibe.title}</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" value={editingVibe.title} onChange={e => setEditingVibe({...editingVibe, title: e.target.value})} className="p-2 border rounded" placeholder="عنوان" />
                  <input type="text" value={editingVibe.areaName || ''} onChange={e => setEditingVibe({...editingVibe, areaName: e.target.value})} className="p-2 border rounded" placeholder="محدوده" />
                  <input type="text" value={editingVibe.bestTimeToExperience || ''} onChange={e => setEditingVibe({...editingVibe, bestTimeToExperience: e.target.value})} className="p-2 border rounded" placeholder="بهترین زمان" />
                  <textarea value={editingVibe.description || ''} onChange={e => setEditingVibe({...editingVibe, description: e.target.value})} className="p-2 border rounded" placeholder="توضیحات"></textarea>
                  <button onClick={async () => {
                    await fetch(\`/api/admin/vibes/\${editingVibe.id}\`, {
                      method: 'PUT',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify(editingVibe)
                    });
                    setEditingVibe(null);
                    fetchData();
                  }} className="bg-teal-600 text-white p-2 rounded">ذخیره</button>
                </div>
              </div>`,
  `              <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 w-full relative">
                <button onClick={() => setEditingVibe(null)} className="absolute top-4 left-4 p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">ویرایش حال و هوا: {editingVibe.title}</h3>
                <VibeForm isAdmin={true} initialData={editingVibe} onSuccess={() => { setEditingVibe(null); fetchData(); }} />
              </div>`
);

// replace flows inline form
code = code.replace(
  `              <div className="p-6">
                <button onClick={() => setEditingFlow(null)} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-4 h-4" /> انصراف
                </button>
                <h3 className="font-bold mb-4">ویرایش جریان: {editingFlow.title}</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" value={editingFlow.title} onChange={e => setEditingFlow({...editingFlow, title: e.target.value})} className="p-2 border rounded" placeholder="عنوان" />
                  <input type="text" value={editingFlow.coverImage || ''} onChange={e => setEditingFlow({...editingFlow, coverImage: e.target.value})} className="p-2 border rounded" placeholder="لینک عکس" />
                  <textarea value={editingFlow.description || ''} onChange={e => setEditingFlow({...editingFlow, description: e.target.value})} className="p-2 border rounded" placeholder="توضیحات"></textarea>
                  <button onClick={async () => {
                    await fetch(\`/api/admin/flows/\${editingFlow.id}\`, {
                      method: 'PUT',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify(editingFlow)
                    });
                    setEditingFlow(null);
                    fetchData();
                  }} className="bg-teal-600 text-white p-2 rounded">ذخیره</button>
                </div>
              </div>`,
  `              <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 w-full relative">
                <button onClick={() => setEditingFlow(null)} className="absolute top-4 left-4 p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">ویرایش جریان: {editingFlow.title}</h3>
                <FlowForm isAdmin={true} initialData={editingFlow} onSuccess={() => { setEditingFlow(null); fetchData(); }} />
              </div>`
);

// update imports
code = code.replace(
  "import PlaceForm from './PlaceForm';",
  "import PlaceForm from './PlaceForm';\\nimport ChainForm from './ChainForm';\\nimport VibeForm from './VibeForm';\\nimport FlowForm from './FlowForm';"
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
