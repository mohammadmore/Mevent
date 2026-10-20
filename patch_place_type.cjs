const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const target = '<input type="text" value={editingPlace.type} onChange={e => setEditingPlace({...editingPlace, type: e.target.value})} className="p-2 border rounded" placeholder="نوع" />';

const rep = `                  <select value={editingPlace.type} onChange={e => setEditingPlace({...editingPlace, type: e.target.value})} className="p-2 border rounded text-gray-900 bg-white dark:bg-[#18181b] dark:text-white border-gray-300 dark:border-white/20">
                    <option value="کافه">کافه</option>
                    <option value="رستوران">رستوران</option>
                    <option value="فضای کار اشتراکی">فضای کار اشتراکی</option>
                    <option value="گالری">گالری</option>
                    <option value="پارک">پارک</option>
                    <option value="سینما">سینما</option>
                    <option value="سالن تئاتر">سالن تئاتر</option>
                    <option value="موزه">موزه</option>
                    <option value="باشگاه">باشگاه</option>
                    <option value="کتابخانه">کتابخانه</option>
                    <option value="آموزشگاه">آموزشگاه</option>
                    <option value="سایر">سایر</option>
                  </select>`;

code = code.replace(target, rep);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
