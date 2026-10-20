import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                            ) : (
                               {event.ticketUrl ? <ExternalLink className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                            )}`;

const replacement = `                            ) : (
                               event.ticketUrl ? <ExternalLink className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />
                            )}`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
