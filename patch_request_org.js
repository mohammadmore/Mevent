import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const roleOld = `<span className="text-sm font-bold text-blue-600">{profile.role === 'ADMIN' ? 'برگزارکننده' : 'کاربر'}</span>`;
const roleNew = `<span className="text-sm font-bold text-blue-600">
                    {profile.role === 'ADMIN' ? 'مدیر سیستم' : profile.role === 'ORGANIZER' ? 'برگزارکننده' : 'کاربر عادی'}
                  </span>`;
appContent = replaceSafely(appContent, roleOld, roleNew);


const upgradeSection = `{/* Privacy and Settings */}`;
const newUpgradeSection = `{profile.role === 'USER' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 mb-1 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-600" />
                      درخواست پنل برگزارکننده
                    </h3>
                    <p className="text-sm text-indigo-700">با ارتقا به حساب برگزارکننده، می‌توانید رویدادهای خود را ثبت کنید و بلیت بفروشید.</p>
                  </div>
                  <button 
                    onClick={() => {
                      fetch(\`/api/admin/users/\${profile.id}/role\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: 'ORGANIZER' })
                      }).then(res => {
                        if(res.ok) {
                          showToast('حساب شما با موفقیت به برگزارکننده ارتقا یافت! لطفا یکبار از سیستم خارج و دوباره وارد شوید.', 'success');
                          setTimeout(() => { logout(); setActiveTab('login'); }, 3000);
                        }
                      });
                    }}
                    className="whitespace-nowrap px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm w-full md:w-auto"
                  >
                    ثبت درخواست ارتقا
                  </button>
                </div>
              )}
              
              {/* Privacy and Settings */}`;
appContent = replaceSafely(appContent, upgradeSection, newUpgradeSection);

fs.writeFileSync('src/App.tsx', appContent);
