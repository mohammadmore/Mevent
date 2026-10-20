import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    if (event.ticketUrl) {
      window.open(event.ticketUrl, '_blank');
    } else {
      setPaymentEvent(event);
    }
  };`;

const replacement = `  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    // Redirect to the official ticket site (crawler or UGC, we redirect as requested)
    const targetUrl = event.ticketUrl || (event.source === 'CRAWLER' ? 'https://calendar.iranfair.com/fa' : 'https://iranfair.com');
    window.open(targetUrl, '_blank');
  };`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
