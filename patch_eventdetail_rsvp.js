import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target1 = `  onBuyTicket: (e: React.MouseEvent, event: Event) => void;
}`;
const replacement1 = `  onBuyTicket: (e: React.MouseEvent, event: Event) => void;
  onRsvp: (e: React.MouseEvent, event: Event) => void;
}`;
content = content.replace(target1, replacement1);

const target2 = `export function EventDetail({ event, onBack, onBuyTicket, isSaved, onToggleSave }: EventDetailProps) {`;
const replacement2 = `export function EventDetail({ event, onBack, onBuyTicket, isSaved, onToggleSave, onRsvp }: EventDetailProps) {`;
content = content.replace(target2, replacement2);

const target3 = `        <button 
          onClick={(e) => onBuyTicket(e, event)}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >`;
const replacement3 = `        <button 
          onClick={(e) => event.cost > 0 || event.ticketUrl ? onBuyTicket(e, event) : onRsvp(e, event)}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >`;
content = content.replace(target3, replacement3);

fs.writeFileSync('src/components/EventDetail.tsx', content);
