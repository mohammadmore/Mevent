import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = "          className={`w-full ${isRsvp ? 'bg-green-600 shadow-green-200 hover:bg-green-700' : 'bg-[#d9ff00] text-black shadow-[#d9ff00]/20 hover:bg-[#c6eb00]'} text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}";
const rep = "          className={`w-full ${isRsvp ? 'bg-[#d9ff00]/20 text-[#d9ff00] shadow-[#d9ff00]/5 hover:bg-[#d9ff00]/30' : 'bg-[#d9ff00] text-black shadow-[#d9ff00]/20 hover:bg-[#c6eb00]'} font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}";

content = content.replace(target, rep);

fs.writeFileSync('src/components/EventDetail.tsx', content);
