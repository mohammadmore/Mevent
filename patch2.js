import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Change root container
content = content.replace(
  '<div className="w-full max-w-md bg-white h-screen shadow-2xl overflow-hidden flex flex-col relative">',
  '<div className="w-full max-w-7xl mx-auto bg-white h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative">'
);

// 2. Wrap header + content in a main content area div
content = content.replace(
  '{/* Header */}',
  '{/* Main Content Area */}\n        <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-[72px] md:pb-0">\n        {/* Header */}'
);

// 3. Move Nav items and bottom navigation to become responsive sidebar/bottom nav
const bottomNavRegex = /\{\/\* Bottom Navigation \*\/\}[\s\S]*?(?=\{\/\* AI Assistant FAB \*\/)/;
const bottomNavMatch = content.match(bottomNavRegex);

if (bottomNavMatch) {
  content = content.replace(bottomNavMatch[0], ''); // Remove from bottom
  
  // Create responsive nav
  const responsiveNav = `
        {/* Responsive Navigation */}
        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && (
          <div className="md:w-64 lg:w-72 md:border-l md:border-gray-100 bg-white/90 backdrop-blur-lg border-t md:border-t-0 md:bg-white border-gray-100 p-2 md:p-6 flex md:flex-col justify-around md:justify-start items-center md:items-start z-50 md:h-full md:overflow-y-auto fixed md:relative bottom-0 w-full md:order-first transition-all shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:shadow-none">
            
            <div className="hidden md:block mb-10 w-full text-right">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mevent</h1>
                <p className="text-gray-500 text-sm mt-1">کشف و ثبت رویدادها</p>
            </div>
            
            <div className="flex md:flex-col justify-around md:justify-start items-center md:items-stretch w-full md:gap-2">
              <NavItem icon={<Compass />} label="کشف" isActive={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
              <NavItem icon={<Users />} label="جوامع" isActive={activeTab === 'hubs'} onClick={() => setActiveTab('hubs')} />
              
              <div className="relative -top-5 md:top-0 md:w-full md:my-4 z-50">
                <button 
                  onClick={() => setActiveTab('create')}
                  className={\`text-white p-3.5 md:py-3 md:px-4 md:w-full flex items-center justify-center gap-2 md:rounded-xl rounded-full shadow-lg md:shadow-md hover:shadow-xl hover:scale-105 transition-all \${activeTab === 'create' ? 'bg-indigo-600' : 'bg-gray-900'}\`}
                >
                  <PlusCircle className="w-6 h-6" />
                  <span className="hidden md:inline font-bold">ایجاد رویداد</span>
                </button>
              </div>
              
              <NavItem icon={<Heart />} label="ذخیره" isActive={activeTab === 'saved'} onClick={() => setActiveTab('saved')} />
              <NavItem icon={<User />} label="پروفایل" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>
          </div>
        )}
`;

  // We need to inject this inside the root container.
  // We'll place it right after the root container div opens.
  content = content.replace(
    '<div className="w-full max-w-7xl mx-auto bg-white h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative">',
    '<div className="w-full max-w-7xl mx-auto bg-white h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative">\n' + responsiveNav
  );
}

// 4. Close the Main Content Area div before AI Assistant FAB
content = content.replace(
  '{/* AI Assistant FAB */}',
  '</div>\n        {/* AI Assistant FAB */}'
);

// 5. Hide the mobile Header logo in Desktop
content = content.replace(
  '<h1 className="text-2xl font-bold text-gray-900 ">Mevent</h1>',
  '<h1 className="text-2xl font-bold text-gray-900 md:hidden">Mevent</h1>'
);

// 6. Fix NavItem component to be responsive
content = content.replace(
  'className={`flex flex-col items-center gap-1.5 transition-colors ${isActive ? \'text-indigo-600\' : \'text-gray-400 hover:text-gray-600\'}`}',
  'className={`flex flex-col md:flex-row md:justify-start items-center gap-1.5 md:gap-3 transition-colors md:p-3 md:rounded-xl md:w-full ${isActive ? \'text-indigo-600 md:bg-indigo-50\' : \'text-gray-400 hover:text-gray-900 md:hover:bg-gray-50\'}`}'
);
content = content.replace(
  '<span className="text-[10px] font-medium">{label}</span>',
  '<span className="text-[10px] md:text-sm font-medium">{label}</span>'
);

// 7. Grid for discover page
const discoverCardsGridStr = `
              <div className="space-y-4">
                {filteredEvents.map((event, index) => (
`;
const discoverCardsGridReplStr = `
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredEvents.map((event, index) => (
`;
content = content.replace(discoverCardsGridStr, discoverCardsGridReplStr);

const myTicketsGridStr = `
                <div className="space-y-4">
                  {myTickets.map((ticket, index) => (
`;
const myTicketsGridReplStr = `
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myTickets.map((ticket, index) => (
`;
content = content.replace(myTicketsGridStr, myTicketsGridReplStr);

const savedEventsGridStr = `
                <div className="space-y-4">
                  {savedEvents.map((event, index) => (
`;
const savedEventsGridReplStr = `
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedEvents.map((event, index) => (
`;
content = content.replace(savedEventsGridStr, savedEventsGridReplStr);

fs.writeFileSync('src/App.tsx', content);
