import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const target1 = `const { title, description, startTime, location, cost, organizerId, imageUrl, hubId } = req.body;`;
const repl1 = `const { title, description, startTime, endTime, location, cost, organizerId, imageUrl, hubId } = req.body;`;

const target2 = `        startTime: new Date(startTime),
        address: location.address,`;
const repl2 = `        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        address: location.address,`;

content = content.replace(target1, repl1).replace(target2, repl2);
fs.writeFileSync('server.ts', content);
