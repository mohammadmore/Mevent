const fs = require('fs');
let code = fs.readFileSync('src/components/PlaceForm.tsx', 'utf8');

const cityHtml = `        <div>
          <label className="block text-sm text-gray-400 mb-1">شهر</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white" 
            value={formData.city || 'تهران'} 
            onChange={e => setFormData({...formData, city: e.target.value})} 
            required
          />
        </div>
`;

code = code.replace(
  /<label className="block text-sm text-gray-400 mb-1">نام پاتوق<\/label>/,
  `
${cityHtml}
        <div>
          <label className="block text-sm text-gray-400 mb-1">نام پاتوق</label>`
);

fs.writeFileSync('src/components/PlaceForm.tsx', code);
