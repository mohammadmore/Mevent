import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                    <div key={\`\${event.id}-\${index}\`} className="bg-blue-300 border-blue-400 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                      <h3 className="font-bold text-lg text-gray-100 mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />`;

const rep1 = `                    <div key={\`\${event.id}-\${index}\`} className="bg-blue-300 border-blue-400 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                      <h3 className="font-bold text-lg text-black mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-800 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-700" />`;

content = content.replace(target1, rep1);

const target2 = `                        <span className="bg-blue-100 text-blue-700 border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold border">نشان شده</span>`;
const rep2 = `                        <span className="bg-blue-200 text-blue-800 border-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold border">نشان شده</span>`;

content = content.replace(target2, rep2);


// Also check My Tickets tab!
const target3 = `                    <div key={\`\${ticket.id}-\${index}\`} className="bg-[#1f1f23] border-white/10 rounded-2xl border p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-100 mb-1">{ticket.events.title}</h3>
                        <p className="text-gray-400 text-sm mb-3">{new Date(ticket.events.startTime).toLocaleString('fa-IR')}</p>
                      </div>`;
// This one has a dark background so it's fine.

fs.writeFileSync('src/App.tsx', content);
