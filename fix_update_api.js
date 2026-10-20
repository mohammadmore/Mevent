import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const putEventTarget = `const updatedData = req.body;
      if (updatedData.startTime) updatedData.startTime = new Date(updatedData.startTime);
      if (updatedData.endTime) updatedData.endTime = new Date(updatedData.endTime);
      
      await db.update(events).set(updatedData).where(eq(events.id, eventId));`;

const putEventReplacement = `const updatedData = { ...req.body };
      if (updatedData.startTime) updatedData.startTime = new Date(updatedData.startTime);
      if (updatedData.endTime) updatedData.endTime = new Date(updatedData.endTime);
      
      // Flatten location
      if (updatedData.location) {
         updatedData.address = updatedData.location.address;
         updatedData.lat = updatedData.location.lat;
         updatedData.lng = updatedData.location.lng;
         delete updatedData.location;
      }
      
      await db.update(events).set(updatedData).where(eq(events.id, eventId));`;

content = content.replace(putEventTarget, putEventReplacement);
fs.writeFileSync('server.ts', content);
console.log('Update API fixed');
