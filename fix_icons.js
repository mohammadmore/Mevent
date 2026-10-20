import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldFunc = `const getEventBackgroundIcon = (tags: string[]) => {
  const colorClass = 'text-gray-800 dark:text-gray-200 opacity-20';
  if (!tags) return <Ticket className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  const t = tags.join(' ');
  if (t.includes('موسیقی') || t.includes('کنسرت') || t.includes('آواز')) return <Music className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('هنر') || t.includes('نمایشگاه') || t.includes('گالری')) return <Palette className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('تکنولوژی') || t.includes('برنامه') || t.includes('فناوری') || t.includes('هوش')) return <Monitor className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('کسب') || t.includes('تجارت') || t.includes('اقتصاد') || t.includes('صنعت')) return <Briefcase className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  return <Ticket className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
};`;

const newFunc = `const getEventBackgroundIcon = (tags: string[], isColored?: boolean) => {
  const colorClass = isColored ? 'text-white dark:text-white opacity-40' : 'text-gray-800 dark:text-gray-200 opacity-20';
  if (!tags) return <Ticket className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  const t = tags.join(' ');
  if (t.includes('موسیقی') || t.includes('کنسرت') || t.includes('آواز')) return <Music className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('هنر') || t.includes('نمایشگاه') || t.includes('گالری')) return <Palette className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('تکنولوژی') || t.includes('برنامه') || t.includes('فناوری') || t.includes('هوش')) return <Monitor className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  if (t.includes('کسب') || t.includes('تجارت') || t.includes('اقتصاد') || t.includes('صنعت')) return <Briefcase className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
  return <Ticket className={\`absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 -rotate-12 pointer-events-none z-0 \${colorClass}\`} />;
};`;

content = content.replace(oldFunc, newFunc);
content = content.replace('{getEventBackgroundIcon(event.tags || [])}', '{getEventBackgroundIcon(event.tags || [], isGoing || isSaved)}');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed icons');
