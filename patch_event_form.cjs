const fs = require('fs');

let code = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const target1 = '  const [showAdvancedDetailsModal, setShowAdvancedDetailsModal] = useState(false);';
const replacement1 = `  const [showAdvancedDetailsModal, setShowAdvancedDetailsModal] = useState(false);

  const initialFuzzyTimeParsed = useMemo(() => {
    try {
      if (initialData?.fuzzyTime?.startsWith('{')) {
        return JSON.parse(initialData.fuzzyTime);
      }
    } catch {}
    return null;
  }, [initialData?.fuzzyTime]);

  const [fuzzyType, setFuzzyType] = useState<'none' | 'year' | 'season' | 'month' | 'custom'>(
    initialFuzzyTimeParsed?.type || (initialData?.fuzzyTime && !initialData?.fuzzyTime?.startsWith('{') ? 'custom' : 'none')
  );
  const [fuzzyYear, setFuzzyYear] = useState<string>(initialFuzzyTimeParsed?.year?.toString() || '');
  const [fuzzyValue, setFuzzyValue] = useState<string>(initialFuzzyTimeParsed?.value?.toString() || '');

  useEffect(() => {
    if (fuzzyType === 'none') {
      setFormData(prev => ({ ...prev, fuzzyTime: '' }));
    } else if (fuzzyType === 'custom') {
      // Allow manual edits via text input
    } else {
      if (fuzzyYear) {
        let label = fuzzyYear;
        if (fuzzyType === 'season' && fuzzyValue) {
          const seasons = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
          label = \`\${seasons[parseInt(fuzzyValue) - 1]} \${fuzzyYear}\`;
        } else if (fuzzyType === 'month' && fuzzyValue) {
          const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
          label = \`\${months[parseInt(fuzzyValue) - 1]} \${fuzzyYear}\`;
        }
        setFormData(prev => ({ 
          ...prev, 
          fuzzyTime: JSON.stringify({ type: fuzzyType, year: parseInt(fuzzyYear), value: parseInt(fuzzyValue) || null, label }) 
        }));
      }
    }
  }, [fuzzyType, fuzzyYear, fuzzyValue]);
`;

code = code.replace(target1, replacement1);

const target2 = `<div className="mt-4">
             <label className="block text-xs text-gray-500 mb-1">یا حدود زمان رویداد (مثل: تابستان ۱۴۰۵)</label>
             <input
               type="text"
               value={formData.fuzzyTime || ''}
               onChange={(e) => setFormData({...formData, fuzzyTime: e.target.value})}
               className="w-full px-3 py-2 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all text-right bg-teal-600/10 dark:bg-[#d9ff00]/10 text-gray-900 dark:text-white"
               placeholder="مثلا: تیرماه ۱۴۰۵"
             />
          </div>`;
          
const replacement2 = `<div className="mt-4 bg-teal-50/50 dark:bg-white/5 p-4 rounded-xl border border-teal-100 dark:border-white/10">
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">زمان تقریبی (اختیاری)</label>
             <p className="text-xs text-gray-500 mb-4 leading-relaxed">
               رویدادهایی که تاریخ حدودی دارند، اولویت پایین‌تری خواهند داشت. بلافاصله بعد از مشخص شدن تاریخ دقیق رویداد، این بخش را ویرایش کنید.
             </p>
             
             <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
               <button type="button" onClick={() => setFuzzyType('none')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'none' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>بدون زمان تقریبی</button>
               <button type="button" onClick={() => setFuzzyType('year')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'year' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>سال</button>
               <button type="button" onClick={() => setFuzzyType('season')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'season' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>فصل</button>
               <button type="button" onClick={() => setFuzzyType('month')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'month' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>ماه</button>
               <button type="button" onClick={() => setFuzzyType('custom')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'custom' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>متن دلخواه</button>
             </div>

             {fuzzyType !== 'none' && (
               <div className="flex gap-3">
                 {fuzzyType !== 'custom' && (
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
                 )}
               </div>
             )}
          </div>`;
          
code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/EventForm.tsx', code);
