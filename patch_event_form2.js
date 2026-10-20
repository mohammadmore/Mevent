import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const targetImport = `import { MapPin, Calendar, CreditCard, Tag, FileText, Type, Image as ImageIcon, Upload, FileSpreadsheet, Info } from 'lucide-react';`;
const replImport = `import { MapPin, Calendar, Clock, CreditCard, Tag, FileText, Type, Image as ImageIcon, Upload, FileSpreadsheet, Info } from 'lucide-react';`;
content = content.replace(targetImport, replImport);

const targetState = `    startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : '',
    address: initialData?.address || '',`;
const replState = `    startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : '',
    endTime: initialData?.endTime ? new Date(initialData.endTime).toISOString().slice(0, 16) : '',
    address: initialData?.address || '',`;
content = content.replace(targetState, replState);

const targetStateHooks = `  const [formData, setFormData] = useState({`;
const replStateHooks = `  const [sameDay, setSameDay] = useState(
    initialData?.endTime && initialData?.startTime 
      ? new Date(initialData.endTime).toISOString().slice(0,10) === new Date(initialData.startTime).toISOString().slice(0,10)
      : true
  );
  
  useEffect(() => {
    // Keep date part of endTime synced if sameDay is true and startTime changes
    if (sameDay && formData?.startTime) {
      const startDate = formData.startTime.split('T')[0];
      setFormData(prev => {
        if (!prev.endTime) return { ...prev, endTime: \`\${startDate}T23:59\` };
        const timePart = prev.endTime.includes('T') ? prev.endTime.split('T')[1] : prev.endTime;
        return { ...prev, endTime: \`\${startDate}T\${timePart}\` };
      });
    }
  }, [formData?.startTime, sameDay]);
  
  const [formData, setFormData] = useState({`;
content = content.replace(targetStateHooks, replStateHooks);

const targetSubmit = `          startTime: formData.startTime,
          cost: Number(formData.cost),`;
const replSubmit = `          startTime: formData.startTime,
          endTime: formData.endTime,
          cost: Number(formData.cost),`;
content = content.replace(targetSubmit, replSubmit);

const targetHtml = `      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">زمان برگزاری</label>
        <div className="relative">
          <input
            required
            type="datetime-local"
            className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left"
            dir="ltr"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
          <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
      </div>`;
const replHtml = `      <div>
        <div className="flex items-center justify-between mb-2">
           <label className="block text-sm font-medium text-gray-700 mb-1">زمان برگزاری</label>
           <div className="flex items-center gap-2">
             <input 
                type="checkbox" 
                id="sameDay" 
                checked={sameDay} 
                onChange={(e) => setSameDay(e.target.checked)} 
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
             />
             <label htmlFor="sameDay" className="text-sm font-medium text-gray-600 cursor-pointer">پایان در همان روز</label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute right-3 -top-2.5 bg-white px-1 text-xs font-semibold text-indigo-600 z-10">شروع</span>
            <input
              required
              type="datetime-local"
              className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left bg-indigo-50/30"
              dir="ltr"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <Calendar className="absolute right-3 top-3 w-5 h-5 text-indigo-400" />
          </div>

          <div className="relative">
            <span className="absolute right-3 -top-2.5 bg-white px-1 text-xs font-semibold text-indigo-600 z-10">پایان</span>
            {sameDay ? (
               <input
                 required
                 type="time"
                 className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left bg-indigo-50/30"
                 dir="ltr"
                 value={formData.endTime && formData.endTime.includes('T') ? formData.endTime.split('T')[1] : formData.endTime}
                 onChange={(e) => {
                    const time = e.target.value;
                    const datePart = formData.startTime ? formData.startTime.split('T')[0] : '';
                    if (datePart && time) {
                       setFormData({ ...formData, endTime: \`\${datePart}T\${time}\` });
                    } else if (time) {
                       setFormData({ ...formData, endTime: time });
                    }
                 }}
                 disabled={!formData.startTime}
               />
            ) : (
               <input
                 required
                 type="datetime-local"
                 className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left bg-indigo-50/30"
                 dir="ltr"
                 value={formData.endTime}
                 onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
               />
            )}
            <Clock className="absolute right-3 top-3 w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </div>`;
content = content.replace(targetHtml, replHtml);

fs.writeFileSync('src/components/EventForm.tsx', content);
