const fs = require('fs');

const file = 'src/components/PlaceForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add address and imageUrl to initial state
content = content.replace(
  "name: '',\n    description: '',",
  "name: '',\n    description: '',\n    address: '',\n    imageUrl: '',"
);

// Add the inputs in the UI
const inputs = `
        <div>
          <label className="block text-sm text-gray-400 mb-1">آدرس متنی</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.address || ''} 
            onChange={e => setFormData({...formData, address: e.target.value})} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">لینک تصویر (کاور)</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.imageUrl || ''} 
            onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
          />
        </div>
`;

content = content.replace(
  '        <div>\n          <label className="block text-sm text-gray-400 mb-1">نوع کسب‌وکار</label>',
  inputs + '        <div>\n          <label className="block text-sm text-gray-400 mb-1">نوع کسب‌وکار</label>'
);

// Payload fix
content = content.replace(
  "address: location?.address,",
  "address: formData.address || location?.address,"
);

fs.writeFileSync(file, content);
