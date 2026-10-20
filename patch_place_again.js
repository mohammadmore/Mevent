const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /<div className="p-6">[\s\S]*?setEditingPlace\(null\)[\s\S]*?fetchData\(\);[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replacement = `<div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 w-full relative">
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

if (code.includes('setEditingPlace(null)')) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminPanel.tsx', code);
    console.log("Success");
}
