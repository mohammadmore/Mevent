import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { ToastContainer, useToast } from './components/Toast';`;
const newImport = `import { ToastContainer, useToast } from './components/Toast';
import GamificationPanel from './components/GamificationPanel';`;
content = content.replace(importTarget, newImport);


const profileTarget = `              {profile.role === 'USER' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">`;

const newProfile = `              <GamificationPanel userPoints={profile.points || 0} addToast={addToast} />

              {profile.role === 'USER' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">`;

content = content.replace(profileTarget, newProfile);
fs.writeFileSync('src/App.tsx', content);
