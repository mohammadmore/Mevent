import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const oldApi = `  app.post('/api/tickets/buy', async (req, res) => {
    try {
      const { userId, eventId, amount } = req.body;
      const { createTicket } = await import('./src/db/tickets.ts');
      
      // Simulate payment gateway delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const paymentId = \`pay_\${Math.random().toString(36).substring(7)}\`;
      
      const ticket = await createTicket({
        userId: parseInt(userId, 10),
        eventId: parseInt(eventId, 10),
        amount: parseInt(amount, 10),
        paymentStatus: 'PAID',
        paymentId
      });
      
      res.json({ message: 'بلیت با موفقیت خریداری شد.', data: ticket });
    } catch (err) {`;
    
const newApi = `  app.post('/api/tickets/buy', async (req, res) => {
    try {
      const { userId, eventId, amount, plusOne } = req.body;
      const { createTicket } = await import('./src/db/tickets.ts');
      
      // Simulate payment gateway delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const paymentId = \`pay_\${Math.random().toString(36).substring(7)}\`;
      
      const ticket1 = await createTicket({
        userId: parseInt(userId, 10),
        eventId: parseInt(eventId, 10),
        amount: plusOne ? Math.floor(parseInt(amount, 10) / 2) : parseInt(amount, 10),
        paymentStatus: 'PAID',
        paymentId: paymentId + '-1'
      });
      
      if (plusOne) {
        await createTicket({
          userId: parseInt(userId, 10),
          eventId: parseInt(eventId, 10),
          amount: Math.floor(parseInt(amount, 10) / 2),
          paymentStatus: 'PAID',
          paymentId: paymentId + '-2'
        });
      }
      
      res.json({ message: plusOne ? 'بلیت‌ها با موفقیت خریداری شدند.' : 'بلیت با موفقیت خریداری شد.', data: ticket1 });
    } catch (err) {`;

content = content.replace(oldApi, newApi);
fs.writeFileSync('server.ts', content);
