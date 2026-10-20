import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const createTabTarget = `{activeTab === 'create' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full">`;
            
const createTabReplacement = `{activeTab === 'create' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">`;

content = content.replace(createTabTarget, createTabReplacement);

const notificationsTabTarget = `{activeTab === 'notifications' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full">`;
            
const notificationsTabReplacement = `{activeTab === 'notifications' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">`;
            
content = content.replace(notificationsTabTarget, notificationsTabReplacement);


fs.writeFileSync('src/App.tsx', content);
console.log('Fixed scroll issues');
