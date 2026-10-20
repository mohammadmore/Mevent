import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update Imports
content = content.replace(
  'import { MapPin, Calendar, CheckCircle, Search, Compass, Heart, User, PlusCircle, Bookmark, Star, Sparkles, MessageCircle, Users, CreditCard, ExternalLink } from "lucide-react";',
  'import { MapPin, Calendar, CheckCircle, Search, Compass, Heart, User, PlusCircle, Bookmark, Star, Sparkles, MessageCircle, Users, CreditCard, ExternalLink, Music, Palette, Monitor, Briefcase, Ticket, LogOut, Share2, LogIn, CalendarPlus, Settings, Map, Clock } from "lucide-react";'
);

// 2. Add Helper & Toast State
const helperCode = `
const getEventBackgroundIcon = (tags: string[]) => {
  if (!tags) return <Ticket className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none" />;
  const t = tags.join(' ');
  if (t.includes('موسیقی') || t.includes('کنسرت') || t.includes('آواز')) return <Music className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none" />;
  if (t.includes('هنر') || t.includes('نمایشگاه') || t.includes('گالری')) return <Palette className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none" />;
  if (t.includes('تکنولوژی') || t.includes('برنامه') || t.includes('فناوری') || t.includes('هوش')) return <Monitor className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none" />;
  if (t.includes('کسب') || t.includes('تجارت') || t.includes('اقتصاد') || t.includes('صنعت')) return <Briefcase className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none" />;
  return <Ticket className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none" />;
};
`;
content = content.replace('export default function App() {', helperCode + '\nexport default function App() {');

const toastStateCode = `
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };
`;
content = content.replace('const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);', toastStateCode);

// 3. Replace alert with showToast globally
content = content.replace(/alert\(/g, 'showToast(');

// 4. Add Toast UI renderer
const toastUI = `
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-sm text-center">
              {toastMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;
content = content.replace('      </div>\n    </div>\n  );\n}', toastUI);

// 5. Add Background Icon to Event Card
const cardTarget = `                    onClick={() => { handleInteraction(event.id, 'VIEW'); setSelectedEvent(event); }}\n                  >`;
const cardReplacement = cardTarget + `\n                    {getEventBackgroundIcon(event.tags || [])}`;
content = content.replace(cardTarget, cardReplacement);

// 6. Better Empty States (Saved)
const savedTarget = `                  {myTickets.length === 0 && (
                    <p className="text-center text-gray-400 py-6">شما هنوز بلیتی نخریده‌اید.</p>
                  )}`;
const savedReplacement = `                  {myTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <CreditCard className="w-16 h-16 text-gray-200 mb-4" />
                      <p className="text-center text-gray-500 font-medium">شما هنوز بلیتی نخریده‌اید.</p>
                    </div>
                  )}`;
content = content.replace(savedTarget, savedReplacement);

const rsvpTarget = `                  {rsvpEvents.length === 0 && (
                    <p className="text-center text-gray-400 py-6">رویدادی برای شرکت ثبت نکرده‌اید.</p>
                  )}`;
const rsvpReplacement = `                  {rsvpEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <Calendar className="w-16 h-16 text-gray-200 mb-4" />
                      <p className="text-center text-gray-500 font-medium">رویدادی برای شرکت ثبت نکرده‌اید.</p>
                    </div>
                  )}`;
content = content.replace(rsvpTarget, rsvpReplacement);

const savedEventsTarget = `                  {savedEvents.length === 0 && (
                    <p className="text-center text-gray-400 py-6">رویدادی ذخیره نکرده‌اید.</p>
                  )}`;
const savedEventsReplacement = `                  {savedEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <Heart className="w-16 h-16 text-gray-200 mb-4" />
                      <p className="text-center text-gray-500 font-medium">رویدادی ذخیره نکرده‌اید.</p>
                    </div>
                  )}`;
content = content.replace(savedEventsTarget, savedEventsReplacement);

// 7. Add Logout button in Profile tab
const profileTarget = `<span className="text-sm text-blue-700">سطح کاربری</span>
                </div>
              </div>`;
const profileReplacement = `<span className="text-sm text-blue-700">سطح کاربری</span>
                </div>
              </div>
              <div className="mt-8 flex justify-center border-t border-gray-100 pt-8">
                <button
                  onClick={() => { logout(); setActiveTab('login'); }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  خروج از حساب کاربری
                </button>
              </div>`;
content = content.replace(profileTarget, profileReplacement);

fs.writeFileSync('src/App.tsx', content);
