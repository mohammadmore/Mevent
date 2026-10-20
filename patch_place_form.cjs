const fs = require('fs');
let code = fs.readFileSync('src/components/PlaceForm.tsx', 'utf8');

const target = `<select 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white"
            value={formData.type} 
            onChange={e => setFormData({...formData, type: e.target.value})}
          >`;

const replacement = `<select 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            value={formData.type} 
            onChange={e => setFormData({...formData, type: e.target.value})}
          >`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/PlaceForm.tsx', code);
