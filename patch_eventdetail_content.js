import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(
  '<div className="flex-1 px-5 py-6 bg-white -mt-6 rounded-t-3xl relative z-10">',
  '<div className="flex-1 px-5 md:px-10 py-6 md:py-10 bg-white -mt-6 md:-mt-10 rounded-t-3xl md:rounded-t-[3rem] relative z-10 max-w-5xl mx-auto w-full">'
);

fs.writeFileSync('src/components/EventDetail.tsx', content);
