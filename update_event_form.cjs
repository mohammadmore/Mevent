const fs = require('fs');
let code = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const target1 = `<DatePicker
                   format="YYYY/MM/DD HH:mm"
                   calendar={persian}
                   locale={persian_fa}
                   calendarPosition="bottom-right"
                   value={formData.startTime ? new Date(formData.startTime) : null}
                   plugins={[
                     <TimePicker position="bottom" />
                   ]}
                   onChange={(dateObject: any) => {
                     setFormData({ ...formData, startTime: dateObject ? dateObject.toDate().toISOString() : '' });
                   }}
                   render={(value, openCalendar) => (
                     <input
                       readOnly
                       onClick={openCalendar}
                       value={value}
                       className="w-full pl-3 pr-10 py-2.5 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all text-right bg-teal-600/10 dark:bg-[#d9ff00]/10 font-sans cursor-pointer text-gray-900 dark:text-white"
                       dir="rtl"
                       placeholder="انتخاب تاریخ و ساعت"
                     />
                   )}
                 />`;

const replacement1 = `<DatePicker
                   format="YYYY/MM/DD HH:mm"
                   calendar={persian}
                   locale={persian_fa}
                   calendarPosition="bottom-right"
                   value={formData.startTime ? new Date(formData.startTime) : null}
                   disabled={fuzzyType !== 'none'}
                   plugins={[
                     <TimePicker position="bottom" />
                   ]}
                   onChange={(dateObject: any) => {
                     setFormData({ ...formData, startTime: dateObject ? dateObject.toDate().toISOString() : '' });
                   }}
                   render={(value, openCalendar) => (
                     <input
                       readOnly
                       disabled={fuzzyType !== 'none'}
                       onClick={fuzzyType === 'none' ? openCalendar : undefined}
                       value={value}
                       className={\`w-full pl-3 pr-10 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-right font-sans \${fuzzyType !== 'none' ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 cursor-not-allowed' : 'border-teal-600/20 dark:border-[#d9ff00]/20 focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 cursor-pointer text-gray-900 dark:text-white'}\`}
                       dir="rtl"
                       placeholder="انتخاب تاریخ و ساعت"
                     />
                   )}
                 />`;

code = code.replace(target1, replacement1);

const target2 = `<DatePicker
                   format="YYYY/MM/DD HH:mm"
                   calendar={persian}
                   locale={persian_fa}
                   calendarPosition="bottom-right"
                   value={formData.endTime ? new Date(formData.endTime) : null}
                   plugins={[
                     <TimePicker position="bottom" />
                   ]}
                   onChange={(dateObject: any) => {
                     setFormData({ ...formData, endTime: dateObject ? dateObject.toDate().toISOString() : '' });
                   }}
                   render={(value, openCalendar) => (
                     <input
                       readOnly
                       onClick={openCalendar}
                       value={value}
                       className="w-full pl-3 pr-10 py-2.5 border-2 border-teal-600/20 dark:border-[#d9ff00]/20 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none transition-all text-right bg-teal-600/10 dark:bg-[#d9ff00]/10 font-sans cursor-pointer text-gray-900 dark:text-white"
                       dir="rtl"
                       placeholder="انتخاب تاریخ و ساعت"
                     />
                   )}
                 />`;

const replacement2 = `<DatePicker
                   format="YYYY/MM/DD HH:mm"
                   calendar={persian}
                   locale={persian_fa}
                   calendarPosition="bottom-right"
                   value={formData.endTime ? new Date(formData.endTime) : null}
                   disabled={fuzzyType !== 'none'}
                   plugins={[
                     <TimePicker position="bottom" />
                   ]}
                   onChange={(dateObject: any) => {
                     setFormData({ ...formData, endTime: dateObject ? dateObject.toDate().toISOString() : '' });
                   }}
                   render={(value, openCalendar) => (
                     <input
                       readOnly
                       disabled={fuzzyType !== 'none'}
                       onClick={fuzzyType === 'none' ? openCalendar : undefined}
                       value={value}
                       className={\`w-full pl-3 pr-10 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-right font-sans \${fuzzyType !== 'none' ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 cursor-not-allowed' : 'border-teal-600/20 dark:border-[#d9ff00]/20 focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 cursor-pointer text-gray-900 dark:text-white'}\`}
                       dir="rtl"
                       placeholder="انتخاب تاریخ و ساعت"
                     />
                   )}
                 />`;

code = code.replace(target2, replacement2);

const target3 = `<div className="mt-4 bg-teal-50/50 dark:bg-white/5 p-4 rounded-xl border border-teal-100 dark:border-white/10">
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

const replacement3 = `<div className="mb-4">
             <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
               <input 
                 type="checkbox" 
                 className="w-4 h-4 text-teal-600 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 focus:ring-teal-500"
                 checked={fuzzyType !== 'none'}
                 onChange={(e) => {
                   if (e.target.checked) {
                     setFuzzyType('year');
                     setFormData({...formData, startTime: '', endTime: ''});
                   } else {
                     setFuzzyType('none');
                   }
                 }}
               />
               تاریخ دقیق مشخص نیست (ثبت زمان تقریبی)
             </label>
          </div>
          
          {fuzzyType !== 'none' && (
             <div className="mt-4 bg-teal-50/50 dark:bg-white/5 p-4 rounded-xl border border-teal-100 dark:border-white/10">
               <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                 رویدادهایی که تاریخ حدودی دارند، اولویت پایین‌تری خواهند داشت. بلافاصله بعد از مشخص شدن تاریخ دقیق رویداد، این بخش را ویرایش کنید.
               </p>
               
               <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                 <button type="button" onClick={() => setFuzzyType('year')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'year' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>سال</button>
                 <button type="button" onClick={() => setFuzzyType('season')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'season' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>فصل</button>
                 <button type="button" onClick={() => setFuzzyType('month')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'month' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>ماه</button>
                 <button type="button" onClick={() => setFuzzyType('custom')} className={\`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${fuzzyType === 'custom' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}\`}>متن دلخواه</button>
               </div>

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
            </div>
          )}`;

code = code.replace(target3, replacement3);
fs.writeFileSync('src/components/EventForm.tsx', code);
