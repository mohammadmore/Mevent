import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(
  'interface EventDetailProps {',
  'interface EventDetailProps {\n  isSaved: boolean;\n  onToggleSave: () => void;'
);

content = content.replace(
  'export function EventDetail({ event, onBack, onBuyTicket }: EventDetailProps) {',
  'export function EventDetail({ event, onBack, onBuyTicket, isSaved, onToggleSave }: EventDetailProps) {'
);

content = content.replace(
  '  const [isSaved, setIsSaved] = useState(false); // In a real app, this would be passed down or fetched',
  ''
);

content = content.replace(
  'onClick={() => setIsSaved(!isSaved)}',
  'onClick={onToggleSave}'
);

const oldHandleShare = `  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      }).catch(console.error);
    }
  };`;

const newHandleShare = `  const [showToast, setShowToast] = useState(false);
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      });
    }
  };`;

content = content.replace(oldHandleShare, newHandleShare);

content = content.replace(
  'return (',
  'return (\n    <>\n      {showToast && (\n        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full z-50 text-sm shadow-lg animate-in fade-in slide-in-from-top-2">\n          لینک رویداد کپی شد\n        </div>\n      )}'
);

content = content.replace(
  '</button>\n        </div>\n    </div>\n  );\n}',
  '</button>\n        </div>\n    </div>\n    </>\n  );\n}'
);

fs.writeFileSync('src/components/EventDetail.tsx', content);
