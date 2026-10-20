const fs = require('fs');
let code = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

code = code.replace(
  '<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">زمان رویداد (دقیق یا حدود زمان)</label>',
  '<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">زمان رویداد</label>'
);

const targetButtons = `<button type="button" onClick={() => setFuzzyType('month')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'month' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>ماه</button>
                 <button type="button" onClick={() => setFuzzyType('custom')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'custom' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>متن دلخواه</button>`;

const repButtons = `<button type="button" onClick={() => setFuzzyType('month')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'month' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>ماه</button>`;

code = code.replace(targetButtons, repButtons);

const targetInputs = `{fuzzyType !== 'custom' && (
                   <input
                     type="number"
                     placeholder="سال (مثلا ۱۴۰۳)"
                     value={fuzzyYear}
                     onChange={(e) => setFuzzyYear(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   />
                 )}
                 
                 {fuzzyType === 'season' && (
                   <select
                     value={fuzzyValue}
                     onChange={(e) => setFuzzyValue(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   >
                     <option value="" disabled>انتخاب فصل...</option>
                     <option value="1">بهار</option>
                     <option value="2">تابستان</option>
                     <option value="3">پاییز</option>
                     <option value="4">زمستان</option>
                   </select>
                 )}

                 {fuzzyType === 'month' && (
                   <select
                     value={fuzzyValue}
                     onChange={(e) => setFuzzyValue(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   >
                     <option value="" disabled>انتخاب ماه...</option>
                     {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'].map((m, i) => (
                       <option key={i+1} value={i+1}>{m}</option>
                     ))}
                   </select>
                 )}

                 {fuzzyType === 'custom' && (
                   <input
                     type="text"
                     value={formData.fuzzyTime || ''}
                     onChange={(e) => setFormData({...formData, fuzzyTime: e.target.value})}
                     className="w-full px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                     placeholder="مثلا: اواخر سال ۱۴۰۳"
                   />
                 )}`;

const repInputs = `<input
                     type="number"
                     placeholder="سال (مثلا ۱۴۰۳)"
                     value={fuzzyYear}
                     onChange={(e) => setFuzzyYear(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   />
                 
                 {fuzzyType === 'season' && (
                   <select
                     value={fuzzyValue}
                     onChange={(e) => setFuzzyValue(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   >
                     <option value="" disabled>انتخاب فصل...</option>
                     <option value="1">بهار</option>
                     <option value="2">تابستان</option>
                     <option value="3">پاییز</option>
                     <option value="4">زمستان</option>
                   </select>
                 )}

                 {fuzzyType === 'month' && (
                   <select
                     value={fuzzyValue}
                     onChange={(e) => setFuzzyValue(e.target.value)}
                     className="w-1/2 px-3 py-2 border border-teal-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                   >
                     <option value="" disabled>انتخاب ماه...</option>
                     {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'].map((m, i) => (
                       <option key={i+1} value={i+1}>{m}</option>
                     ))}
                   </select>
                 )}`;

code = code.replace(targetInputs, repInputs);

fs.writeFileSync('src/components/EventForm.tsx', code);
