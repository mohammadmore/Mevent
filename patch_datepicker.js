import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const importTarget = `import readXlsxFile from 'read-excel-file/browser';`;
const importRepl = `import readXlsxFile from 'read-excel-file/browser';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";`;

content = content.replace(importTarget, importRepl);

const targetStart = `<input
              required
              type="datetime-local"
              className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left bg-indigo-50/30"
              dir="ltr"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />`;
const replStart = `<DatePicker
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD HH:mm"
              plugins={[<TimePicker hideSeconds />]}
              value={formData.startTime ? new Date(formData.startTime) : ""}
              onChange={(date: any) => {
                if (date) {
                  const localDate = date.toDate();
                  const isoString = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                  setFormData({ ...formData, startTime: isoString });
                } else {
                  setFormData({ ...formData, startTime: "" });
                }
              }}
              render={(value, openCalendar) => (
                <input
                  required
                  readOnly
                  onClick={openCalendar}
                  value={value}
                  className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-right bg-indigo-50/30 font-sans cursor-pointer"
                  dir="rtl"
                  placeholder="انتخاب تاریخ و ساعت"
                />
              )}
            />`;

content = content.replace(targetStart, replStart);

const targetEndSameDay = `<input
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
               />`;

const replEndSameDay = `<DatePicker
                 disableDayPicker
                 format="HH:mm"
                 plugins={[<TimePicker hideSeconds />]}
                 calendar={persian}
                 locale={persian_fa}
                 value={formData.endTime && formData.endTime.includes('T') ? formData.endTime.split('T')[1] : formData.endTime}
                 onChange={(date: any) => {
                    if (date) {
                      const time = date.format("HH:mm");
                      const datePart = formData.startTime ? formData.startTime.split('T')[0] : '';
                      if (datePart && time) {
                         setFormData({ ...formData, endTime: \`\${datePart}T\${time}\` });
                      } else if (time) {
                         setFormData({ ...formData, endTime: time });
                      }
                    } else {
                      setFormData({ ...formData, endTime: "" });
                    }
                 }}
                 render={(value, openCalendar) => (
                   <input
                     required
                     readOnly
                     onClick={openCalendar}
                     value={value}
                     className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-right bg-indigo-50/30 font-sans cursor-pointer"
                     dir="rtl"
                     placeholder="انتخاب ساعت"
                     disabled={!formData.startTime}
                   />
                 )}
               />`;
content = content.replace(targetEndSameDay, replEndSameDay);

const targetEndDifferentDay = `<input
                 required
                 type="datetime-local"
                 className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-left bg-indigo-50/30"
                 dir="ltr"
                 value={formData.endTime}
                 onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
               />`;

const replEndDifferentDay = `<DatePicker
                 calendar={persian}
                 locale={persian_fa}
                 format="YYYY/MM/DD HH:mm"
                 plugins={[<TimePicker hideSeconds />]}
                 value={formData.endTime ? new Date(formData.endTime) : ""}
                 onChange={(date: any) => {
                    if (date) {
                      const localDate = date.toDate();
                      const isoString = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                      setFormData({ ...formData, endTime: isoString });
                    } else {
                      setFormData({ ...formData, endTime: "" });
                    }
                 }}
                 render={(value, openCalendar) => (
                   <input
                     required
                     readOnly
                     onClick={openCalendar}
                     value={value}
                     className="w-full pl-3 pr-10 py-2.5 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-right bg-indigo-50/30 font-sans cursor-pointer"
                     dir="rtl"
                     placeholder="انتخاب تاریخ و ساعت"
                   />
                 )}
               />`;

content = content.replace(targetEndDifferentDay, replEndDifferentDay);

fs.writeFileSync('src/components/EventForm.tsx', content);
