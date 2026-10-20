import fs from 'fs';

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Replace the /api/crawler/run block
const newCrawlerBlock = `app.post('/api/crawler/run', async (req, res) => {
    try {
      const { url } = req.body;
      let targetUrl = url || 'https://calendar.iranfair.com/fa';
      
      // Auto-redirect main site to calendar for better parsing
      if (targetUrl === 'https://iranfair.com' || targetUrl === 'https://www.iranfair.com' || targetUrl === 'https://iranfair.com/') {
        targetUrl = 'https://calendar.iranfair.com/fa';
      }
      
      const cheerio = await import('cheerio');
      const fetchRes = await fetch(targetUrl);
      const html = await fetchRes.text();
      const $ = cheerio.load(html);
      
      // Try to get container first, fallback to body
      let textContext = $('.container').text();
      if (!textContext || textContext.trim().length < 100) {
        textContext = $('body').text();
      }
      textContext = textContext.replace(/\\s+/g, ' ').substring(0, 15000);

      const prompt = \`Extract upcoming or current events (نمایشگاه ها) from the following text (Tehran International Exhibition Calendar). Translate the title and description to Persian if needed. Return a JSON object with an 'events' array containing up to 10 events: title, description (extract the organizer/مجری and dates), startTime (convert Persian dates to approximate ISO string for next week/month), address (Tehran International Exhibition Center), lat (35.794), lng (51.401), cost (0). \\n\\nText Context: \${textContext}\`;
      
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              events: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    address: { type: Type.STRING },
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                    cost: { type: Type.NUMBER },
                  }
                }
              }
            }
          }
        }
      });
      
      const data = JSON.parse(aiResponse.text || "{}");
      const events = data.events || [];
      const { createEvent } = await import('./src/db/events.ts');
      
      const newEvents = [];
      for (const eventData of events) {
        if (!eventData.title || eventData.title.includes('خبر') || eventData.title.includes('نشست')) continue; // Skip news items
        const newEvent = await createEvent({
          ...eventData,
          startTime: new Date(eventData.startTime || new Date()),
          source: 'CRAWLER',
          tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
          organizerId: 1
        });
        newEvents.push(newEvent);
      }
      
      if (newEvents.length === 0) {
        res.json({ message: \`خزشگر در صفحه \${targetUrl} نمایشگاهی پیدا نکرد.\`, data: [] });
      } else {
        res.json({ message: \`خزشگر با موفقیت \${newEvents.length} نمایشگاه را استخراج و اضافه کرد.\`, data: newEvents });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Crawler failed' });
    }
  });`;

serverCode = serverCode.replace(/app\.post\('\/api\/crawler\/run', async \(req, res\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Crawler failed' \}\);\n\s*\}\n\s*\}\);/, newCrawlerBlock);

fs.writeFileSync('server.ts', serverCode);
