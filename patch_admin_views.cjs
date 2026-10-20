const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const target = `            )}
          </div>
        )}
      </div>
    </div>
  );
}`;

const rep = `            )}
          </div>
        ) : activeTab === 'places' ? (
          <div className="bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingPlace ? (
              <div className="p-6">
                <button onClick={() => setEditingPlace(null)} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-4 h-4" /> انصراف
                </button>
                <h3 className="font-bold mb-4">ویرایش پاتوق: {editingPlace.name}</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" value={editingPlace.name} onChange={e => setEditingPlace({...editingPlace, name: e.target.value})} className="p-2 border rounded" placeholder="نام" />
                  <input type="text" value={editingPlace.type} onChange={e => setEditingPlace({...editingPlace, type: e.target.value})} className="p-2 border rounded" placeholder="نوع" />
                  <input type="text" value={editingPlace.address || ''} onChange={e => setEditingPlace({...editingPlace, address: e.target.value})} className="p-2 border rounded" placeholder="آدرس" />
                  <input type="text" value={editingPlace.imageUrl || ''} onChange={e => setEditingPlace({...editingPlace, imageUrl: e.target.value})} className="p-2 border rounded" placeholder="لینک عکس" />
                  <textarea value={editingPlace.description || ''} onChange={e => setEditingPlace({...editingPlace, description: e.target.value})} className="p-2 border rounded" placeholder="توضیحات"></textarea>
                  <button onClick={async () => {
                    await fetch(\`/api/admin/places/\${editingPlace.id}\`, {
                      method: 'PUT',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify(editingPlace)
                    });
                    setEditingPlace(null);
                    fetchData();
                  }} className="bg-teal-600 text-white p-2 rounded">ذخیره</button>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 dark:bg-[#1f1f23] text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">نام</th><th className="px-4 py-3">نوع</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {places.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.type}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingPlace(p)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'chains' ? (
          <div className="bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingChain ? (
              <div className="p-6">
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
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 dark:bg-[#1f1f23] text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">نام</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {chains.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingChain(c)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'vibes' ? (
          <div className="bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingVibe ? (
              <div className="p-6">
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
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 dark:bg-[#1f1f23] text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">عنوان</th><th className="px-4 py-3">محدوده</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {vibes.map(v => (
                    <tr key={v.id}>
                      <td className="px-4 py-3">{v.title}</td>
                      <td className="px-4 py-3">{v.areaName}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingVibe(v)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'flows' ? (
          <div className="bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-sm">
            {editingFlow ? (
              <div className="p-6">
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
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 dark:bg-[#1f1f23] text-gray-300 font-medium">
                  <tr><th className="px-4 py-3">عنوان</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {flows.map(f => (
                    <tr key={f.id}>
                      <td className="px-4 py-3">{f.title}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingFlow(f)} className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 mx-auto"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}`;

code = code.replace(target, rep);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
