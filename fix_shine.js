import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Discover Tab
content = content.replace(
  /'bg-\[\#d9ff00\]\/5 border-\[\#d9ff00\]\/30 shadow-sm hover:shadow-md hover:bg-\[\#d9ff00\]\/10 hover:border-\[\#d9ff00\]\/50'/g, 
  "'bg-[#d9ff00]/5 border-[#d9ff00]/30 shadow-[0_0_15px_rgba(217,255,0,0.1)] hover:shadow-[0_0_25px_rgba(217,255,0,0.2)] hover:bg-[#d9ff00]/10 hover:border-[#d9ff00]/50'"
);

content = content.replace(
  /'bg-blue-500\/5 border-blue-500\/30 shadow-sm hover:shadow-md hover:bg-blue-500\/10 hover:border-blue-500\/50'/g, 
  "'bg-blue-500/5 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] hover:bg-blue-500/10 hover:border-blue-500/50'"
);

// RSVP Tab
content = content.replace(
  /className="bg-\[\#d9ff00\]\/5 border-\[\#d9ff00\]\/30 hover:bg-\[\#d9ff00\]\/10 hover:border-\[\#d9ff00\]\/50 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"/g, 
  'className="bg-[#d9ff00]/5 border-[#d9ff00]/30 hover:bg-[#d9ff00]/10 hover:border-[#d9ff00]/50 rounded-2xl border p-4 shadow-[0_0_15px_rgba(217,255,0,0.1)] hover:shadow-[0_0_25px_rgba(217,255,0,0.2)] transition-all duration-300 cursor-pointer"'
);

// Saved Tab
content = content.replace(
  /className="bg-blue-500\/5 border-blue-500\/30 hover:bg-blue-500\/10 hover:border-blue-500\/50 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"/g, 
  'className="bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 rounded-2xl border p-4 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 cursor-pointer"'
);

fs.writeFileSync('src/App.tsx', content);
