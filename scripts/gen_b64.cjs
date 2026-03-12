const fs = require('fs');
const content = fs.readFileSync(require.resolve('./b64input.txt'),'utf8');
console.log(Buffer.from(content,'utf8').toString('base64'));
