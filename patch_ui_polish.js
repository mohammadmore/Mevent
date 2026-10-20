import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Format Helper
const formatHelper = `const formatEventDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const datePart = new Intl.DateTimeFormat('fa-IR', optionsDate).format(d);
    const timePart = new Intl.DateTimeFormat('fa-IR', optionsTime).format(d);
    return \`\${datePart} • \${timePart}\`;
  } catch (e) {
    return new Date(dateString).toLocaleString('fa-IR');
  }
};\n`;
appContent = replaceSafely(appContent, "export default function App() {", formatHelper + "export default function App() {");

// 2. Apply Date format in Discover cards
const oldDiscoverDate = `<div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>`;
const newDiscoverDate = `<div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{formatEventDate(event.startTime)}</span>
                        </div>`;
appContent = replaceSafely(appContent, oldDiscoverDate, newDiscoverDate);

// 3. Apply Date format in Saved tickets
const oldTicketDate = `<div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 leading-relaxed">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(ticket.events.startTime).toLocaleString('fa-IR')}
                        </div>`;
const newTicketDate = `<div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 leading-relaxed">
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{formatEventDate(ticket.events.startTime)}</span>
                        </div>`;
appContent = replaceSafely(appContent, oldTicketDate, newTicketDate);

// 4. Smooth transitions on tab change
appContent = replaceSafely(appContent, `<div className="flex-1 overflow-y-auto px-6 py-6 pb-24 md:pb-6 scroll-smooth">`, `<div className="flex-1 overflow-y-auto px-6 py-6 pb-24 md:pb-6 scroll-smooth animate-in fade-in slide-in-from-bottom-4 duration-500">`);

fs.writeFileSync('src/App.tsx', appContent);

// 5. Apply Date format in EventDetail.tsx
let eventDetail = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');
const detailDateHelper = `
const formatDetailDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    const datePart = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);
    const timePart = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(d);
    return { datePart, timePart };
  } catch(e) {
    return { datePart: '', timePart: '' };
  }
};
`;
eventDetail = replaceSafely(eventDetail, "export function EventDetail", detailDateHelper + "export function EventDetail");

const oldDetailDate = `<p className="text-sm text-gray-600 font-medium">{eventDate.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-xs text-gray-500 mt-1">ساعت {eventDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</p>`;
const newDetailDate = `<p className="text-sm text-gray-600 font-medium">{formatDetailDate(event.startTime).datePart}</p>
              <p className="text-xs text-gray-500 mt-1">ساعت {formatDetailDate(event.startTime).timePart}</p>`;
eventDetail = replaceSafely(eventDetail, oldDetailDate, newDetailDate);

// Smooth in for Event detail panel
eventDetail = replaceSafely(eventDetail, `<div className="fixed inset-0 bg-white z-[100] overflow-y-auto flex flex-col" dir="rtl">`, `<div className="fixed inset-0 bg-white z-[100] overflow-y-auto flex flex-col animate-in slide-in-from-bottom-full duration-300" dir="rtl">`);

fs.writeFileSync('src/components/EventDetail.tsx', eventDetail);

