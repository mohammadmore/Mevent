import fs from 'fs';

let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const importOld = `import { useAuth } from '../lib/AuthContext';`;
const importNew = `import { useAuth } from '../lib/AuthContext';
import { useToast } from './Toast';`;
content = content.replace(importOld, importNew);

const oldProps = `export function EventDetail({ event, onBack, onToggleSave, isSaved, onBuyTicket, onRsvp, isRsvp }: EventDetailProps) {
  const [showToast, setShowToast] = useState(false);
  const { user } = useAuth();`;
const newProps = `export function EventDetail({ event, onBack, onToggleSave, isSaved, onBuyTicket, onRsvp, isRsvp }: EventDetailProps) {
  const [showToast, setShowToast] = useState(false);
  const { user, dbUserId } = useAuth();
  const { addToast } = useToast();`;
content = content.replace(oldProps, newProps);

const shareOld = `  const handleShare = () => {
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

const shareNew = `  const handleShare = async () => {
    if (dbUserId) {
      try {
        await fetch(\`/api/users/\${user?.uid}/points\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 50, reason: 'share_event' })
        });
        addToast('۵۰ امتیاز بابت اشتراک‌گذاری رویداد دریافت کردید!', 'success');
      } catch (err) {}
    }

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
content = content.replace(shareOld, shareNew);

const inviteCardTarget = `        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex-1">`;
const newInviteCard = `        
        {/* Viral Share Banner */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-indigo-900 text-sm mb-1">دوستانت رو دعوت کن!</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">با ارسال این رویداد برای دوستانت ۵۰ امتیاز میونت دریافت کن.</p>
          </div>
          <button onClick={handleShare} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">
            <Share2 className="w-4 h-4" />
            ارسال و دریافت امتیاز
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex-1">`;
content = content.replace(inviteCardTarget, newInviteCard);

fs.writeFileSync('src/components/EventDetail.tsx', content);
