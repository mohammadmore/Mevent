import fs from 'fs';

// 1. Update DockMenu.tsx
let dockContent = fs.readFileSync('src/components/DockMenu.tsx', 'utf8');

const oldDockMenu = `  const navItems = [
    { id: 'discover', icon: <Compass className="w-6 h-6" />, label: 'کشف' },
    { id: 'hubs', icon: <Users className="w-6 h-6" />, label: 'جوامع' },
  ];

  if (profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') {
    navItems.push({ id: 'create', icon: <PlusCircle className="w-6 h-6" />, label: 'ایجاد' });
    navItems.push({ id: 'organizer', icon: <Activity className="w-6 h-6" />, label: 'برگزارکننده' });
  }

  if (profile?.role === 'ADMIN') {
    navItems.push({ id: 'admin', icon: <Shield className="w-6 h-6" />, label: 'ادمین' });
  }

  navItems.push({ id: 'saved', icon: <Heart className="w-6 h-6" />, label: 'ذخیره' });
  navItems.push({ id: 'profile', icon: <User className="w-6 h-6" />, label: 'پروفایل' });`;

const newDockMenu = `  const navItems = [
    { id: 'discover', icon: <Compass className="w-6 h-6" />, label: 'کشف' },
    { id: 'hubs', icon: <Users className="w-6 h-6" />, label: 'جوامع' },
  ];

  if (profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') {
    navItems.push({ id: 'create', icon: <PlusCircle className="w-6 h-6" />, label: 'ایجاد' });
  }

  navItems.push({ id: 'profile', icon: <User className="w-6 h-6" />, label: 'پروفایل' });`;

dockContent = dockContent.replace(oldDockMenu, newDockMenu);
fs.writeFileSync('src/components/DockMenu.tsx', dockContent);

// 2. Update App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const oldAppProfile = `              <GamificationPanel userPoints={profile.points || 0} addToast={addToast} />

              {profile.role === 'USER' && (`;

const newAppProfile = `              <GamificationPanel userPoints={profile.points || 0} addToast={addToast} />
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button onClick={() => setActiveTab('saved')} className="bg-[#1f1f23] border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Heart className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-200 text-sm">بلیت‌ها و ذخیره‌ها</span>
                </button>
                
                {(profile.role === 'ORGANIZER' || profile.role === 'ADMIN') && (
                  <button onClick={() => setActiveTab('organizer')} className="bg-[#1f1f23] border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-200 text-sm">پنل برگزارکننده</span>
                  </button>
                )}
                
                {profile.role === 'ADMIN' && (
                  <button onClick={() => setActiveTab('admin')} className="bg-[#1f1f23] border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-[#d9ff00]/10 flex items-center justify-center text-[#d9ff00] group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-200 text-sm">مدیریت سیستم</span>
                  </button>
                )}
                
                <button onClick={() => { logout(); setActiveTab('login'); }} className="bg-[#1f1f23] border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-red-500/10 hover:border-red-500/30 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-400 group-hover:text-red-500 group-hover:bg-red-500/20 transition-all">
                    <LogOut className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-400 group-hover:text-red-400 text-sm transition-colors">خروج از حساب</span>
                </button>
              </div>

              {profile.role === 'USER' && (`;

appContent = appContent.replace(oldAppProfile, newAppProfile);
fs.writeFileSync('src/App.tsx', appContent);

