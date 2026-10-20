import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const targetCrawlerPrompt = `const prompt = \`Extract upcoming or current events (نمایشگاه ها) from the following text (Tehran International Exhibition Calendar). The current year is 2026 (1405 in Persian calendar). Translate the title and description to Persian if needed. Return a JSON object with an 'events' array containing up to 10 events: title, description (extract the organizer/مجری and dates), startTime (convert Persian dates to approximate ISO string for future dates in 2026/2027 so they are strictly in the future), address (Tehran International Exhibition Center), lat (35.794), lng (51.401), cost (0). \\n\\nText Context: \${textContext}\`;`;

const newCrawlerPrompt = `const prompt = \`Extract upcoming or current events (نمایشگاه ها) from the following text (Tehran International Exhibition Calendar). The current year is 2026 (1405 in Persian calendar). Translate the title and description to Persian if needed. Return a JSON object with an 'events' array containing up to 10 events: title, description (extract the organizer/مجری and dates), startTime (convert Persian dates to approximate ISO string for future dates in 2026/2027 so they are strictly in the future), address (Tehran International Exhibition Center), lat (35.794), lng (51.401), cost (0). \\n\\nText Context: \${textContext}\`;`;

content = content.replace(targetCrawlerPrompt, newCrawlerPrompt); // Let's just use the targetUrl directly since we are passing it.

const targetSchema = `                    lng: { type: Type.NUMBER },
                    cost: { type: Type.NUMBER },
                  }`;
const newSchema = `                    lng: { type: Type.NUMBER },
                    cost: { type: Type.NUMBER },
                    ticketUrl: { type: Type.STRING },
                  }`;
content = content.replace(targetSchema, newSchema);

const targetCreateEvent = `        const newEvent = await createEvent({
          ...eventData,
          startTime: new Date(eventData.startTime || new Date()),
          source: 'CRAWLER',
          tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
          organizerId: 1
        });`;
const newCreateEvent = `        const newEvent = await createEvent({
          ...eventData,
          ticketUrl: eventData.ticketUrl || targetUrl,
          startTime: new Date(eventData.startTime || new Date()),
          source: 'CRAWLER',
          tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
          organizerId: 1
        });`;
content = content.replace(targetCreateEvent, newCreateEvent);

fs.writeFileSync('server.ts', content);
