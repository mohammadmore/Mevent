import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(
  '<button \n          onClick={(e) => onBuyTicket(e, event)}\n          className="w-full',
  '<div className="max-w-md mx-auto w-full">\n        <button \n          onClick={(e) => onBuyTicket(e, event)}\n          className="w-full'
);
content = content.replace(
  '{event.cost > 0 ? \'خرید بلیت\' : \'ثبت نام رایگان\'}\n        </button>',
  '{event.cost > 0 ? \'خرید بلیت\' : \'ثبت نام رایگان\'}\n        </button>\n        </div>'
);

fs.writeFileSync('src/components/EventDetail.tsx', content);
