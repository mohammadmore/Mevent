const fs = require('fs');
let code = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const cityHtml = `
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شهر</label>
        <div className="relative">
          <input
            required
            type="text"
            className="w-full pl-3 pr-10 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
            placeholder="مثلا: تهران"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <MapPin className="absolute right-3 top-2.5 w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
      </div>
`;

code = code.replace(
  /<label className="block text-sm font-medium text-gray-700 mb-1">عنوان رویداد<\/label>/,
  `
${cityHtml}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان رویداد</label>`
);

fs.writeFileSync('src/components/EventForm.tsx', code);
