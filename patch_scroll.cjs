const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const targetEffect = `  React.useEffect(() => {
    fetch(\`/api/events/\${event.id}/similar\`)`;

const repEffect = `  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [event.id]);

  React.useEffect(() => {
    fetch(\`/api/events/\${event.id}/similar\`)`;

code = code.replace(targetEffect, repEffect);

const targetDiv = `<div className="fixed inset-0 bg-gradient-to-br from-teal-50/95 via-white to-cyan-50/95 dark:from-[#18181b] dark:via-[#18181b] dark:to-[#18181b] z-[100] overflow-y-auto flex flex-col animate-in slide-in-from-bottom-full duration-300" dir="rtl">`;
const repDiv = `<div ref={containerRef} className="fixed inset-0 bg-gradient-to-br from-teal-50/95 via-white to-cyan-50/95 dark:from-[#18181b] dark:via-[#18181b] dark:to-[#18181b] z-[100] overflow-y-auto flex flex-col animate-in slide-in-from-bottom-full duration-300" dir="rtl">`;

code = code.replace(targetDiv, repDiv);

fs.writeFileSync('src/components/EventDetail.tsx', code);
