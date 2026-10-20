import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `<span className="bg-[#d9ff00]/10 text-[#d9ff00] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2">`;
const rep1 = `<span className={\`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2 \${isLight ? 'bg-black/10 text-black' : 'bg-[#d9ff00]/10 text-[#d9ff00]'}\`}>`;

content = content.replace(target1, rep1);

// Also need to check if we have any other text colors like "text-gray-200" on the background icon
const targetIcon = `const getEventBackgroundIcon = (tags: string[]) => {
  if (!tags) return <Ticket className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0" />;
  const t = tags.join(' ');
  if (t.includes('موسیقی') || t.includes('کنسرت') || t.includes('آواز')) return <Music className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0" />;
  if (t.includes('هنر') || t.includes('نمایشگاه') || t.includes('گالری')) return <Palette className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0" />;
  if (t.includes('تکنولوژی') || t.includes('برنامه') || t.includes('فناوری') || t.includes('هوش')) return <Monitor className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0" />;
  if (t.includes('کسب') || t.includes('تجارت') || t.includes('اقتصاد') || t.includes('صنعت')) return <Briefcase className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0" />;
  return <Ticket className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0" />;
};`;

const repIcon = `const getEventBackgroundIcon = (tags: string[], isLight: boolean = false) => {
  const colorClass = isLight ? 'text-black/5' : 'text-gray-200 opacity-20';
  if (!tags) return <Ticket className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  const t = tags.join(' ');
  if (t.includes('موسیقی') || t.includes('کنسرت') || t.includes('آواز')) return <Music className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('هنر') || t.includes('نمایشگاه') || t.includes('گالری')) return <Palette className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('تکنولوژی') || t.includes('برنامه') || t.includes('فناوری') || t.includes('هوش')) return <Monitor className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('کسب') || t.includes('تجارت') || t.includes('اقتصاد') || t.includes('صنعت')) return <Briefcase className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  return <Ticket className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
};`;

content = content.replace(targetIcon, repIcon);

const targetIconCall = `{getEventBackgroundIcon(event.tags || [])}`;
const repIconCall = `{getEventBackgroundIcon(event.tags || [], isLight)}`;
content = content.replace(targetIconCall, repIconCall);

fs.writeFileSync('src/App.tsx', content);
