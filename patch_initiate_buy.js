import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    setPaymentEvent(event);
  };`;

const replacement = `  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    if (event.ticketUrl) {
      window.open(event.ticketUrl, '_blank');
    } else {
      setPaymentEvent(event);
    }
  };`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
