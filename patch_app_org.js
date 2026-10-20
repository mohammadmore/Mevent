import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = `import EventForm from './components/EventForm';`;
const newImportStatement = `import EventForm from './components/EventForm';\nimport OrganizerPanel from './components/OrganizerPanel';`;
appContent = replaceSafely(appContent, importStatement, newImportStatement);


const addTab = `              <NavItem icon={<Users />} label="جوامع" isActive={activeTab === 'hubs'} onClick={() => { setShowAiAssistant(false); setActiveTab('hubs'); }} />
              
              <div className="relative -top-5 md:top-0 md:w-full md:my-4 z-50">`;

const addTabNew = `              <NavItem icon={<Users />} label="جوامع" isActive={activeTab === 'hubs'} onClick={() => { setShowAiAssistant(false); setActiveTab('hubs'); }} />
              {profile?.role === 'ADMIN' && (
                <NavItem icon={<Activity />} label="مدیریت" isActive={activeTab === 'organizer'} onClick={() => { setShowAiAssistant(false); setActiveTab('organizer'); }} />
              )}
              
              <div className="relative -top-5 md:top-0 md:w-full md:my-4 z-50">`;
appContent = replaceSafely(appContent, addTab, addTabNew);

const renderTab = `{activeTab === 'create' && (`;
const renderTabNew = `          {activeTab === 'organizer' && profile && (
            <div className="h-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-5xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
              <OrganizerPanel userId={dbUserId} />
            </div>
          )}

          {activeTab === 'create' && (`;
appContent = replaceSafely(appContent, renderTab, renderTabNew);

const profileOld = `<span className="text-sm font-bold text-blue-600">{profile.role === 'ADMIN' ? 'مدیر' : 'کاربر'}</span>
                  <span className="text-sm text-blue-700">سطح کاربری</span>`;
const profileNew = `<span className="text-sm font-bold text-blue-600">{profile.role === 'ADMIN' ? 'برگزارکننده' : 'کاربر'}</span>
                  <span className="text-sm text-blue-700">سطح کاربری</span>`;
appContent = replaceSafely(appContent, profileOld, profileNew);

// Need to import Activity
const iconsOld = `import { MapPin, Calendar, Clock, Search, Compass, Heart, PlusCircle, User, LogOut, CheckCircle, Ticket, Filter, ExternalLink, Bookmark, Share2, MessageCircle, Star, Users, ArrowRight, ArrowLeft, RefreshCw, X, Sparkles, Navigation, CreditCard, Shield, Trash2, Settings } from 'lucide-react';`;
const iconsNew = `import { MapPin, Calendar, Clock, Search, Compass, Heart, PlusCircle, User, LogOut, CheckCircle, Ticket, Filter, ExternalLink, Bookmark, Share2, MessageCircle, Star, Users, ArrowRight, ArrowLeft, RefreshCw, X, Sparkles, Navigation, CreditCard, Shield, Trash2, Settings, Activity } from 'lucide-react';`;
appContent = replaceSafely(appContent, iconsOld, iconsNew);


fs.writeFileSync('src/App.tsx', appContent);
