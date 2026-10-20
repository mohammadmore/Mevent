import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const profileOld = `              </div>
              <div className="mt-8 flex justify-center border-t border-gray-100 pt-8">
                <button
                  onClick={() => { logout(); setActiveTab('login'); }}`;

const profileNew = `              </div>
              
              {/* Privacy and Settings */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 mt-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  حریم خصوصی و داده‌های شما
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  موتور هوش مصنوعی ما برای ارائه پیشنهادهای بهتر، تعاملات شما (بازدیدها، نشان‌کردن‌ها و ثبت‌نام‌ها) را به صورت ناشناس بررسی می‌کند. شما کنترل کامل روی داده‌های خود دارید.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      showToast('داده‌های یادگیری ماشین شما با موفقیت پاک شد.');
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center text-gray-500 group-hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 group-hover:text-red-700">پاک‌سازی داده‌های تعاملی</div>
                        <div className="text-xs text-gray-500 group-hover:text-red-500">تاریخچه بازدیدها و لایک‌ها</div>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveTab('onboarding');
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center text-gray-500 group-hover:text-indigo-600 transition-colors">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 group-hover:text-indigo-700">ویرایش علایق من</div>
                        <div className="text-xs text-gray-500 group-hover:text-indigo-500">تغییر تگ‌های مورد علاقه</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-8 flex justify-center border-t border-gray-100 pt-8">
                <button
                  onClick={() => { logout(); setActiveTab('login'); }}`;

appContent = replaceSafely(appContent, profileOld, profileNew);

// Need to import Shield, Trash2, Settings
const iconsOld = `import { MapPin, Calendar, Clock, Search, Compass, Heart, PlusCircle, User, LogOut, CheckCircle, Ticket, Filter, ExternalLink, Bookmark, Share2, MessageCircle, Star, Users, ArrowRight, ArrowLeft, RefreshCw, X, Sparkles, Navigation, CreditCard } from 'lucide-react';`;
const iconsNew = `import { MapPin, Calendar, Clock, Search, Compass, Heart, PlusCircle, User, LogOut, CheckCircle, Ticket, Filter, ExternalLink, Bookmark, Share2, MessageCircle, Star, Users, ArrowRight, ArrowLeft, RefreshCw, X, Sparkles, Navigation, CreditCard, Shield, Trash2, Settings } from 'lucide-react';`;
appContent = replaceSafely(appContent, iconsOld, iconsNew);

fs.writeFileSync('src/App.tsx', appContent);
