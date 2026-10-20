import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Import DockMenu
if (!content.includes("import DockMenu")) {
  content = content.replace("import NavItem from ", "import DockMenu from './components/DockMenu';\nimport NavItem from ");
}

// Replace the layout classes for dark mode
content = content.replace(
  '<div className="min-h-screen bg-gray-50 flex justify-center font-sans text-right" dir="rtl">',
  '<div className="min-h-screen bg-[#0f0f11] flex justify-center font-sans text-right text-gray-100" dir="rtl">'
);
content = content.replace(
  '<div className="w-full max-w-7xl mx-auto bg-white h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative">',
  '<div className="w-full max-w-7xl mx-auto bg-[#141417] h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative border-x border-white/5">'
);

// We need to replace the entire navigation block with DockMenu.
const navStart = `        {/* Responsive Navigation */}`;
const navEnd = `        {/* Main Content Area */}`;

const startIndex = content.indexOf(navStart);
const endIndex = content.indexOf(navEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  content = before + `        {/* Responsive Navigation */}\n        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && (\n          <DockMenu activeTab={activeTab} setActiveTab={setActiveTab} profile={profile} setShowAiAssistant={setShowAiAssistant} />\n        )}\n\n` + after;
}

// Replace white bg and borders inside App.tsx
content = content.replace(/bg-white/g, 'bg-[#18181b]');
content = content.replace(/bg-gray-50/g, 'bg-[#1f1f23]');
content = content.replace(/text-gray-900/g, 'text-gray-100');
content = content.replace(/text-gray-800/g, 'text-gray-200');
content = content.replace(/text-gray-500/g, 'text-gray-400');
content = content.replace(/text-gray-600/g, 'text-gray-300');
content = content.replace(/border-gray-100/g, 'border-white/10');
content = content.replace(/border-gray-200/g, 'border-white/10');
content = content.replace(/border-gray-300/g, 'border-white/20');
content = content.replace(/bg-white\/90/g, 'bg-[#18181b]/90');

fs.writeFileSync('src/App.tsx', content);
