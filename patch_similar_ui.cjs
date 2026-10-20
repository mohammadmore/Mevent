const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const importTarget = `import { ArrowRight, MapPin, Map, Calendar, Clock, DollarSign, Share2, Heart, Tag, ArrowLeft, Ticket, ExternalLink, CheckCircle, X, Info } from 'lucide-react';`;
const importRep = `import { ArrowRight, MapPin, Map, Calendar, Clock, DollarSign, Share2, Heart, Tag, ArrowLeft, Ticket, ExternalLink, CheckCircle, X, Info, Sparkles } from 'lucide-react';
import { getEventBackgroundIcon } from '../lib/icons';`;
if(!code.includes('import { getEventBackgroundIcon }')) {
  code = code.replace(importTarget, importRep);
}

const stateTarget = `  const [isMapModalOpen, setIsMapModalOpen] = useState(false);`;
const stateRep = `  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [similarEvents, setSimilarEvents] = useState<Event[]>([]);

  React.useEffect(() => {
    fetch(\`/api/events/\${event.id}/similar\`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setSimilarEvents(data.data);
        }
      })
      .catch(console.error);
  }, [event.id]);`;
code = code.replace(stateTarget, stateRep);

const renderTarget = `            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p className="italic text-gray-600 dark:text-gray-400">توضیحاتی برای این رویداد ثبت نشده است.</p>
            )}
          </div>
        </div>`;

const renderRep = `            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p className="italic text-gray-600 dark:text-gray-400">توضیحاتی برای این رویداد ثبت نشده است.</p>
            )}
          </div>
        </div>

        {similarEvents.length > 0 && (
          <div className="mt-8 mb-8 bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
              رویدادهای مشابه پیشنهادی
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similarEvents.map(simEvent => (
                <div 
                  key={simEvent.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden cursor-pointer hover:border-teal-500/50 transition-colors group flex"
                  onClick={(e) => {
                    // Quick hack to load the event using a custom event
                    // We don't have navigate here, but we can trigger a state change in App.tsx if we use a global event.
                    // Or we just dispatch a custom event that App.tsx can listen to.
                    const customEvent = new CustomEvent('navToEvent', { detail: simEvent });
                    window.dispatchEvent(customEvent);
                  }}
                >
                  <div className="w-1/3 min-h-[100px] relative">
                     {simEvent.imageUrl ? (
                        <img src={simEvent.imageUrl} alt={simEvent.title} className="w-full h-full object-cover" />
                     ) : (
                        getEventBackgroundIcon(simEvent.bgIcon, simEvent.tags || [], false)
                     )}
                  </div>
                  <div className="p-3 w-2/3 flex flex-col justify-center">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00] transition-colors">{simEvent.title}</h4>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="truncate">{simEvent.fuzzyTime ? (simEvent.fuzzyTime.startsWith("{") ? JSON.parse(simEvent.fuzzyTime).label : simEvent.fuzzyTime) : (simEvent.startTime ? formatDetailDate(simEvent.startTime).datePart : "زمان نامشخص")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}`;

code = code.replace(renderTarget, renderRep);
fs.writeFileSync('src/components/EventDetail.tsx', code);
