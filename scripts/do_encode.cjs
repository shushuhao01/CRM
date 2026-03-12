const fs = require('fs');
const raw = fs.readFileSync('D:/kaifa/CRM - 1.8.0/scripts/b64input.txt', 'utf8');
console.log(Buffer.from(raw, 'utf8').toString('base64'));
