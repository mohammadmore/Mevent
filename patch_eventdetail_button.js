import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = `<Ticket className="w-5 h-5" />
          {event.cost > 0 ? 'خرید بلیت' : 'ثبت نام رایگان'}
        </button>`;

const replacement = `{event.ticketUrl ? <ExternalLink className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
          {event.ticketUrl ? 'تهیه بلیت از سایت رسمی' : (event.cost > 0 ? 'خرید بلیت' : 'ثبت نام رایگان')}
        </button>`;

content = content.replace(target, replacement);

if (content.indexOf('ExternalLink') === -1) {
    content = content.replace(
        "import { ArrowRight, MapPin, Calendar, Clock, DollarSign, Share2, Heart, Tag, ArrowLeft, Ticket } from 'lucide-react';",
        "import { ArrowRight, MapPin, Calendar, Clock, DollarSign, Share2, Heart, Tag, ArrowLeft, Ticket, ExternalLink } from 'lucide-react';"
    );
}

fs.writeFileSync('src/components/EventDetail.tsx', content);
