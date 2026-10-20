import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Patch RSVP Empty State
const rsvpEmptyOld = `{rsvpEvents.length === 0 && (
                     <p className="text-center text-gray-400 py-6">هنوز برای رویدادی ثبت‌نام نکرده‌اید.</p>
                  )}`;
const rsvpEmptyNew = `{rsvpEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-center text-gray-500 font-medium">هنوز برای رویدادی ثبت‌نام نکرده‌اید.</p>
                      <button onClick={() => setActiveTab('discover')} className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700">کشف رویدادها</button>
                    </div>
                  )}`;
appContent = replaceSafely(appContent, rsvpEmptyOld, rsvpEmptyNew);

// Patch Saved Empty State
const savedEmptyOld = `{savedEvents.length === 0 && (
                     <p className="text-center text-gray-400 py-6">هنوز رویدادی نشان نکرده‌اید.</p>
                  )}`;
const savedEmptyNew = `{savedEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Bookmark className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-center text-gray-500 font-medium">هنوز رویدادی نشان نکرده‌اید.</p>
                      <button onClick={() => setActiveTab('discover')} className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700">کشف رویدادها</button>
                    </div>
                  )}`;
appContent = replaceSafely(appContent, savedEmptyOld, savedEmptyNew);

// Patch Hubs Empty State
const hubsEmptyOld = `{hubs.length === 0 && (
                   <p className="col-span-2 text-center text-gray-400 py-10">جامعه‌ای یافت نشد.</p>
                )}`;
const hubsEmptyNew = `{hubs.length === 0 && (
                   <div className="col-span-full flex flex-col items-center justify-center py-16">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-center text-gray-500 font-medium text-lg mb-2">هنوز جامعه‌ای وجود ندارد</p>
                      <p className="text-center text-gray-400 text-sm mb-6 max-w-xs">شما می‌توانید اولین جامعه را در حوزه مورد علاقه خود بسازید.</p>
                      <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" />
                        ایجاد جامعه جدید
                      </button>
                   </div>
                )}`;
appContent = replaceSafely(appContent, hubsEmptyOld, hubsEmptyNew);


fs.writeFileSync('src/App.tsx', appContent);
