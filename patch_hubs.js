import fs from 'fs';
let content = fs.readFileSync('src/components/HubsPanel.tsx', 'utf8');

const targetState = `  const [description, setDescription] = useState('');
  const [type, setType] = useState('عمومی');
  const [isSubmitting, setIsSubmitting] = useState(false);`;

const replState = `  const [description, setDescription] = useState('');
  const [type, setType] = useState('عمومی');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };`;

content = content.replace(targetState, replState);

const targetSubmit = `body: JSON.stringify({ name, description, type, ownerId: dbUserId })`;
const replSubmit = `body: JSON.stringify({ name, description, type, imageUrl, ownerId: dbUserId })`;
content = content.replace(targetSubmit, replSubmit);

const targetForm = `          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">نوع جامعه</label>`;

const replForm = `          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">تصویر پروفایل جامعه (اختیاری)</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-gray-200">
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-colors"
                  disabled={isUploading}
                />
                {isUploading && <p className="text-xs text-indigo-600 mt-2 font-medium">در حال آپلود...</p>}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">نوع جامعه</label>`;

content = content.replace(targetForm, replForm);

const targetDetailIcon = `<div className="w-24 h-24 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 shadow-inner">
            <Users className="w-12 h-12" />
          </div>`;
          
const replDetailIcon = `<div className="w-24 h-24 bg-indigo-50 rounded-2xl overflow-hidden flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 shadow-inner">
            {selectedHub.imageUrl ? (
               <img src={selectedHub.imageUrl} alt={selectedHub.name} className="w-full h-full object-cover" />
            ) : (
               <Users className="w-12 h-12" />
            )}
          </div>`;
content = content.replace(targetDetailIcon, replDetailIcon);

const targetListIcon = `<div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <Users className="w-10 h-10" />
              </div>`;

const replListIcon = `<div className="w-20 h-20 bg-indigo-50 rounded-full overflow-hidden flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 group-hover:border-4 group-hover:border-indigo-100 transition-all duration-300 shadow-inner">
                {hub.imageUrl ? (
                   <img src={hub.imageUrl} alt={hub.name} className="w-full h-full object-cover" />
                ) : (
                   <Users className="w-10 h-10" />
                )}
              </div>`;
content = content.replace(targetListIcon, replListIcon);

fs.writeFileSync('src/components/HubsPanel.tsx', content);
