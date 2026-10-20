import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const targetProps = `  onRsvp: (e: React.MouseEvent, event: Event) => void;
}`;
const replacementProps = `  onRsvp: (e: React.MouseEvent, event: Event) => void;
  isRsvp?: boolean;
}`;
content = content.replace(targetProps, replacementProps);

const targetComponent = `export function EventDetail({ event, onBack, onBuyTicket, isSaved, onToggleSave, onRsvp }: EventDetailProps) {`;
const replacementComponent = `export function EventDetail({ event, onBack, onBuyTicket, isSaved, onToggleSave, onRsvp, isRsvp }: EventDetailProps) {`;
content = content.replace(targetComponent, replacementComponent);

const targetButton = `        <button 
          onClick={(e) => event.cost > 0 || event.ticketUrl ? onBuyTicket(e, event) : onRsvp(e, event)}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          {event.ticketUrl ? <ExternalLink className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
          {event.ticketUrl ? 'تهیه بلیت از سایت رسمی' : (event.cost > 0 ? 'خرید بلیت' : 'ثبت نام رایگان')}
        </button>`;

const replacementButton = `        <button 
          onClick={(e) => event.cost > 0 || event.ticketUrl ? onBuyTicket(e, event) : onRsvp(e, event)}
          className={\`w-full \${isRsvp ? 'bg-green-600 shadow-green-200 hover:bg-green-700' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'} text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2\`}
        >
          {event.ticketUrl ? <ExternalLink className="w-5 h-5" /> : (isRsvp ? <CheckCircle className="w-5 h-5" /> : <Ticket className="w-5 h-5" />)}
          {event.ticketUrl ? 'تهیه بلیت از سایت رسمی' : (event.cost > 0 ? 'خرید بلیت' : (isRsvp ? 'منم میرم (لغو)' : 'ثبت نام رایگان'))}
        </button>`;

content = content.replace(targetButton, replacementButton);

fs.writeFileSync('src/components/EventDetail.tsx', content);
