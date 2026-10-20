const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const target = `              <div className="p-6">
                <button onClick={() => setEditingPlace(null)} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-4 h-4" /> انصراف
                </button>
                <h3 className="font-bold mb-4">ویرایش پاتوق: {editingPlace.name}</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" value={editingPlace.name} onChange={e => setEditingPlace({...editingPlace, name: e.target.value})} className="p-2 border rounded" placeholder="نام" />
                  
                  <select value={editingPlace.type} onChange={e => setEditingPlace({...editingPlace, type: e.target.value})} className="p-2 border rounded text-gray-900 bg-white dark:bg-[#18181b] dark:text-white border-gray-300 dark:border-white/20">
                    <option value="کافه">کافه</option>
                    <option value="رستوران">رستوران</option>
                    <option value="فضای کار اشتراکی">فضای کار اشتراکی</option>
                    <option value="گالری">گالری</option>
                    <option value="پارک">پارک</option>
                    <option value="سینما">سینما</option>
                    <option value="سالن تئاتر">سالن تئاتر</option>
                    <option value="موزه">موزه</option>
                    <option value="باشگاه">باشگاه</option>
                    <option value="کتابخانه">کتابخانه</option>
                    <option value="آموزشگاه">آموزشگاه</option>
                    <option value="سایر">سایر</option>
                  </select>
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
              </div>`;

const rep = `              <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 w-full relative">
                <button
                  onClick={() => setEditingPlace(null)}
                  className="absolute top-4 left-4 p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">ویرایش پاتوق: {editingPlace.name}</h3>
                <PlaceForm
                  isAdmin={true}
                  initialData={editingPlace}
                  onSuccess={() => {
                    setEditingPlace(null);
                    fetchData();
                  }}
                />
              </div>`;

code = code.replace(target, rep);

// import PlaceForm if not already imported
if (!code.includes("import PlaceForm")) {
  code = code.replace("import EventForm from './EventForm';", "import EventForm from './EventForm';\\nimport PlaceForm from './PlaceForm';");
}

fs.writeFileSync('src/components/AdminPanel.tsx', code);
