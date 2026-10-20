import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<CreditCard className="w-4 h-4" />
                            )}
                            خرید بلیت`;

const replacement = `{event.ticketUrl ? <ExternalLink className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                            )}
                            {event.ticketUrl ? 'سایت رسمی' : 'خرید بلیت'}`;

content = content.replace(target, replacement);

if (content.indexOf('ExternalLink') === -1) {
    content = content.replace(
        "import { Compass, Users, PlusCircle, Heart, User, Search, MapPin, Map as MapIcon, Bookmark, CreditCard, CheckCircle, ChevronLeft, ArrowRight, Share2, Star, Settings, LogOut, Loader2, Sparkles, X, Target } from 'lucide-react';",
        "import { Compass, Users, PlusCircle, Heart, User, Search, MapPin, Map as MapIcon, Bookmark, CreditCard, CheckCircle, ChevronLeft, ArrowRight, Share2, Star, Settings, LogOut, Loader2, Sparkles, X, Target, ExternalLink } from 'lucide-react';"
    );
}

fs.writeFileSync('src/App.tsx', content);
